import pandas as pd
import io
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime

from ..db import get_db
from ..models import BulkEmail, BulkEmailStatus, User
from ..services.mailer import send_mail  # your existing mail function
from ..deps import get_current_user, require_admin

router = APIRouter()


# ---------------------------------------------------------
# UPLOAD EXCEL -> save email + content to DB
# ---------------------------------------------------------
@router.post("/upload", dependencies=[Depends(require_admin)])
async def upload_bulk_email_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only Excel file allowed (.xlsx/.xls)")

    file_bytes = await file.read()
    df = pd.read_excel(io.BytesIO(file_bytes))

    df.columns = df.columns.str.lower()

    if "email" not in df.columns or "content" not in df.columns:
        raise HTTPException(status_code=400, detail="Excel must contain columns: email, content")

    count = 0
    for _, row in df.iterrows():
        if pd.isna(row["email"]) or pd.isna(row["content"]):
            continue

        entry = BulkEmail(
            email=row["email"],
            content=row["content"],
            status=BulkEmailStatus.pending,
            created_at=datetime.utcnow()
        )
        db.add(entry)
        count += 1

    db.commit()
    return {"message": f"{count} emails uploaded successfully"}


# ---------------------------------------------------------
# DOWNLOAD EXCEL (export saved bulk emails)
# ---------------------------------------------------------
@router.get("/download", response_class=StreamingResponse)
async def download_bulk_email_excel(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    emails = db.query(BulkEmail).all()

    df = pd.DataFrame([ [e.email, e.content] for e in emails ], columns=["Email", "Content"])
    # 👆 Column headings defined clearly

    stream = io.BytesIO()
    df.to_excel(stream, index=False, header=True)  # ensure headings show
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=bulk_emails.xlsx"}
    )


# ---------------------------------------------------------
# SEND ALL PENDING EMAILS
# ---------------------------------------------------------
@router.post("/send-all")
async def bulk_send_all(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    pending = db.query(BulkEmail).filter(BulkEmail.status == 0).all()

    if not pending:
        return {"message": "No pending emails to send"}

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

    return {
        "message": "Bulk email processing complete",
        "sent": sent,
        "failed": failed
    }
