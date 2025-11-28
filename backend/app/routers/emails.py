import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session
from typing import Optional, List
from ..db import get_db
from ..models import User
from ..deps import get_current_user
from ..services.mailer import send_mail
from pydantic import BaseModel, EmailStr
import logging
from ..config import settings

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
    to: str = Form(...),
    cc: Optional[str] = Form(None),
    bcc: Optional[str] = Form(None),
    subject: str = Form(...),
    body: str = Form(...),
    template_id: Optional[int] = Form(None),
    attachments: List[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send an email to specified recipients with CC and BCC support.
    """
    try:
        # Parse email addresses
        to_emails = [email.strip() for email in to.split(',') if email.strip()]
        cc_emails = [email.strip() for email in cc.split(',')] if cc else []
        bcc_emails = [email.strip() for email in bcc.split(',')] if bcc else []
        
        # Validate that we have at least one recipient
        if not to_emails:
            raise HTTPException(status_code=400, detail="At least one recipient is required")
        
        # For now, send to the first recipient (we can enhance this later for multiple recipients)
        primary_recipient = to_emails[0]

        prepared_files = []

        if attachments:
            for file in attachments:
                file_bytes = await file.read()
                await file.seek(0)
                prepared_files.append({
                    "file": file,
                    "bytes": file_bytes
                })
        
        # Send the email
        message_id = send_mail(
            to_email=primary_recipient,
            subject=subject,
            body=body,
            cc_emails=cc_emails if cc_emails else None,
            bcc_emails=bcc_emails if bcc_emails else None,
            attachments=attachments
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
            subject=subject,
            status=TicketStatus.Open,
            assigned_to=current_user.id
        )
        db.add(ticket)
        db.flush()  # Get the ticket ID
        logger.info(f"Created new ticket #{ticket.id} for sent email")

        from ..workers.attachment_handler import AttachmentHandler
        handler = AttachmentHandler(settings.ATTACHMENTS_ROOT)

        saved_attachments = []

        if prepared_files:
            msg_dir = f"msg_{ticket.id}"
            message_dir = handler.attachment_dir / msg_dir
            message_dir.mkdir(parents=True, exist_ok=True)

            for item in prepared_files:
                file = item["file"]
                raw = item["bytes"]

                safe_name = handler._sanitize_filename(file.filename)
                file_path = message_dir / safe_name

                with open(file_path, "wb") as f:
                    f.write(raw)

                saved_attachments.append({
                    "filename": file.filename,
                    "mime_type": file.content_type,
                    "file_path": f"{msg_dir}/{safe_name}",
                    "size": file_path.stat().st_size
                })
        
        # Create message record
        message = TicketMessage(
            ticket_id=ticket.id,
            direction=MsgDir.outbound,
            from_email=current_user.email,
            to_email=primary_recipient,
            subject=subject,
            body=body,
            smtp_message_id=message_id,
            created_by=current_user.id,
            attachments_json=json.dumps(saved_attachments)
        )
        
        db.add(message)
        db.commit()
        
        logger.info(f"Email sent by user {current_user.id} to {primary_recipient} and saved to database")
        
        return {
            "message": "Email sent successfully",
            "message_id": message_id,
            "ticket_id": ticket.id,
            "attachments": saved_attachments,
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
