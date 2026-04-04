from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime, timedelta
import csv
import io
from ..db import get_db
from ..deps import require_admin
from ..models import Ticket, TicketMessage, User, BlockedSender, MsgDir, TicketFeedback, TicketEvent
from io import BytesIO
from openpyxl import Workbook

router = APIRouter()

@router.get("/tickets/csv")
async def export_tickets_csv(
    status: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
    priority_id: Optional[int] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Export tickets to CSV format"""
    
    query = db.query(Ticket).options(
        joinedload(Ticket.assigned_user),
        joinedload(Ticket.language),
        joinedload(Ticket.voc),
        joinedload(Ticket.priority)
    )
    
    # Apply filters
    if status:
        query = query.filter(Ticket.status == status)
    if assigned_to:
        query = query.filter(Ticket.assigned_to == assigned_to)
    if priority_id:
        query = query.filter(Ticket.priority_id == priority_id)
    if from_date:
        query = query.filter(Ticket.created_at >= from_date)
    if to_date:
        query = query.filter(Ticket.created_at <= to_date)
    
    query = query.order_by(Ticket.created_at.desc())
    tickets = query.all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'Ticket ID',
        'Customer Email',
        'Customer Name',
        'Subject',
        'Status',
        'Assigned To',
        'Language',
        'VOC',
        'Priority',
        'Created At',
        'Updated At'
    ])
    
    # Write data
    for ticket in tickets:
        writer.writerow([
            ticket.id,
            ticket.customer_email,
            ticket.customer_name or '',
            ticket.subject,
            ticket.status.value,
            ticket.assigned_user.name if ticket.assigned_user else '',
            ticket.language.name if ticket.language else '',
            ticket.voc.name if ticket.voc else '',
            ticket.priority.name if ticket.priority else '',
            ticket.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            ticket.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        ])
    
    output.seek(0)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"tickets_export_{timestamp}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/emails/csv")
async def export_emails_csv(
    spam_status: Optional[str] = Query(None, description="spam, not_spam, or all"),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Export emails to CSV format - includes spam and non-spam emails"""
    
    # Get all ticket messages
    query = db.query(TicketMessage).options(
        joinedload(TicketMessage.ticket),
        joinedload(TicketMessage.created_user)
    )
    
    # Apply date filters
    if from_date:
        query = query.filter(TicketMessage.sent_at >= from_date)
    if to_date:
        query = query.filter(TicketMessage.sent_at <= to_date)
    
    query = query.order_by(TicketMessage.sent_at.desc())
    messages = query.all()
    
    # Get blocked senders (spam emails)
    blocked_senders = db.query(BlockedSender).all()
    blocked_emails = {bs.email.lower() for bs in blocked_senders}
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'Message ID',
        'Ticket ID',
        'Direction',
        'From Email',
        'To Email',
        'Subject',
        'Body Preview',
        'Spam Status',
        'Sent At',
        'Has Attachments'
    ])
    
    # Write data
    for message in messages:
        from_email_lower = message.from_email.lower()
        is_spam = from_email_lower in blocked_emails
        spam_label = 'Spam' if is_spam else 'Not Spam'
        
        # Apply spam filter if specified
        if spam_status == 'spam' and not is_spam:
            continue
        if spam_status == 'not_spam' and is_spam:
            continue
        
        # Get body preview (first 100 chars)
        body_preview = message.body[:100].replace('\n', ' ').replace('\r', ' ') if message.body else ''
        
        has_attachments = 'Yes' if message.attachments_json else 'No'
        
        writer.writerow([
            message.id,
            message.ticket_id,
            message.direction.value,
            message.from_email,
            message.to_email,
            message.subject,
            body_preview,
            spam_label,
            message.sent_at.strftime('%Y-%m-%d %H:%M:%S'),
            has_attachments
        ])
    
    output.seek(0)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    spam_suffix = f"_{spam_status}" if spam_status and spam_status != 'all' else ""
    filename = f"emails_export{spam_suffix}_{timestamp}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/spam-emails/csv")
async def export_spam_emails_csv(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Export only spam emails (from blocked senders)"""
    return await export_emails_csv(
        spam_status="spam",
        from_date=from_date,
        to_date=to_date,
        db=db,
        current_user=current_user
    )


@router.get("/blocked-senders/csv")
async def export_blocked_senders_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Export blocked senders list to CSV"""
    
    blocked_senders = db.query(BlockedSender).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['ID', 'Email', 'Reason'])
    
    # Write data
    for sender in blocked_senders:
        writer.writerow([
            sender.id,
            sender.email,
            sender.reason or ''
        ])
    
    output.seek(0)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"blocked_senders_{timestamp}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )



@router.get("/ticket-feedback/excel")
def export_ticket_feedback_excel(
    from_date: str = Query(None),
    to_date: str = Query(None),
    db: Session = Depends(get_db)
):
    query = (
        db.query(TicketFeedback, Ticket)
        .join(Ticket, TicketFeedback.ticket_id == Ticket.id)
    )

    # ✅ Date filtering
    if from_date:
        from_dt = datetime.strptime(from_date, "%Y-%m-%d")
        query = query.filter(TicketFeedback.created_at >= from_dt)

    if to_date:
        to_dt = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
        query = query.filter(TicketFeedback.created_at <= to_dt)

    results = query.all()

    # ✅ Create Excel file
    wb = Workbook()
    ws = wb.active
    ws.title = "Ticket Feedback"

    # Headers
    headers = [
        "Ticket ID",
        "Customer Email",
        "Support Rating",
        "Delivery Rating",
        "Product Rating",
        "Submitted At",
        "Created At",
    ]
    ws.append(headers)

    # Data rows
    for feedback, ticket in results:
        ws.append([
            feedback.ticket_id,
            ticket.customer_email,
            feedback.support_rating,
            feedback.delivery_rating,
            feedback.product_rating,
            feedback.submitted_at,
            feedback.created_at,
        ])

    # Save to memory
    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"ticket_feedback_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )



@router.get("/ticket-events/csv")
async def export_ticket_events_csv(
    ticket_id: Optional[int] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Export ticket events (status changes) to CSV"""

    query = db.query(TicketEvent).options(
        joinedload(TicketEvent.ticket)
    )

    # Filters
    if ticket_id:
        query = query.filter(TicketEvent.ticket_id == ticket_id)

    if from_date:
        query = query.filter(TicketEvent.created_at >= from_date)

    if to_date:
        query = query.filter(TicketEvent.created_at <= to_date)

    query = query.order_by(TicketEvent.created_at.desc())

    events = query.all()

    # CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        'Event ID',
        'Ticket ID',
        'Customer Email',
        'Subject',
        'Assigned To',
        'Ticket Status',
        'Ticket Created At',
        'Ticket Updated At',
        'Event Old Status',
        'Event New Status',
        'Event Type',
        'Reopened At'
    ])

    # Data
    for event in events:
        ticket = event.ticket

        writer.writerow([
            event.id,
            event.ticket_id,
            ticket.customer_email if ticket else '',
            ticket.subject if ticket else '',
            ticket.assigned_user.name if ticket and ticket.assigned_user else '',
            ticket.status.value if ticket and ticket.status else '',
            ticket.created_at.strftime('%Y-%m-%d %H:%M:%S') if ticket and ticket.created_at else '',
            ticket.updated_at.strftime('%Y-%m-%d %H:%M:%S') if ticket and ticket.updated_at else '',
            event.old_value,
            event.new_value,
            event.event_type,
            event.created_at.strftime('%Y-%m-%d %H:%M:%S')
        ])

    output.seek(0)

    # Filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"ticket_events_export_{timestamp}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )