#!/usr/bin/env python3
"""
Debug script to see email data structure
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.workers.imap_worker import IMAPWorker

def debug_email():
    print("Debugging email data structure...")
    
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
            print(f"Debugging message: {latest}")
            
            # Fetch email data with different fields
            print("Fetching with ENVELOPE...")
            email_data = worker.imap_client.fetch([latest], ['ENVELOPE'])
            print(f"ENVELOPE data: {email_data}")
            
            print("\nFetching with BODY[TEXT]...")
            text_data = worker.imap_client.fetch([latest], ['BODY[TEXT]'])
            print(f"BODY[TEXT] data: {text_data}")
            
            print("\nFetching with INTERNALDATE...")
            date_data = worker.imap_client.fetch([latest], ['INTERNALDATE'])
            print(f"INTERNALDATE data: {date_data}")
            
            print("\nFetching with RFC822.HEADER...")
            header_data = worker.imap_client.fetch([latest], ['RFC822.HEADER'])
            print(f"RFC822.HEADER data: {header_data}")
            
            print("\nFetching with RFC822...")
            full_data = worker.imap_client.fetch([latest], ['RFC822'])
            print(f"RFC822 data keys: {list(full_data.keys()) if full_data else 'None'}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        worker.db.close()

if __name__ == "__main__":
    debug_email()
