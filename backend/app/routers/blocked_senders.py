from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..db import get_db
from ..deps import require_admin
from ..models import BlockedSender

router = APIRouter()

class BlockedSenderCreate(BaseModel):
    email: str
    reason: Optional[str] = None

class BlockedSenderUpdate(BaseModel):
    email: Optional[str] = None
    reason: Optional[str] = None

class BlockedSenderResponse(BaseModel):
    id: int
    email: str
    reason: Optional[str]

    class Config:
        from_attributes = True

@router.post("/", response_model=BlockedSenderResponse)
async def create_blocked_sender(
    blocked_data: BlockedSenderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Add email to blocked list (admin only)"""
    # Check if already blocked
    existing = db.query(BlockedSender).filter(BlockedSender.email == blocked_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already blocked")
    
    blocked = BlockedSender(
        email=blocked_data.email.lower(),  # Store in lowercase for consistency
        reason=blocked_data.reason
    )
    
    db.add(blocked)
    db.commit()
    db.refresh(blocked)
    
    return blocked

@router.get("/", response_model=List[BlockedSenderResponse])
async def list_blocked_senders(
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """List all blocked senders (admin only)"""
    blocked = db.query(BlockedSender).order_by(BlockedSender.email).all()
    return blocked

@router.delete("/{blocked_id}")
async def unblock_sender(
    blocked_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Remove email from blocked list (admin only)"""
    blocked = db.query(BlockedSender).filter(BlockedSender.id == blocked_id).first()
    if not blocked:
        raise HTTPException(status_code=404, detail="Blocked sender not found")
    
    db.delete(blocked)
    db.commit()
    
    return {"message": f"Email {blocked.email} has been unblocked"}



