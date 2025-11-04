from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import re
import logging
from ..db import get_db
from ..deps import get_current_user, require_admin, require_role
from ..models import (
    Ticket, TicketMessage, User, Role, TicketStatus, MsgDir,
    CategoryLanguage, CategoryVOC, CategoryPriority, EmailTemplate
)
from ..services.mailer import send_mail
from ..utils import get_pagination_params, apply_pagination

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic models
class TicketResponse(BaseModel):
    id: int
    customer_email: str
    customer_name: Optional[str]
    subject: str
    status: TicketStatus
    assigned_to: Optional[int]
    language_id: Optional[int]
    voc_id: Optional[int]
    priority_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    # Related data
    assigned_user: Optional[dict] = None
    language: Optional[dict] = None
    voc: Optional[dict] = None
    priority: Optional[dict] = None

    class Config:
        from_attributes = True

class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    assigned_to: Optional[int] = None
    language_id: Optional[int] = None
    voc_id: Optional[int] = None
    priority_id: Optional[int] = None

class TicketReply(BaseModel):
    text: str
    template_id: Optional[int] = None

class MessageResponse(BaseModel):
    id: int
    direction: MsgDir
    from_email: str
    to_email: str
    subject: str
    body: str
    attachments_json: Optional[str] = None
    sent_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True

class TicketListResponse(BaseModel):
    tickets: List[TicketResponse]
    total: int
    page: int
    page_size: int

# Ticket listing with filters
@router.get("/", response_model=TicketListResponse)
async def list_tickets(
    status: Optional[str] = Query(None),
    priority_id: Optional[int] = Query(None),
    assigned_to: Optional[int] = Query(None),
    unassigned: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: Optional[int] = Query(1),
    page_size: Optional[int] = Query(25),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List tickets with filtering and pagination"""
    query = db.query(Ticket).options(
        joinedload(Ticket.assigned_user),
        joinedload(Ticket.language),
        joinedload(Ticket.voc),
        joinedload(Ticket.priority)
    )
    
    # Apply filters
    if status:
        # Convert string to TicketStatus enum if valid
        try:
            status_enum = TicketStatus(status)
            query = query.filter(Ticket.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status}. Must be one of: {[s.value for s in TicketStatus]}"
            )
    
    if priority_id:
        query = query.filter(Ticket.priority_id == priority_id)
    
    if assigned_to:
        query = query.filter(Ticket.assigned_to == assigned_to)
    
    if unassigned:
        query = query.filter(Ticket.assigned_to.is_(None))
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Ticket.subject.contains(search_filter)) |
            (Ticket.customer_email.contains(search_filter))
        )
    
    # Advisers can only see their assigned tickets (unless admin)
    if current_user.role == Role.adviser:
        query = query.filter(Ticket.assigned_to == current_user.id)
        logger.info(f"Filtering tickets for adviser {current_user.id} (user ID: {current_user.id})")
    else:
        logger.info(f"Admin user {current_user.id} - showing all tickets")
    
    # Order by updated_at desc (must be before pagination)
    query = query.order_by(Ticket.updated_at.desc())
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    page, page_size = get_pagination_params(page, page_size)
    query = apply_pagination(query, page, page_size)
    
    # Execute query
    tickets = query.all()
    logger.info(f"Found {len(tickets)} tickets for user {current_user.id} (role: {current_user.role})")
    
    # Convert SQLAlchemy objects to dictionaries for Pydantic
    ticket_dicts = []
    for ticket in tickets:
        ticket_dict = {
            "id": ticket.id,
            "customer_email": ticket.customer_email,
            "customer_name": ticket.customer_name,
            "subject": ticket.subject,
            "status": ticket.status,
            "assigned_to": ticket.assigned_to,
            "language_id": ticket.language_id,
            "voc_id": ticket.voc_id,
            "priority_id": ticket.priority_id,
            "created_at": ticket.created_at,
            "updated_at": ticket.updated_at,
            "assigned_user": {
                "id": ticket.assigned_user.id,
                "name": ticket.assigned_user.name,
                "email": ticket.assigned_user.email,
                "role": ticket.assigned_user.role.value if ticket.assigned_user.role else None
            } if ticket.assigned_user else None,
            "language": {
                "id": ticket.language.id,
                "name": ticket.language.name
            } if ticket.language else None,
            "voc": {
                "id": ticket.voc.id,
                "name": ticket.voc.name
            } if ticket.voc else None,
            "priority": {
                "id": ticket.priority.id,
                "name": ticket.priority.name,
                "weight": ticket.priority.weight
            } if ticket.priority else None
        }
        ticket_dicts.append(ticket_dict)
    
    return TicketListResponse(
        tickets=ticket_dicts,
        total=total,
        page=page,
        page_size=page_size
    )

# Get ticket detail
@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get ticket detail"""
    ticket = db.query(Ticket).options(
        joinedload(Ticket.assigned_user),
        joinedload(Ticket.language),
        joinedload(Ticket.voc),
        joinedload(Ticket.priority)
    ).filter(Ticket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access permissions
    if (current_user.role == Role.adviser and 
        ticket.assigned_to != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Convert SQLAlchemy object to dictionary for Pydantic
    ticket_dict = {
        "id": ticket.id,
        "customer_email": ticket.customer_email,
        "customer_name": ticket.customer_name,
        "subject": ticket.subject,
        "status": ticket.status,
        "assigned_to": ticket.assigned_to,
        "language_id": ticket.language_id,
        "voc_id": ticket.voc_id,
        "priority_id": ticket.priority_id,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "assigned_user": {
            "id": ticket.assigned_user.id,
            "name": ticket.assigned_user.name,
            "email": ticket.assigned_user.email,
            "role": ticket.assigned_user.role.value if ticket.assigned_user.role else None
        } if ticket.assigned_user else None,
        "language": {
            "id": ticket.language.id,
            "name": ticket.language.name
        } if ticket.language else None,
        "voc": {
            "id": ticket.voc.id,
            "name": ticket.voc.name
        } if ticket.voc else None,
        "priority": {
            "id": ticket.priority.id,
            "name": ticket.priority.name,
            "weight": ticket.priority.weight
        } if ticket.priority else None
    }
    
    return ticket_dict

# Get ticket messages
@router.get("/{ticket_id}/messages", response_model=List[MessageResponse])
async def get_ticket_messages(
    ticket_id: int,
    page: Optional[int] = Query(1),
    page_size: Optional[int] = Query(50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get ticket message thread"""
    # Check ticket access
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if (current_user.role == Role.adviser and 
        ticket.assigned_to != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get messages
    query = db.query(TicketMessage).filter(TicketMessage.ticket_id == ticket_id)
    
    # Order by sent_at (must be before pagination)
    query = query.order_by(TicketMessage.sent_at)
    
    page, page_size = get_pagination_params(page, page_size)
    query = apply_pagination(query, page, page_size)
    
    messages = query.all()
    
    # Convert SQLAlchemy objects to dictionaries for Pydantic
    message_dicts = []
    for message in messages:
        message_dict = {
            "id": message.id,
            "direction": message.direction,
            "from_email": message.from_email,
            "to_email": message.to_email,
            "subject": message.subject,
            "body": message.body,
            "attachments_json": message.attachments_json,
            "sent_at": message.sent_at,
            "created_by": message.created_by
        }
        message_dicts.append(message_dict)
    
    return message_dicts

# Update ticket
@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: int,
    ticket_data: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update ticket (admin or assigned adviser)"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check permissions
    if current_user.role == Role.adviser:
        if ticket.assigned_to != current_user.id:
            raise HTTPException(status_code=403, detail="Can only modify assigned tickets")
        
        # Advisers can only update status and categories, not assignment
        if ticket_data.assigned_to is not None:
            raise HTTPException(status_code=403, detail="Cannot reassign tickets")
    
    # Update fields
    for field, value in ticket_data.dict(exclude_unset=True).items():
        setattr(ticket, field, value)
    
    db.commit()
    db.refresh(ticket)
    
    # Reload with relationships
    ticket = db.query(Ticket).options(
        joinedload(Ticket.assigned_user),
        joinedload(Ticket.language),
        joinedload(Ticket.voc),
        joinedload(Ticket.priority)
    ).filter(Ticket.id == ticket_id).first()
    
    # Convert SQLAlchemy object to dictionary for Pydantic
    ticket_dict = {
        "id": ticket.id,
        "customer_email": ticket.customer_email,
        "customer_name": ticket.customer_name,
        "subject": ticket.subject,
        "status": ticket.status,
        "assigned_to": ticket.assigned_to,
        "language_id": ticket.language_id,
        "voc_id": ticket.voc_id,
        "priority_id": ticket.priority_id,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "assigned_user": {
            "id": ticket.assigned_user.id,
            "name": ticket.assigned_user.name,
            "email": ticket.assigned_user.email,
            "role": ticket.assigned_user.role.value if ticket.assigned_user.role else None
        } if ticket.assigned_user else None,
        "language": {
            "id": ticket.language.id,
            "name": ticket.language.name
        } if ticket.language else None,
        "voc": {
            "id": ticket.voc.id,
            "name": ticket.voc.name
        } if ticket.voc else None,
        "priority": {
            "id": ticket.priority.id,
            "name": ticket.priority.name,
            "weight": ticket.priority.weight
        } if ticket.priority else None
    }
    
    return ticket_dict

# Reply to ticket
@router.post("/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: int,
    reply_data: TicketReply,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reply to ticket (adviser only)"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check permissions
    if current_user.role == Role.adviser:
        if ticket.assigned_to != current_user.id:
            raise HTTPException(status_code=403, detail="Can only reply to assigned tickets")
    
    # Get template if specified and replace variables
    subject = f"[TKT-{ticket_id}] {ticket.subject}"
    body = reply_data.text
    
    if reply_data.template_id:
        template = db.query(EmailTemplate).filter(EmailTemplate.id == reply_data.template_id).first()
        if template:
            # Start with template body
            body = template.body
            
            # Replace all template variables
            body = body.replace("{ticket_id}", str(ticket_id))
            body = body.replace("{TICKET_ID}", str(ticket_id))
            body = body.replace("{customer_name}", ticket.customer_name or ticket.customer_email.split('@')[0])
            body = body.replace("{CUSTOMER_NAME}", ticket.customer_name or ticket.customer_email.split('@')[0])
            body = body.replace("{subject}", ticket.subject)
            body = body.replace("{SUBJECT}", ticket.subject)
            body = body.replace("{adviser_name}", current_user.name)
            body = body.replace("{ADVISER_NAME}", current_user.name)
            body = body.replace("{customer_email}", ticket.customer_email)
            body = body.replace("{CUSTOMER_EMAIL}", ticket.customer_email)
    else:
        # If no template, still replace variables in the text
        body = body.replace("{ticket_id}", str(ticket_id))
        body = body.replace("{TICKET_ID}", str(ticket_id))
        body = body.replace("{customer_name}", ticket.customer_name or ticket.customer_email.split('@')[0])
        body = body.replace("{CUSTOMER_NAME}", ticket.customer_name or ticket.customer_email.split('@')[0])
        body = body.replace("{subject}", ticket.subject)
        body = body.replace("{SUBJECT}", ticket.subject)
        body = body.replace("{adviser_name}", current_user.name)
        body = body.replace("{ADVISER_NAME}", current_user.name)
    
    # Determine in_reply_to from last message
    last_message = db.query(TicketMessage).filter(
        TicketMessage.ticket_id == ticket_id
    ).order_by(TicketMessage.sent_at.desc()).first()
    
    in_reply_to = None
    if last_message and last_message.smtp_message_id:
        in_reply_to = last_message.smtp_message_id
    
    # Send email
    message_id = send_mail(
        to_email=ticket.customer_email,
        subject=subject,
        body=body,
        in_reply_to=in_reply_to
    )
    
    if not message_id:
        raise HTTPException(status_code=500, detail="Failed to send email")
    
    # Create outbound message record
    outbound_message = TicketMessage(
        ticket_id=ticket_id,
        direction=MsgDir.outbound,
        from_email=current_user.email,
        to_email=ticket.customer_email,
        subject=subject,
        body=body,
        smtp_message_id=message_id,
        in_reply_to=in_reply_to,
        created_by=current_user.id
    )
    
    db.add(outbound_message)
    
    # Update ticket timestamp
    ticket.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Reply sent successfully", "message_id": message_id}

# Reassign ticket (admin only)
@router.post("/{ticket_id}/reassign")
async def reassign_ticket(
    ticket_id: int,
    assigned_to: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Reassign ticket to different adviser (admin only)"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Verify assigned user exists and is an adviser
    user = db.query(User).filter(User.id == assigned_to).first()
    if not user or user.role != Role.adviser or not user.is_active:
        raise HTTPException(status_code=400, detail="Invalid adviser ID")
    
    ticket.assigned_to = assigned_to
    ticket.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(ticket)
    
    return {"message": "Ticket reassigned successfully"} 