#!/usr/bin/env python3
"""
Debug script to test password hashing and verification
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.utils import hash_password, verify_password
from app.db import SessionLocal
from app.models import User

def test_password():
    print("Testing password hashing and verification...")
    
    # Test password
    test_password = "Admin123Asdf321"
    
    # Hash the password
    hashed = hash_password(test_password)
    print(f"Original password: {test_password}")
    print(f"Hashed password: {hashed}")
    
    # Verify the password
    is_valid = verify_password(test_password, hashed)
    print(f"Password verification: {is_valid}")
    
    # Test with database
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "admin@teammas.in").first()
        if user:
            print(f"\nUser found in database:")
            print(f"  ID: {user.id}")
            print(f"  Name: {user.name}")
            print(f"  Email: {user.email}")
            print(f"  Role: {user.role}")
            print(f"  Password hash: {user.password_hash}")
            print(f"  Is active: {user.is_active}")
            
            # Test verification with stored hash
            db_verification = verify_password(test_password, user.password_hash)
            print(f"Database password verification: {db_verification}")
            
            # Test with wrong password
            wrong_verification = verify_password("wrongpassword", user.password_hash)
            print(f"Wrong password verification: {wrong_verification}")
        else:
            print("No user found with email admin@teammas.in")
    finally:
        db.close()

if __name__ == "__main__":
    test_password() 