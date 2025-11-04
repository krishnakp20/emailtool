from sqlalchemy.orm import Session
from ..models import User, AssignmentCursor, Role
from typing import Optional

def next_adviser_id(db: Session) -> Optional[int]:
    """
    Get next adviser ID using round-robin assignment.
    Only considers active advisers.
    """
    # Get all active advisers ordered by ID
    active_advisers = db.query(User).filter(
        User.role == Role.adviser,
        User.is_active == True
    ).order_by(User.id).all()
    
    if not active_advisers:
        return None
    
    # Get current assignment cursor
    cursor = db.query(AssignmentCursor).filter(AssignmentCursor.id == 1).first()
    if not cursor:
        # Initialize cursor if it doesn't exist
        cursor = AssignmentCursor(id=1, last_assigned_user=None)
        db.add(cursor)
        db.commit()
        db.refresh(cursor)
    
    if cursor.last_assigned_user is None:
        # First assignment - start with first adviser
        next_adviser_id = active_advisers[0].id
    else:
        # Find current adviser in the list
        current_index = None
        for i, adviser in enumerate(active_advisers):
            if adviser.id == cursor.last_assigned_user:
                current_index = i
                break
        
        if current_index is None:
            # Current adviser not found (maybe deactivated), start from beginning
            next_adviser_id = active_advisers[0].id
        else:
            # Move to next adviser, wrap around if needed
            next_index = (current_index + 1) % len(active_advisers)
            next_adviser_id = active_advisers[next_index].id
    
    # Update cursor
    cursor.last_assigned_user = next_adviser_id
    db.commit()
    
    return next_adviser_id 