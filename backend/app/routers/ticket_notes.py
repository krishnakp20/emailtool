from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List
from datetime import datetime

from ..db import get_db
from ..deps import get_current_user
from ..models import Ticket, TicketNote, User, Role


router = APIRouter()


# ---------- SCHEMAS ----------
class TicketNoteCreate(BaseModel):
    note: str


class TicketNoteResponse(BaseModel):
    id: int
    ticket_id: int
    user_id: int | None
    note: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- CREATE NOTE ----------
@router.post("/{ticket_id}", response_model=TicketNoteResponse)
async def add_ticket_note(
    ticket_id: int,
    payload: TicketNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add internal note to ticket (admin & assigned adviser only)"""

    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Adviser can only add note to tickets assigned to them
    if current_user.role == Role.adviser and ticket.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to add notes to unassigned ticket")

    note = TicketNote(
        ticket_id=ticket_id,
        user_id=current_user.id,
        note=payload.note
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return note



# ---------- READ NOTES ----------
@router.get("/{ticket_id}", response_model=List[TicketNoteResponse])
async def get_ticket_notes(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List notes of a ticket (admin sees all, adviser sees only assigned)"""

    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user.role == Role.adviser and ticket.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    notes = db.query(TicketNote).filter(
        TicketNote.ticket_id == ticket_id
    ).order_by(TicketNote.created_at.desc()).all()

    return notes
