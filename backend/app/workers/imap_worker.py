import time
import logging
import re
from datetime import datetime
from typing import Optional
from imapclient import IMAPClient
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os
import json

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.config import settings
from app.db import SessionLocal
from app.models import (
    EmailIngest, Ticket, TicketMessage, BlockedSender, 
    MsgDir, TicketStatus
)
from app.services.assignment import next_adviser_id
from app.services.mailer import send_mail
from app.services.auto_tagger import AutoTagger
from app.workers.attachment_handler import AttachmentHandler
import re
import unicodedata
from email.utils import parseaddr


def clean_email_text(text: str) -> str:
    """Clean unwanted characters (symbols, control chars, extra spaces) from email text."""
    if not text:
        return ""

    # Normalize unicode (remove odd encodings)
    text = unicodedata.normalize("NFKC", text)

    # Remove non-printable/control characters
    text = re.sub(r"[^\x20-\x7E\n\t]", " ", text)

    # Remove unwanted punctuation/symbols
    # Keeps only letters, digits, ., , ! ?, -, _, ', ", and spaces
    text = re.sub(r"[^A-Za-z0-9.,!?'\-\"_\s\n\t]", " ", text)

    # Collapse multiple spaces/newlines into one space
    text = re.sub(r"\s+", " ", text).strip()

    return text


def extract_email_address(raw_value: str) -> str:
    """Extract only the pure email address from 'Name <email>' or similar formats."""
    if not raw_value:
        return ""

    # Handle list or tuple input
    if isinstance(raw_value, (list, tuple)):
        raw_value = ", ".join(raw_value)

    from email.utils import getaddresses
    addresses = getaddresses([raw_value])
    if addresses:
        # getaddresses returns list of (name, email) tuples
        name, email = addresses[0]
        if email:
            return email.strip().lower()

    # Fallback regex extraction
    match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', raw_value)
    return match.group(0).lower() if match else raw_value.strip().lower()



# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class IMAPWorker:
    def __init__(self):
        self.imap_client = None
        self.db = SessionLocal()
        self.attachment_handler = AttachmentHandler()
        
    def connect_imap(self) -> bool:
        """Connect to IMAP server"""
        try:
            if not settings.IMAP_HOST or not settings.IMAP_USER or not settings.IMAP_PASS:
                logger.warning("IMAP credentials not configured, skipping connection")
                return False
                
            self.imap_client = IMAPClient(settings.IMAP_HOST, use_uid=True, ssl=True)
            self.imap_client.login(settings.IMAP_USER, settings.IMAP_PASS)
            self.imap_client.select_folder('INBOX')
            logger.info("Connected to IMAP server")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to IMAP: {str(e)}")
            return False
    
    def extract_text_from_email(self, msg) -> str:
        """Extract plain text from email, fallback to HTML stripping"""
        try:
            # Try to get plain text first
            if msg.get_body(preferencelist=('plain',)):
                return clean_email_text(msg.get_body(preferencelist=('plain',)).get_content())
            
            # Fallback to HTML
            if msg.get_body(preferencelist=('html',)):
                html_content = msg.get_body(preferencelist=('html',)).get_content()
                soup = BeautifulSoup(html_content, 'html.parser')
                return clean_email_text(soup.get_text(separator=' ', strip=True))
            
            # If no specific body found, try to get any text content
            text_content = ""

            for part in msg.walk():
                if part.get_content_type() == 'text/plain':
                    text_content += part.get_content() + "\n"
                elif part.get_content_type() == 'text/html':
                    html_content = part.get_content()
                    soup = BeautifulSoup(html_content, 'html.parser')
                    text_content += soup.get_text(separator=' ', strip=True) + "\n"
            
            return clean_email_text(text_content.strip()) if text_content else ""
            
        except Exception as e:
            logger.error(f"Failed to extract text from email: {str(e)}")
            return ""
    
    def detect_ticket_id(self, subject: str, body: str) -> Optional[int]:
        """Detect ticket ID from subject or body using regex"""
        # Check subject first
        subject_match = re.search(r'\[TKT-(\d+)\]', subject)
        if subject_match:
            return int(subject_match.group(1))
        
        # Check body
        body_match = re.search(r'\[TKT-(\d+)\]', body)
        if body_match:
            return int(body_match.group(1))
        
        return None
    
    def process_email(self, email_data, message_id: str) -> bool:
        """Process a single email message"""
        try:
            # Get the full email content
            full_email = email_data.get('RFC822')
            if not full_email:
                logger.error(f"No RFC822 data for message {message_id}")
                return False
            
            # Parse the email to extract basic info and attachments
            import email
            from email import policy
            msg = email.message_from_bytes(full_email, policy=policy.default)
            
            # Extract basic email info
            from_email = extract_email_address(msg.get('from', ''))
            logger.info(f"Raw From: {msg.get('from', '')} → Extracted: {from_email}")
            subject = msg.get('subject', '')
            received_date = msg.get('date')
            
            if not from_email or not subject:
                logger.error(f"Missing from_email or subject for message {message_id}")
                return False
            
            # Convert received_date to datetime if it's a string
            if isinstance(received_date, str):
                from email.utils import parsedate_to_datetime
                try:
                    received_date = parsedate_to_datetime(received_date)
                except:
                    received_date = datetime.utcnow()
            elif not received_date:
                received_date = datetime.utcnow()
            
            # Extract text content
            body_text = self.extract_text_from_email(msg)
            
            # Extract attachments
            attachments = self.attachment_handler.extract_attachments(full_email, message_id)
            attachments_json = json.dumps(attachments) if attachments else None
            
            logger.info(f"Processing email from {from_email}, subject: {subject}, attachments: {len(attachments)}")
            
            # Check if already processed
            existing = self.db.query(EmailIngest).filter(
                EmailIngest.provider_message_id == message_id
            ).first()
            
            if existing:
                logger.debug(f"Email {message_id} already processed, skipping")
                return True
            
            # Create ingest record
            ingest = EmailIngest(
                provider_message_id=message_id,
                from_email=from_email,
                subject=subject,
                received_at=received_date,
                status='queued'
            )
            self.db.add(ingest)
            self.db.commit()
            
            # Check if sender is blocked
            blocked = self.db.query(BlockedSender).filter(
                BlockedSender.email == from_email
            ).first()
            
            if blocked:
                logger.info(f"Sender {from_email} is blocked, marking as skipped")
                ingest.status = 'skipped'
                ingest.processed_at = datetime.utcnow()
                self.db.commit()
                return True
            
            # Check if this is a reply to an existing ticket
            ticket_id = self.detect_ticket_id(subject, body_text)
            
            if ticket_id:
                # Try to find existing ticket
                existing_ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
                if existing_ticket:
                    logger.info(f"Found existing ticket {ticket_id} for reply")
                    
                    # Append message to existing ticket
                    message = TicketMessage(
                        ticket_id=existing_ticket.id,
                        direction=MsgDir.inbound,
                        from_email=from_email,
                        to_email=settings.SMTP_FROM,
                        subject=subject,
                        body=body_text,
                        attachments_json=attachments_json,
                        sent_at=received_date
                    )
                    self.db.add(message)
                    
                    # Reopen if closed
                    if existing_ticket.status == TicketStatus.Closed:
                        existing_ticket.status = TicketStatus.Open
                        logger.info(f"Reopened closed ticket {existing_ticket.id}")
                    
                    existing_ticket.updated_at = datetime.utcnow()
                    
                    ingest.status = 'processed'
                    ingest.processed_at = datetime.utcnow()
                    
                    self.db.commit()
                    logger.info(f"Appended message to existing ticket {existing_ticket.id}")
                    return True
                else:
                    logger.warning(f"Ticket {ticket_id} not found, treating as new")
            
            # Check for existing ticket with same subject and customer email (to prevent duplicates)
            # Also check for reply emails (RE: subject)
            existing_ticket = None
            
            # First, try to find by exact subject match
            existing_ticket = self.db.query(Ticket).filter(
                Ticket.subject == subject,
                Ticket.customer_email == from_email
            ).first()
            
            # If not found and subject starts with "RE:", try to find the original ticket
            if not existing_ticket and subject.upper().startswith('RE:'):
                # Remove "RE:" prefix and search for original subject
                original_subject = subject[3:].strip()
                logger.info(f"Looking for original ticket with subject: '{original_subject}'")
                
                # First try exact match
                existing_ticket = self.db.query(Ticket).filter(
                    Ticket.subject == original_subject,
                    Ticket.customer_email == from_email
                ).first()
                
                # If not found, try to find any ticket from the same customer
                if not existing_ticket:
                    logger.info(f"No exact subject match, looking for any ticket from {from_email}")
                    existing_ticket = self.db.query(Ticket).filter(
                        Ticket.customer_email == from_email
                    ).order_by(Ticket.created_at.desc()).first()
                    
                    if existing_ticket:
                        logger.info(f"Found existing ticket {existing_ticket.id} for customer {from_email}")
                
                if existing_ticket:
                    logger.info(f"Found original ticket {existing_ticket.id} for reply email")
            
            if existing_ticket:
                # Append message to existing ticket instead of creating new one
                message = TicketMessage(
                    ticket_id=existing_ticket.id,
                    direction=MsgDir.inbound,
                    from_email=from_email,
                    to_email=settings.SMTP_FROM,
                    subject=subject,
                    body=body_text,
                    attachments_json=attachments_json,
                    sent_at=received_date
                )
                self.db.add(message)
                
                # Reopen if closed
                if existing_ticket.status == TicketStatus.Closed:
                    existing_ticket.status = TicketStatus.Open
                    logger.info(f"Reopened closed ticket {existing_ticket.id}")
                
                existing_ticket.updated_at = datetime.utcnow()
                
                ingest.status = 'processed'
                ingest.processed_at = datetime.utcnow()
                
                self.db.commit()
                logger.info(f"Appended message to existing ticket {existing_ticket.id} (same subject and customer)")
                return True

            # Extract text content
            body_text = self.extract_text_from_email(msg)

            # Auto-tag categories
            tagger = AutoTagger(self.db)
            language, voc, priority = tagger.auto_tag(subject, body_text)
            
            # Create new ticket
            assigned_to = next_adviser_id(self.db)
            if not assigned_to:
                logger.error("No active advisers available for assignment")
                ingest.status = 'error'
                ingest.error_text = "No active advisers available"
                self.db.commit()
                return False
            
            # Create ticket
            ticket = Ticket(
                customer_email=from_email,
                customer_name=from_email.split('@')[0],  # Simple name extraction
                subject=subject,
                status=TicketStatus.Open,
                assigned_to=assigned_to,
                language_id=language.id if language else None,
                voc_id=voc.id if voc else None,
                priority_id=priority.id if priority else None
            )
            self.db.add(ticket)
            self.db.flush()  # Get the ID
            
            # Create inbound message
            message = TicketMessage(
                ticket_id=ticket.id,
                direction=MsgDir.inbound,
                from_email=from_email,
                to_email=settings.SMTP_FROM,
                subject=subject,
                body=body_text,
                attachments_json=attachments_json,
                sent_at=received_date
            )
            self.db.add(message)
            
            # Send auto-ack
            auto_ack_subject = f"[TKT-{ticket.id}] We've received your request"
            auto_ack_body = f"""Thank you for contacting us. We have received your request and assigned it ticket number TKT-{ticket.id}.

Our team will review your inquiry and respond shortly.

Best regards,
Support Team"""
            
            ack_message_id = send_mail(
                to_email=from_email,
                subject=auto_ack_subject,
                body=auto_ack_body
            )
            
            if ack_message_id:
                # Store auto-ack message
                ack_message = TicketMessage(
                    ticket_id=ticket.id,
                    direction=MsgDir.outbound,
                    from_email=settings.SMTP_FROM,
                    to_email=from_email,
                    subject=auto_ack_subject,
                    body=auto_ack_body,
                    smtp_message_id=ack_message_id,
                    sent_at=datetime.utcnow()
                )
                self.db.add(ack_message)
                logger.info(f"Auto-ack sent for ticket {ticket.id}")
            else:
                logger.error(f"Failed to send auto-ack for ticket {ticket.id}")
            
            # Mark as processed
            ingest.status = 'processed'
            ingest.processed_at = datetime.utcnow()
            
            self.db.commit()
            logger.info(f"Created new ticket {ticket.id} assigned to {assigned_to} with {len(attachments) if attachments else 0} attachments")
            return True
            
        except Exception as e:
            logger.error(f"Error processing email {message_id}: {str(e)}")
            # Mark as error
            if 'ingest' in locals():
                ingest.status = 'error'
                ingest.error_text = str(e)
                self.db.commit()
            return False
    
    def run(self):
        """Main worker loop"""
        logger.info("Starting IMAP worker...")
        
        while True:
            try:
                if not self.connect_imap():
                    logger.info("IMAP not available, sleeping for 15 seconds...")
                    time.sleep(15)
                    continue
                
                # Search for recent messages (last 24 hours) instead of just unseen
                from datetime import datetime, timedelta
                yesterday = datetime.now() - timedelta(days=1)
                date_str = yesterday.strftime("%d-%b-%Y")
                messages = self.imap_client.search(f'SINCE {date_str}')
                
                if messages:
                    logger.info(f"Found {len(messages)} messages since {date_str}")
                    
                    for msg_id in messages:
                        try:
                            # Fetch full email data including attachments
                            email_data = self.imap_client.fetch([msg_id], ['RFC822'])
                            
                            if email_data and msg_id in email_data:
                                # Get the full email content
                                full_email = email_data[msg_id][b'RFC822']
                                
                                # Process the email with full data
                                self.process_email({'RFC822': full_email}, str(msg_id))
                            else:
                                logger.warning(f"No valid email data for message {msg_id}")
                                
                        except Exception as e:
                            logger.error(f"Error processing message {msg_id}: {str(e)}")
                            continue
                
                # Sleep for 15 seconds
                time.sleep(15)
                
            except Exception as e:
                logger.error(f"Worker error: {str(e)}")
                time.sleep(15)
                
            finally:
                if self.imap_client:
                    try:
                        self.imap_client.logout()
                    except:
                        pass
                    self.imap_client = None

if __name__ == "__main__":
    worker = IMAPWorker()
    worker.run() 