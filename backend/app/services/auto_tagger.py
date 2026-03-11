import re
from sqlalchemy.orm import Session
from ..models import CategoryLanguage, CategoryVOC, CategoryPriority

class AutoTagger:
    def __init__(self, db: Session):
        self.db = db

    def detect_language(self, text: str):
        """Detects language category based on keywords"""
        text_lower = text.lower()

        # Example heuristic — you can replace this with language detection
        if any(word in text_lower for word in ["hola", "gracias", "español"]):
            return self.db.query(CategoryLanguage).filter_by(name="Spanish").first()
        elif any(word in text_lower for word in ["bonjour", "merci", "français"]):
            return self.db.query(CategoryLanguage).filter_by(name="French").first()
        elif any(word in text_lower for word in ["hindi", "namaste"]):
            return self.db.query(CategoryLanguage).filter_by(name="Hindi").first()
        else:
            return self.db.query(CategoryLanguage).filter_by(name="English").first()

    def detect_voc(self, text: str):
        """Detect VOC category based on complaint or request type"""
        text_lower = text.lower()

        voc_rules = [
            (["order marked", "marked delivered"], "Order Marked"),
            (["refund", "money back", "return", "reimbursement",
             "claim", "request return", "compensation",
             "repay", "credit", "replacement"], "Refund Request"),
            (["payment", "refund payment", "transaction failed", "declined",
             "charge", "billing", "payment issue", "double charge",
             "failed payment", "payment declined", "unauthorized charge",
             "transaction error"], "Payment Related"),
            (["damaged", "broken", "missing", "wrong item", "defective",
             "incomplete", "packaging issue", "incorrect product",
             "faulty", "smashed", "lost item", "mis shipped"], "Product issues (damaged, missing, wrong items)"),
            (["cancel", "cancellation", "stop order", "wrong order",
             "remove order", "abort", "terminate", "undo", "revoke"], "Order Cancellation"),
            (["no reply", "promotional", "advertisement",
             "unsolicited", "junk", "phishing", "scam",
             "marketing email", "irrelevant"], "Spam"),
            (["product question", "availability", "pre purchase", "specifications",
             "info request", "before buying", "inquiry", "stock check",
             "product details", "feature query", "pricing question",
             "compatibility"], "Pre-purchase inquiries"),
            (["change", "modify", "update", "edit delivery", "adjust", "swap",
             "replace", "customize", "amend", "correct"], "Modification requests"),
            (["on-time", "expected", "arriving", "within 7 days",
             "estimated delivery", "tracking", "upcoming delivery",
             "scheduled", "prompt", "timely"], "Order Status- Within(7 days)"),
            (["delayed", "late", "not received", "pending", "waiting",
             "overdue", "shipping delay", "behind schedule",
             "eta missed", "delivery issue"], "Order Status - Delay(7days)"),
            (["rto rejected", "return rejected"], "RTO- Rejected"),
            (["reship", "reshipped"], "RTO- Reshipped"),
            (["fake", "counterfeit", "expired", "not genuine", "authenticity", "imitation",
             "copy", "old stock", "quality issue", "knockoff", "bogus", "phony",
             "substandard", "fraudulent", "replica"], "Fake or Expired products"),
            (["proof of delivery", "pod", "delivered but haven't received",
             "signed", "delivery confirmation", "acknowledgment", "receipt",
             "shipment proof", "verification"], "POD related"),
            (["skin issue", "allergy", "irritation", "redness",
             "acne", "sensitive skin", "dermatology",
             "reaction", "rash", "eczema", "breakout",
             "inflammation", "hives"], "Skin Related"),
            (["nch", "consumer complaint"], "NCH"),
            (["complaint", "bad review", "dissatisfied", "unhappy", "negative feedback",
             "poor experience", "issue", "criticism", "terrible", "awful",
             "disappointing", "frustration", "hate"], "Negative Comment"),
            (["shipment stuck", "edd breach", "not moving"], "Stuck Shipment – EDD Breach"),
            (["glitch order", "system error order"], "Glitch Order"),
            (["need more info", "waiting for reply", "incomplete info"],
             "Information Incomplete - Waiting For Customer Reply"),
        ]

        for keywords, category_name in voc_rules:
            if any(word in text_lower for word in keywords):
                return self.db.query(CategoryVOC).filter_by(name=category_name).first()

        return self.db.query(CategoryVOC).filter_by(name="Any Other").first()

    def detect_priority(self, text: str):
        """Detect priority from message urgency"""
        text_lower = text.lower()
        if any(word in text_lower for word in ["urgent", "immediately", "asap"]):
            return self.db.query(CategoryPriority).filter_by(name="High").first()
        elif "soon" in text_lower:
            return self.db.query(CategoryPriority).filter_by(name="Medium").first()
        else:
            return self.db.query(CategoryPriority).filter_by(name="Low").first()

    def auto_tag(self, subject: str, body: str):
        """Returns (language, voc, priority) objects"""
        combined = f"{subject} {body}"
        return (
            self.detect_language(combined),
            self.detect_voc(combined),
            self.detect_priority(combined),
        )
