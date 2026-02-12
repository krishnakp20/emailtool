from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from ..db import get_db
from ..models import TicketFeedback
from fastapi.responses import HTMLResponse

router = APIRouter()

@router.get("/", response_class=HTMLResponse)
def submit_feedback(
    token: str,
    field: str,
    rating: int,
    db: Session = Depends(get_db)
):
    feedback = db.query(TicketFeedback).filter_by(token=token).first()

    if not feedback:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    if feedback.submitted_at:
        return HTMLResponse("<h3>Feedback already submitted. Thank you ⭐</h3>")

    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Invalid rating")

    if field == "support":
        feedback.support_rating = rating
    elif field == "delivery":
        feedback.delivery_rating = rating
    elif field == "product":
        feedback.product_rating = rating
    else:
        raise HTTPException(status_code=400, detail="Invalid field")

    # Mark submitted only if all ratings filled
    if (
        feedback.support_rating and
        feedback.delivery_rating and
        feedback.product_rating
    ):
        feedback.submitted_at = datetime.utcnow()

    db.commit()

    return """
    <h2>Thank you for your feedback ⭐</h2>
    <p>Your response has been recorded.</p>
    """


