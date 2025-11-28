from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from datetime import datetime
from ..db import get_db
from ..models import BulkEmail, BulkEmailStatus
from ..services.mailer import send_mail
import logging

logger = logging.getLogger(__name__)

def send_pending_bulk_emails():
    db: Session = next(get_db())
    pending = db.query(BulkEmail).filter(BulkEmail.status == BulkEmailStatus.pending).all()

    if not pending:
        logger.info("No pending bulk emails to send")
        return

    sent = 0
    failed = 0

    for record in pending:
        try:
            message_id = send_mail(
                to_email=record.email,
                subject="Bulk Mail Delivery",
                body=record.content,
                attachments=None
            )

            if message_id:
                record.status = BulkEmailStatus.sent
                record.response = f"Sent - MessageID {message_id}"
                sent += 1
            else:
                record.response = "Mail Failed"
                failed += 1

        except Exception as e:
            record.response = f"Error: {str(e)}"
            failed += 1

        db.commit()

    logger.info(f"Bulk email worker finished: Sent={sent}, Failed={failed}")


def start_scheduler():
    scheduler = BackgroundScheduler()
    # Runs every 5 minutes
    scheduler.add_job(send_pending_bulk_emails, 'interval', minutes=5, id="bulk_email_worker", replace_existing=True)
    scheduler.start()
    logger.info("Bulk email scheduler started")
