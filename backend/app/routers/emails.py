from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from ..db import get_db
from ..models import User
from ..deps import get_current_user
from ..services.mailer import send_mail
from pydantic import BaseModel, EmailStr
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class SendEmailRequest(BaseModel):
    to: str
    cc: Optional[str] = None
    bcc: Optional[str] = None
    subject: str
    body: str
    template_id: Optional[int] = None

@router.get("/debug/sent-emails")
async def debug_sent_emails(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Debug endpoint to check sent emails"""
    from ..models import Ticket, TicketMessage, MsgDir
    
    # Get all tickets
    tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).limit(10).all()
    
    # Get all sent messages
    sent_messages = db.query(TicketMessage).filter(
        TicketMessage.direction == MsgDir.outbound
    ).order_by(TicketMessage.sent_at.desc()).limit(10).all()
    
    # Get user info
    users = db.query(User).all()
    
    return {
        "tickets": [
            {
                "id": t.id,
                "subject": t.subject,
                "customer_email": t.customer_email,
                "assigned_to": t.assigned_to,
                "status": t.status.value,
                "created_at": t.created_at.isoformat()
            } for t in tickets
        ],
        "sent_messages": [
            {
                "id": m.id,
                "subject": m.subject,
                "from_email": m.from_email,
                "to_email": m.to_email,
                "ticket_id": m.ticket_id,
                "direction": m.direction.value,
                "sent_at": m.sent_at.isoformat()
            } for m in sent_messages
        ],
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role.value
            } for u in users
        ],
        "current_user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role.value
        }
    }

@router.post("/send")
async def send_email(
    request: SendEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send an email to specified recipients with CC and BCC support.
    """
    try:
        # Parse email addresses
        to_emails = [email.strip() for email in request.to.split(',') if email.strip()]
        cc_emails = [email.strip() for email in request.cc.split(',')] if request.cc else []
        bcc_emails = [email.strip() for email in request.bcc.split(',')] if request.bcc else []
        
        # Validate that we have at least one recipient
        if not to_emails:
            raise HTTPException(status_code=400, detail="At least one recipient is required")
        
        # For now, send to the first recipient (we can enhance this later for multiple recipients)
        primary_recipient = to_emails[0]
        
        # Send the email
        message_id = send_mail(
            to_email=primary_recipient,
            subject=request.subject,
            body=request.body,
            cc_emails=cc_emails if cc_emails else None,
            bcc_emails=bcc_emails if bcc_emails else None
        )
        
        if not message_id:
            raise HTTPException(status_code=500, detail="Failed to send email")
        
        # Save the sent email to database
        from ..models import TicketMessage, MsgDir
        
        # Create a new ticket for this standalone email
        from ..models import Ticket, TicketStatus
        
        # Always create a new ticket for sent emails (don't reuse existing ones)
        ticket = Ticket(
            customer_email=primary_recipient,
            subject=request.subject,
            status=TicketStatus.Open,
            assigned_to=current_user.id
        )
        db.add(ticket)
        db.flush()  # Get the ticket ID
        logger.info(f"Created new ticket #{ticket.id} for sent email")
        
        # Create message record
        message = TicketMessage(
            ticket_id=ticket.id,
            direction=MsgDir.outbound,
            from_email=current_user.email,
            to_email=primary_recipient,
            subject=request.subject,
            body=request.body,
            smtp_message_id=message_id,
            created_by=current_user.id
        )
        
        db.add(message)
        db.commit()
        
        logger.info(f"Email sent by user {current_user.id} to {primary_recipient} and saved to database")
        
        return {
            "message": "Email sent successfully",
            "message_id": message_id,
            "ticket_id": ticket.id,
            "recipients": {
                "to": to_emails,
                "cc": cc_emails,
                "bcc": bcc_emails
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
