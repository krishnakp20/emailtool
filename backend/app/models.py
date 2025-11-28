from sqlalchemy import Column, Integer, String, Boolean, BigInteger, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import Index
from enum import Enum as PyEnum
from .db import Base

class Role(str, PyEnum):
    admin = "admin"
    adviser = "adviser"

class TicketStatus(str, PyEnum):
    Open = "Open"
    Pending = "Pending"
    Closed = "Closed"

class MsgDir(str, PyEnum):
    inbound = "inbound"
    outbound = "outbound"

class ChannelType(str, PyEnum):
    email = "email"
    instagram = "instagram"
    facebook = "facebook"
    whatsapp = "whatsapp"

class User(Base):
    __tablename__ = "users"
    
    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    emp_code = Column(String(100), unique=True, index=True, nullable=True)
    role = Column(Enum(Role), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CategoryLanguage(Base):
    __tablename__ = "category_language"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

class CategoryVOC(Base):
    __tablename__ = "category_voc"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

class CategoryPriority(Base):
    __tablename__ = "category_priority"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    weight = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(BigInteger, primary_key=True, index=True)
    customer_email = Column(String(255), nullable=False, index=True)
    customer_name = Column(String(255))
    subject = Column(String(500), nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.Open, nullable=False)
    assigned_to = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    language_id = Column(Integer, ForeignKey("category_language.id"), nullable=True)
    voc_id = Column(Integer, ForeignKey("category_voc.id"), nullable=True)
    priority_id = Column(Integer, ForeignKey("category_priority.id"), nullable=True)
    channel = Column(Enum(ChannelType), default=ChannelType.email, nullable=False)
    channel_identifier = Column(String(255), nullable=True)  # Instagram username, post ID, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    assigned_user = relationship("User", foreign_keys=[assigned_to])
    language = relationship("CategoryLanguage")
    voc = relationship("CategoryVOC")
    priority = relationship("CategoryPriority")
    messages = relationship("TicketMessage", back_populates="ticket", order_by="TicketMessage.sent_at")
    notes = relationship("TicketNote", back_populates="ticket", order_by="TicketNote.created_at", cascade="all, delete-orphan")


class TicketMessage(Base):
    __tablename__ = "ticket_messages"
    
    id = Column(BigInteger, primary_key=True, index=True)
    ticket_id = Column(BigInteger, ForeignKey("tickets.id"), nullable=False, index=True)
    direction = Column(Enum(MsgDir), nullable=False)
    from_email = Column(String(255), nullable=False)
    to_email = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    body = Column(Text(length=4294967295), nullable=False)  # LONGTEXT equivalent
    attachments_json = Column(Text(length=4294967295))  # LONGTEXT equivalent
    smtp_message_id = Column(String(255))
    in_reply_to = Column(String(255))
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    ticket = relationship("Ticket", back_populates="messages")
    created_user = relationship("User")

class EmailIngest(Base):
    __tablename__ = "email_ingest"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_message_id = Column(String(255), unique=True, nullable=False)
    from_email = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    received_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum("queued", "processed", "skipped", "error"), default="queued", nullable=False)
    error_text = Column(Text)

class BlockedSender(Base):
    __tablename__ = "blocked_senders"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    reason = Column(String(500))

class AssignmentCursor(Base):
    __tablename__ = "assignment_cursor"
    
    id = Column(Integer, primary_key=True, default=1)
    last_assigned_user = Column(BigInteger, ForeignKey("users.id"), nullable=True)

class EmailTemplate(Base):
    __tablename__ = "email_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    subject = Column(String(500), nullable=False)
    body = Column(Text(length=4294967295), nullable=False)  # LONGTEXT equivalent

class InstagramConfig(Base):
    __tablename__ = "instagram_config"
    
    id = Column(Integer, primary_key=True, default=1)
    is_enabled = Column(Boolean, default=False, nullable=False)
    instagram_business_account_id = Column(String(255), nullable=True)
    page_id = Column(String(255), nullable=True)
    access_token = Column(Text, nullable=True)
    app_id = Column(String(255), nullable=True)
    app_secret = Column(String(255), nullable=True)
    webhook_verify_token = Column(String(255), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class SocialMediaPost(Base):
    __tablename__ = "social_media_posts"
    
    id = Column(BigInteger, primary_key=True, index=True)
    ticket_id = Column(BigInteger, ForeignKey("tickets.id"), nullable=False)
    platform = Column(Enum(ChannelType), nullable=False)
    post_id = Column(String(255), nullable=False, index=True)
    post_url = Column(String(500), nullable=True)
    post_text = Column(Text, nullable=True)
    media_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())



class BulkEmailStatus(int, Enum):
    pending = 0
    sent = 1

class BulkEmail(Base):
    __tablename__ = "bulk_emails"

    id = Column(BigInteger, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    content = Column(Text(length=4294967295), nullable=False)
    status = Column(Integer, default=0, nullable=False)
    response = Column(Text(length=4294967295), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())



class TicketNote(Base):
    __tablename__ = "ticket_notes"

    id = Column(BigInteger, primary_key=True, index=True)
    ticket_id = Column(BigInteger, ForeignKey("tickets.id"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    note = Column(Text(length=4294967295), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ticket = relationship("Ticket", back_populates="notes")
    user = relationship("User")



# Indexes for performance
Index('idx_tickets_status_assigned_priority_updated', 'status', 'assigned_to', 'priority_id', 'updated_at')
Index('idx_ticket_messages_ticket_id', 'ticket_id')
Index('idx_social_posts_platform_post_id', 'platform', 'post_id')