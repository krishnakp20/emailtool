#!/usr/bin/env python3
"""
Simple test to check if tickets are being created
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import get_db
from app.models import Ticket, TicketMessage, User, MsgDir, TicketStatus
from sqlalchemy.orm import Session

def test_ticket_creation():
    """Test ticket creation logic"""
    db = next(get_db())
    
    try:
        # Get the first user (assuming there's at least one)
        user = db.query(User).first()
        if not user:
            print("No users found in database")
            return
        
        print(f"Testing with user: {user.name} (ID: {user.id}, Role: {user.role})")
        
        # Create a test ticket
        test_ticket = Ticket(
            customer_email="test@example.com",
            subject="Test Sent Email",
            status=TicketStatus.Open,
            assigned_to=user.id
        )
        db.add(test_ticket)
        db.flush()
        
        print(f"Created test ticket #{test_ticket.id}")
        
        # Create a test message
        test_message = TicketMessage(
            ticket_id=test_ticket.id,
            direction=MsgDir.outbound,
            from_email=user.email,
            to_email="test@example.com",
            subject="Test Sent Email",
            body="This is a test email",
            smtp_message_id="test-123",
            created_by=user.id
        )
        db.add(test_message)
        db.commit()
        
        print(f"Created test message #{test_message.id}")
        
        # Now check if we can find the ticket
        found_ticket = db.query(Ticket).filter(Ticket.id == test_ticket.id).first()
        if found_ticket:
            print(f"✓ Ticket found: #{found_ticket.id} - {found_ticket.subject}")
            print(f"  Assigned to: {found_ticket.assigned_to}")
            print(f"  Status: {found_ticket.status}")
        else:
            print("✗ Ticket not found!")
        
        # Check if we can find it by user assignment
        user_tickets = db.query(Ticket).filter(Ticket.assigned_to == user.id).all()
        print(f"Found {len(user_tickets)} tickets assigned to user {user.id}")
        for t in user_tickets:
            print(f"  Ticket #{t.id}: {t.subject}")
        
        # Clean up
        db.delete(test_message)
        db.delete(test_ticket)
        db.commit()
        print("Test tickets cleaned up")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_ticket_creation()




