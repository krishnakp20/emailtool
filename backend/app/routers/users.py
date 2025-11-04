from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ..db import get_db
from ..deps import require_admin
from ..models import User, Role
from ..utils import hash_password

router = APIRouter()

class UserCreate(BaseModel):
    name: str
    email: str
    role: str
    password: str
    is_active: bool = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: Role
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new user (admin only)"""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    # Convert string to Role enum if valid
    try:
        role_enum = Role(user_data.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {user_data.role}. Must be one of: {[r.value for r in Role]}"
        )
    
    user = User(
        name=user_data.name,
        email=user_data.email,
        role=role_enum,
        password_hash=hash_password(user_data.password),
        is_active=user_data.is_active
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

@router.post("/first-user", response_model=UserResponse)
async def create_first_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Create the first user in the system (no authentication required)"""
    # Check if any users already exist
    existing_users = db.query(User).count()
    if existing_users > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Users already exist. Use the regular /users/ endpoint with admin authentication."
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    # Convert string to Role enum if valid
    try:
        role_enum = Role(user_data.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {user_data.role}. Must be one of: {[r.value for r in Role]}"
        )
    
    user = User(
        name=user_data.name,
        email=user_data.email,
        role=role_enum,
        password_hash=hash_password(user_data.password),
        is_active=user_data.is_active
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

@router.get("/", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List users with optional filtering (admin only)"""
    query = db.query(User)
    
    if role is not None:
        # Convert string to Role enum if valid
        try:
            role_enum = Role(role)
            query = query.filter(User.role == role_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {role}. Must be one of: {[r.value for r in Role]}"
            )
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    users = query.order_by(User.created_at.desc()).all()
    return users

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields
    if user_data.name is not None:
        user.name = user_data.name
    
    if user_data.email is not None:
        # Check if new email already exists
        existing_user = db.query(User).filter(
            User.email == user_data.email,
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        user.email = user_data.email
    
    if user_data.role is not None:
        # Convert string to Role enum if valid
        try:
            role_enum = Role(user_data.role)
            user.role = role_enum
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {user_data.role}. Must be one of: {[r.value for r in Role]}"
            )
    
    if user_data.password is not None:
        user.password_hash = hash_password(user_data.password)
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    db.commit()
    db.refresh(user)
    
    return user 