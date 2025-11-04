#!/usr/bin/env python3
"""
Script to add sample categories to the database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import SessionLocal
from app.models import CategoryLanguage, CategoryVOC, CategoryPriority

def add_sample_categories():
    db = SessionLocal()
    
    try:
        # Add sample languages
        languages = [
            {"name": "English", "is_active": True},
            {"name": "Spanish", "is_active": True},
            {"name": "French", "is_active": True},
            {"name": "German", "is_active": True},
            {"name": "Hindi", "is_active": True},
            {"name": "Chinese", "is_active": True},
        ]
        
        for lang_data in languages:
            existing = db.query(CategoryLanguage).filter(CategoryLanguage.name == lang_data["name"]).first()
            if not existing:
                lang = CategoryLanguage(**lang_data)
                db.add(lang)
                print(f"Added language: {lang_data['name']}")
        
        # Add sample VOCs
        vocs = [
            {"name": "Technical Support", "is_active": True},
            {"name": "Billing", "is_active": True},
            {"name": "Feature Request", "is_active": True},
            {"name": "Bug Report", "is_active": True},
            {"name": "General Inquiry", "is_active": True},
            {"name": "Account Management", "is_active": True},
        ]
        
        for voc_data in vocs:
            existing = db.query(CategoryVOC).filter(CategoryVOC.name == voc_data["name"]).first()
            if not existing:
                voc = CategoryVOC(**voc_data)
                db.add(voc)
                print(f"Added VOC: {voc_data['name']}")
        
        # Add sample priorities
        priorities = [
            {"name": "Low", "weight": 1, "is_active": True},
            {"name": "Medium", "weight": 2, "is_active": True},
            {"name": "High", "weight": 3, "is_active": True},
            {"name": "Critical", "weight": 4, "is_active": True},
            {"name": "Urgent", "weight": 5, "is_active": True},
        ]
        
        for prio_data in priorities:
            existing = db.query(CategoryPriority).filter(CategoryPriority.name == prio_data["name"]).first()
            if not existing:
                prio = CategoryPriority(**prio_data)
                db.add(prio)
                print(f"Added priority: {prio_data['name']}")
        
        db.commit()
        print("Sample categories added successfully!")
        
    except Exception as e:
        print(f"Error adding categories: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_sample_categories()
