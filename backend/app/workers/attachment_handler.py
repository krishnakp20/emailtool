import os
import logging
import email
from email import policy
from email.parser import BytesParser
from typing import List, Dict, Optional
import json
from pathlib import Path

logger = logging.getLogger(__name__)

class AttachmentHandler:
    def __init__(self, attachment_dir: str = "attachments"):
        self.attachment_dir = Path(attachment_dir)
        self.attachment_dir.mkdir(exist_ok=True)
    
    def extract_attachments(self, email_data: bytes, message_id: str) -> List[Dict]:
        """
        Extract attachments from email data and save them to filesystem
        
        Args:
            email_data: Raw email data bytes
            message_id: Unique message identifier
            
        Returns:
            List of attachment metadata dictionaries
        """
        attachments = []
        
        try:
            # Parse email using email library
            msg = BytesParser(policy=policy.default).parsebytes(email_data)
            
            # Create message-specific directory
            message_dir = self.attachment_dir / f"msg_{message_id}"
            message_dir.mkdir(exist_ok=True)
            
            # Process multipart messages
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_disposition() == 'attachment':
                        attachment_info = self._save_attachment(part, message_dir, message_id)
                        if attachment_info:
                            attachments.append(attachment_info)
            else:
                # Single part message - check if it's an attachment
                if msg.get_content_disposition() == 'attachment':
                    attachment_info = self._save_attachment(msg, message_dir, message_id)
                    if attachment_info:
                        attachments.append(attachment_info)
            
            logger.info(f"Extracted {len(attachments)} attachments from message {message_id}")
            return attachments
            
        except Exception as e:
            logger.error(f"Failed to extract attachments from message {message_id}: {str(e)}")
            return []
    
    def _save_attachment(self, part, message_dir: Path, message_id: str) -> Optional[Dict]:
        """
        Save a single attachment to filesystem
        
        Args:
            part: Email part containing attachment
            message_dir: Directory to save attachment in
            message_id: Message identifier
            
        Returns:
            Attachment metadata dictionary or None if failed
        """
        try:
            # Get filename
            filename = part.get_filename()
            if not filename:
                # Generate filename if none provided
                content_type = part.get_content_type()
                extension = self._get_extension_from_mime(content_type)
                filename = f"attachment_{len(list(message_dir.glob('*')))}.{extension}"
            
            # Clean filename (remove special characters)
            safe_filename = self._sanitize_filename(filename)
            
            # Create file path
            file_path = message_dir / safe_filename
            
            # Save attachment
            with open(file_path, 'wb') as f:
                f.write(part.get_payload(decode=True))
            
            # Get file size
            file_size = os.path.getsize(file_path)
            
            # Create relative path for database storage
            relative_path = f"msg_{message_id}/{safe_filename}"
            
            attachment_info = {
                "filename": filename,
                "mime_type": part.get_content_type(),
                "file_path": relative_path,
                "size": file_size
            }
            
            logger.info(f"Saved attachment: {filename} ({file_size} bytes) to {relative_path}")
            return attachment_info
            
        except Exception as e:
            logger.error(f"Failed to save attachment {filename}: {str(e)}")
            return None
    
    def _get_extension_from_mime(self, mime_type: str) -> str:
        """Get file extension from MIME type"""
        mime_extensions = {
            'text/plain': 'txt',
            'text/html': 'html',
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/bmp': 'bmp',
            'application/pdf': 'pdf',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'application/vnd.ms-excel': 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
            'application/zip': 'zip',
            'application/x-rar-compressed': 'rar',
            'audio/mpeg': 'mp3',
            'audio/wav': 'wav',
            'video/mp4': 'mp4',
            'video/avi': 'avi',
            'video/mpeg': 'mpg'
        }
        return mime_extensions.get(mime_type, 'bin')
    
    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to remove special characters"""
        import re
        # Remove or replace problematic characters
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Limit length
        if len(safe_name) > 200:
            name, ext = os.path.splitext(safe_name)
            safe_name = name[:200-len(ext)] + ext
        return safe_name
    
    def cleanup_old_attachments(self, max_age_days: int = 30):
        """Clean up old attachment files"""
        try:
            from datetime import datetime, timedelta
            cutoff_date = datetime.now() - timedelta(days=max_age_days)
            
            for message_dir in self.attachment_dir.iterdir():
                if message_dir.is_dir() and message_dir.name.startswith('msg_'):
                    # Check if directory is old enough
                    dir_time = datetime.fromtimestamp(message_dir.stat().st_mtime)
                    if dir_time < cutoff_date:
                        import shutil
                        shutil.rmtree(message_dir)
                        logger.info(f"Cleaned up old attachment directory: {message_dir}")
                        
        except Exception as e:
            logger.error(f"Failed to cleanup old attachments: {str(e)}")
