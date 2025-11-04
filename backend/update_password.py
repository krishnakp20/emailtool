#!/usr/bin/env python3
"""
Script to update the admin user's password
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.utils import hash_password
from app.db import SessionLocal
from app.models import User

def update_password():
    print("Updating admin user password...")
    
    # New password
    new_password = "Admin123Asdf321"
    
    # Hash the new password
    new_hash = hash_password(new_password)
    print(f"New password: {new_password}")
    print(f"New hash: {new_hash}")
    
    # Update in database
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "admin@teammas.in").first()
        if user:
            print(f"\nUpdating user: {user.name} ({user.email})")
            old_hash = user.password_hash
            print(f"Old hash: {old_hash}")
            
            # Update password
            user.password_hash = new_hash
            db.commit()
            
            print(f"New hash: {user.password_hash}")
            print("Password updated successfully!")
            
            # Verify the update
            db.refresh(user)
            from app.utils import verify_password
            is_valid = verify_password(new_password, user.password_hash)
            print(f"Verification test: {is_valid}")
            
        else:
            print("No user found with email admin@teammas.in")
    except Exception as e:
        print(f"Error updating password: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_password() 