import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
from typing import Optional, Dict, Any
from .config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# JWT operations
def create_jwt(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MIN)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def decode_jwt(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        return None

# Pagination helper
def get_pagination_params(page: Optional[int] = None, page_size: Optional[int] = None) -> tuple[int, int]:
    """Get pagination parameters with defaults"""
    page = max(1, page) if page else 1
    page_size = min(max(1, page_size), 100) if page_size else 25
    return page, page_size

def apply_pagination(query, page: int, page_size: int):
    """Apply pagination to a SQLAlchemy query"""
    offset = (page - 1) * page_size
    return query.offset(offset).limit(page_size) 