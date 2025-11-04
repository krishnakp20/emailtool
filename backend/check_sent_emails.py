#!/usr/bin/env python3
"""
Script to check sent emails in the database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import get_db
from app.models import Ticket, TicketMessage, User, MsgDir
from sqlalchemy.orm import Session

def check_sent_emails():
    """Check sent emails in the database"""
    db = next(get_db())
    
    try:
        # Check all tickets
        print("=== ALL TICKETS ===")
        tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).limit(10).all()
        for ticket in tickets:
            print(f"Ticket #{ticket.id}: {ticket.subject} | {ticket.customer_email} | Assigned: {ticket.assigned_to} | Status: {ticket.status}")
        
        print("\n=== SENT EMAILS (OUTBOUND MESSAGES) ===")
        sent_messages = db.query(TicketMessage).filter(
            TicketMessage.direction == MsgDir.outbound
        ).order_by(TicketMessage.sent_at.desc()).limit(10).all()
        
        for msg in sent_messages:
            print(f"Message #{msg.id}: {msg.subject} | From: {msg.from_email} | To: {msg.to_email} | Ticket: {msg.ticket_id}")
        
        print("\n=== USERS ===")
        users = db.query(User).all()
        for user in users:
            print(f"User #{user.id}: {user.name} | {user.email} | Role: {user.role}")
        
        # Check if there are any tickets assigned to users
        print("\n=== TICKETS BY ASSIGNMENT ===")
        assigned_tickets = db.query(Ticket).filter(Ticket.assigned_to.isnot(None)).all()
        for ticket in assigned_tickets:
            print(f"Ticket #{ticket.id}: Assigned to {ticket.assigned_to} | {ticket.subject}")
        
        print("\n=== UNASSIGNED TICKETS ===")
        unassigned_tickets = db.query(Ticket).filter(Ticket.assigned_to.is_(None)).all()
        for ticket in unassigned_tickets:
            print(f"Ticket #{ticket.id}: Unassigned | {ticket.subject}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_sent_emails()

