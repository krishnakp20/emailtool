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
        if "refund" in text_lower or "money" in text_lower:
            return self.db.query(CategoryVOC).filter_by(name="Refund Request").first()
        elif "delay" in text_lower or "late" in text_lower:
            return self.db.query(CategoryVOC).filter_by(name="Delivery Issue").first()
        elif "broken" in text_lower or "damaged" in text_lower:
            return self.db.query(CategoryVOC).filter_by(name="Product Damage").first()
        else:
            return self.db.query(CategoryVOC).filter_by(name="General Inquiry").first()

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
