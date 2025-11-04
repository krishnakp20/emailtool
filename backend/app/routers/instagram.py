from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

from ..db import get_db
from ..deps import require_admin, get_current_user
from ..models import InstagramConfig, Ticket, TicketMessage, ChannelType, MsgDir, TicketStatus, User
from ..services.instagram import InstagramService
from ..services.assignment import next_adviser_id

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic models
class InstagramConfigUpdate(BaseModel):
    is_enabled: bool
    instagram_business_account_id: Optional[str] = None
    page_id: Optional[str] = None
    access_token: Optional[str] = None
    app_id: Optional[str] = None
    app_secret: Optional[str] = None
    webhook_verify_token: Optional[str] = None

class InstagramConfigResponse(BaseModel):
    id: int
    is_enabled: bool
    instagram_business_account_id: Optional[str]
    page_id: Optional[str]
    has_access_token: bool
    app_id: Optional[str]
    has_app_secret: bool
    webhook_verify_token: Optional[str]
    last_synced_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class InstagramMessageRequest(BaseModel):
    ticket_id: int
    message: str

# Get Instagram configuration
@router.get("/config", response_model=InstagramConfigResponse)
async def get_instagram_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get Instagram configuration"""
    config = db.query(InstagramConfig).filter(InstagramConfig.id == 1).first()
    
    if not config:
        # Create default config if it doesn't exist
        config = InstagramConfig(
            id=1,
            is_enabled=False
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    
    return InstagramConfigResponse(
        id=config.id,
        is_enabled=config.is_enabled,
        instagram_business_account_id=config.instagram_business_account_id,
        page_id=config.page_id,
        has_access_token=bool(config.access_token),
        app_id=config.app_id,
        has_app_secret=bool(config.app_secret),
        webhook_verify_token=config.webhook_verify_token,
        last_synced_at=config.last_synced_at
    )

# Update Instagram configuration
@router.put("/config", response_model=InstagramConfigResponse)
async def update_instagram_config(
    config_data: InstagramConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update Instagram configuration"""
    config = db.query(InstagramConfig).filter(InstagramConfig.id == 1).first()
    
    if not config:
        config = InstagramConfig(id=1)
        db.add(config)
    
    # Update fields
    config.is_enabled = config_data.is_enabled
    if config_data.instagram_business_account_id is not None:
        config.instagram_business_account_id = config_data.instagram_business_account_id
    if config_data.page_id is not None:
        config.page_id = config_data.page_id
    if config_data.access_token is not None:
        config.access_token = config_data.access_token
    if config_data.app_id is not None:
        config.app_id = config_data.app_id
    if config_data.app_secret is not None:
        config.app_secret = config_data.app_secret
    if config_data.webhook_verify_token is not None:
        config.webhook_verify_token = config_data.webhook_verify_token
    
    db.commit()
    db.refresh(config)
    
    return InstagramConfigResponse(
        id=config.id,
        is_enabled=config.is_enabled,
        instagram_business_account_id=config.instagram_business_account_id,
        page_id=config.page_id,
        has_access_token=bool(config.access_token),
        app_id=config.app_id,
        has_app_secret=bool(config.app_secret),
        webhook_verify_token=config.webhook_verify_token,
        last_synced_at=config.last_synced_at
    )

# Webhook verification and message handling
@router.get("/webhook")
async def verify_webhook(
    mode: str = Query(alias="hub.mode"),
    token: str = Query(alias="hub.verify_token"),
    challenge: str = Query(alias="hub.challenge"),
    db: Session = Depends(get_db)
):
    """Verify webhook subscription"""
    config = db.query(InstagramConfig).filter(InstagramConfig.id == 1).first()
    
    if not config or not config.webhook_verify_token:
        raise HTTPException(status_code=400, detail="Instagram not configured")
    
    if InstagramService.verify_webhook_token(mode, token, config.webhook_verify_token):
        logger.info("Webhook verified successfully")
        return int(challenge)
    
    raise HTTPException(status_code=403, detail="Verification failed")

@router.post("/webhook")
async def handle_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Instagram webhook events"""
    try:
        data = await request.json()
        logger.info(f"Received Instagram webhook: {data}")
        
        config = db.query(InstagramConfig).filter(InstagramConfig.id == 1).first()
        if not config or not config.is_enabled:
            return {"status": "ok", "message": "Instagram integration disabled"}
        
        # Process webhook data
        for entry in data.get("entry", []):
            for messaging in entry.get("messaging", []):
                # Handle incoming message
                if "message" in messaging:
                    process_incoming_message(db, config, messaging)
                
                # Handle comment on post
                if "changes" in entry:
                    for change in entry.get("changes", []):
                        if change.get("field") == "comments":
                            process_comment(db, config, change)
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        return {"status": "error", "message": str(e)}

def process_incoming_message(db: Session, config: InstagramConfig, messaging: dict):
    """Process incoming Instagram message and create ticket"""
    try:
        sender_id = messaging.get("sender", {}).get("id")
        message_text = messaging.get("message", {}).get("text", "")
        
        if not sender_id or not message_text:
            return
        
        # Get or create user info
        service = InstagramService(config.access_token, config.instagram_business_account_id)
        user_info = service.get_user_info(sender_id)
        
        customer_name = user_info.get("username", f"Instagram User {sender_id}") if user_info else f"Instagram User {sender_id}"
        customer_email = f"instagram_{sender_id}@instagram.com"  # Placeholder email
        
        # Check if ticket already exists for this user
        existing_ticket = db.query(Ticket).filter(
            Ticket.channel == ChannelType.instagram,
            Ticket.channel_identifier == sender_id,
            Ticket.status.in_([TicketStatus.Open, TicketStatus.Pending])
        ).first()
        
        if existing_ticket:
            # Add message to existing ticket
            ticket = existing_ticket
        else:
            # Create new ticket
            assigned_user_id = next_adviser_id(db)
            
            ticket = Ticket(
                customer_email=customer_email,
                customer_name=customer_name,
                subject=f"Instagram DM from {customer_name}",
                status=TicketStatus.Open,
                assigned_to=assigned_user_id,
                channel=ChannelType.instagram,
                channel_identifier=sender_id
            )
            db.add(ticket)
            db.flush()
        
        # Create message
        message = TicketMessage(
            ticket_id=ticket.id,
            direction=MsgDir.inbound,
            from_email=customer_email,
            to_email="support@company.com",  # Your support email
            subject=ticket.subject,
            body=message_text,
            smtp_message_id=messaging.get("message", {}).get("mid")
        )
        db.add(message)
        
        # Update ticket timestamp
        ticket.updated_at = datetime.utcnow()
        
        db.commit()
        logger.info(f"Created/updated ticket {ticket.id} from Instagram DM")
        
    except Exception as e:
        logger.error(f"Error processing incoming message: {e}")
        db.rollback()

def process_comment(db: Session, config: InstagramConfig, change: dict):
    """Process Instagram comment and create ticket"""
    try:
        comment_data = change.get("value", {})
        comment_id = comment_data.get("id")
        comment_text = comment_data.get("text", "")
        from_username = comment_data.get("from", {}).get("username", "Unknown")
        from_id = comment_data.get("from", {}).get("id")
        media_id = comment_data.get("media", {}).get("id")
        
        if not comment_id or not comment_text:
            return
        
        customer_name = from_username
        customer_email = f"instagram_{from_id}@instagram.com"
        
        # Create ticket for comment
        assigned_user_id = next_adviser_id(db)
        
        ticket = Ticket(
            customer_email=customer_email,
            customer_name=customer_name,
            subject=f"Instagram Comment from @{customer_name}",
            status=TicketStatus.Open,
            assigned_to=assigned_user_id,
            channel=ChannelType.instagram,
            channel_identifier=comment_id
        )
        db.add(ticket)
        db.flush()
        
        # Create message
        message = TicketMessage(
            ticket_id=ticket.id,
            direction=MsgDir.inbound,
            from_email=customer_email,
            to_email="support@company.com",
            subject=ticket.subject,
            body=comment_text,
            smtp_message_id=comment_id
        )
        db.add(message)
        
        db.commit()
        logger.info(f"Created ticket {ticket.id} from Instagram comment")
        
    except Exception as e:
        logger.error(f"Error processing comment: {e}")
        db.rollback()

# Send Instagram message/reply
@router.post("/send-message")
async def send_instagram_message(
    message_data: InstagramMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message via Instagram"""
    config = db.query(InstagramConfig).filter(InstagramConfig.id == 1).first()
    
    if not config or not config.is_enabled:
        raise HTTPException(status_code=400, detail="Instagram integration not enabled")
    
    ticket = db.query(Ticket).filter(Ticket.id == message_data.ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket.channel != ChannelType.instagram:
        raise HTTPException(status_code=400, detail="This ticket is not from Instagram")
    
    # Send message via Instagram
    service = InstagramService(config.access_token, config.instagram_business_account_id)
    recipient_id = ticket.channel_identifier
    
    message_id = service.send_message(recipient_id, message_data.message)
    
    if not message_id:
        raise HTTPException(status_code=500, detail="Failed to send Instagram message")
    
    # Create outbound message record
    outbound_message = TicketMessage(
        ticket_id=ticket.id,
        direction=MsgDir.outbound,
        from_email=current_user.email,
        to_email=ticket.customer_email,
        subject=ticket.subject,
        body=message_data.message,
        smtp_message_id=message_id,
        created_by=current_user.id
    )
    db.add(outbound_message)
    
    # Update ticket timestamp
    ticket.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Instagram message sent successfully", "message_id": message_id}

# Sync Instagram messages manually
@router.post("/sync")
async def sync_instagram_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Manually sync Instagram messages"""
    config = db.query(InstagramConfig).filter(InstagramConfig.id == 1).first()
    
    if not config or not config.is_enabled:
        raise HTTPException(status_code=400, detail="Instagram integration not enabled")
    
    try:
        service = InstagramService(config.access_token, config.instagram_business_account_id)
        conversations = service.get_conversations()
        
        synced_count = 0
        for conversation in conversations:
            # Process each conversation
            messages = service.get_messages(conversation["id"])
            # TODO: Process and store messages
            synced_count += len(messages)
        
        # Update last synced timestamp
        config.last_synced_at = datetime.utcnow()
        db.commit()
        
        return {
            "message": "Instagram messages synced successfully",
            "conversations": len(conversations),
            "messages": synced_count
        }
        
    except Exception as e:
        logger.error(f"Error syncing Instagram messages: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


