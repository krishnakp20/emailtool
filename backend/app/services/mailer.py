import smtplib
from email.mime.application import MIMEApplication
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr, make_msgid

from fastapi import File, UploadFile

from ..config import settings
from typing import Optional, List
import logging
from email.mime.base import MIMEBase
from email import encoders


logger = logging.getLogger(__name__)


MAX_ATTACHMENT_SIZE_MB = 25
MAX_ATTACHMENT_SIZE = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024


def send_mail(
    to_email: str, 
    subject: str, 
    body: str, 
    cc_emails: Optional[list] = None,
    bcc_emails: Optional[list] = None,
    attachments: Optional[List[UploadFile]] = None,
    in_reply_to: Optional[str] = None
) -> Optional[str]:
    """
    Send email via SMTP and return Message-ID.
    Supports threading with In-Reply-To and References headers.
    """
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = formataddr(("Support", settings.SMTP_FROM))
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add CC if provided
        if cc_emails:
            msg['Cc'] = ', '.join(cc_emails)
        
        # Generate Message-ID
        message_id = make_msgid()
        msg['Message-ID'] = message_id
        
        # Set threading headers if replying
        if in_reply_to:
            msg['In-Reply-To'] = in_reply_to
            msg['References'] = in_reply_to
        
        # Add body
        msg.attach(MIMEText(body, 'plain'))

        # Attach files
        if attachments and isinstance(attachments, list):
            for file in attachments:

                file_data = file.file.read()
                file.file.seek(0)

                # Validate size under 25MB
                if len(file_data) > MAX_ATTACHMENT_SIZE:
                    raise Exception(f"Attachment {file.filename} exceeds 25MB limit")

                # Detect file type
                maintype, subtype = file.content_type.split("/", 1)

                part = MIMEBase(maintype, subtype)
                part.set_payload(file_data)
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f'attachment; filename="{file.filename}"'
                )
                msg.attach(part)
        
        # Connect to SMTP server
        if settings.SMTP_USER:
            # Use STARTTLS if credentials provided
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
        else:
            # No authentication (for Mailhog)
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        
        # Prepare all recipients (To + CC + BCC)
        all_recipients = [to_email]
        if cc_emails:
            all_recipients.extend(cc_emails)
        if bcc_emails:
            all_recipients.extend(bcc_emails)
        
        # Send email
        text = msg.as_string()
        server.sendmail(settings.SMTP_FROM, all_recipients, text)
        server.quit()
        
        logger.info(f"Email sent successfully to {to_email} (CC: {cc_emails}, BCC: {bcc_emails})")
        return message_id.strip('<>')  # Remove angle brackets
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return None 