#!/usr/bin/env python3
"""
Test script to process one email and create a ticket
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.workers.imap_worker import IMAPWorker
from app.db import SessionLocal
from app.models import Ticket

def test_single_email():
    print("Testing single email processing...")
    
    worker = IMAPWorker()
    
    # Connect to IMAP
    connected = worker.connect_imap()
    print(f"IMAP connected: {connected}")
    
    if not connected:
        print("Failed to connect to IMAP")
        return
    
    try:
        # Select INBOX
        worker.imap_client.select_folder('INBOX')
        
        # Get the latest message
        messages = worker.imap_client.search('ALL')
        print(f"Total messages: {len(messages)}")
        
        if messages:
            latest = messages[-1]
            print(f"Processing latest message: {latest}")
            
            # Fetch email data with individual calls like the debug script
            print("Fetching ENVELOPE...")
            envelope_data = worker.imap_client.fetch([latest], ['ENVELOPE'])
            print(f"ENVELOPE data: {envelope_data}")
            
            print("Fetching BODY[TEXT]...")
            text_data = worker.imap_client.fetch([latest], ['BODY[TEXT]'])
            print(f"BODY[TEXT] data: {text_data}")
            
            print("Fetching INTERNALDATE...")
            date_data = worker.imap_client.fetch([latest], ['INTERNALDATE'])
            print(f"INTERNALDATE data: {date_data}")
            
            # Combine the data
            email_data = {}
            if envelope_data and latest in envelope_data:
                email_data['ENVELOPE'] = envelope_data[latest].get(b'ENVELOPE')
            if text_data and latest in text_data:
                email_data['BODY[TEXT]'] = text_data[latest].get(b'BODY[TEXT]')
            if date_data and latest in date_data:
                email_data['INTERNALDATE'] = date_data[latest].get(b'INTERNALDATE')
            
            print(f"Combined email data keys: {list(email_data.keys())}")
            
            if email_data and 'ENVELOPE' in email_data:
                # Process the email
                result = worker.process_email(email_data, str(latest))
                print(f"Processing result: {result}")
                
                # Check if ticket was created
                db = SessionLocal()
                try:
                    tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).limit(5).all()
                    print(f"Found {len(tickets)} tickets:")
                    for t in tickets:
                        print(f"  ID: {t.id}, Subject: {t.subject}, Customer: {t.customer_email}")
                finally:
                    db.close()
            else:
                print("No email data found")
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        worker.db.close()

if __name__ == "__main__":
    test_single_email()
