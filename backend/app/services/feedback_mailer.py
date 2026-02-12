from ..services.mailer import send_mail

def send_feedback_email(ticket, token):
    base_url = "http://localhost:8000/feedback"

    def stars(field):
        STAR = "&#11088;"
        return " ".join([
            f'<a style="text-decoration:none;font-size:22px;" '
            f'href="{base_url}?token={token}&field={field}&rating={i}">{STAR}</a>'
            for i in range(1, 6)
        ])

    body = f"""
    <h3>We value your feedback &#11088;</h3>
    <p>Please rate your experience:</p>

    <p><b>Customer Support</b><br/>
    {stars("support")}
    </p>

    <p><b>Delivery Experience</b><br/>
    {stars("delivery")}
    </p>

    <p><b>Product Experience</b><br/>
    {stars("product")}
    </p>

    <p>Thank you for choosing us!</p>
    """

    send_mail(
        to_email=ticket.customer_email,
        subject=f"Rate your experience for Ticket #{ticket.id}",
        body=body
    )


import uuid
from ..models import TicketFeedback


def create_and_send_feedback(db, ticket):
    # Prevent duplicate feedback creation
    existing = db.query(TicketFeedback).filter_by(ticket_id=ticket.id).first()
    if existing:
        return

    token = str(uuid.uuid4())

    feedback = TicketFeedback(
        ticket_id=ticket.id,
        token=token
    )

    db.add(feedback)
    db.commit()  # ensures feedback row exists before email
    db.refresh(feedback)

    send_feedback_email(ticket, feedback.token)
