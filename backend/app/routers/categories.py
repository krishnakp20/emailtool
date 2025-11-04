from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from ..db import get_db
from ..deps import require_admin
from ..models import CategoryLanguage, CategoryVOC, CategoryPriority

router = APIRouter()

# Language Categories
class LanguageCreate(BaseModel):
    name: str
    is_active: bool = True

class LanguageUpdate(BaseModel):
    name: str = None
    is_active: bool = None

class LanguageResponse(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True

@router.post("/language", response_model=LanguageResponse)
async def create_language(
    language_data: LanguageCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Create language category (admin only)"""
    existing = db.query(CategoryLanguage).filter(CategoryLanguage.name == language_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Language already exists")
    
    language = CategoryLanguage(**language_data.dict())
    db.add(language)
    db.commit()
    db.refresh(language)
    return language

@router.get("/language", response_model=List[LanguageResponse])
async def list_languages(db: Session = Depends(get_db)):
    """List all language categories"""
    return db.query(CategoryLanguage).order_by(CategoryLanguage.name).all()

@router.patch("/language/{lang_id}", response_model=LanguageResponse)
async def update_language(
    lang_id: int,
    language_data: LanguageUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Update language category (admin only)"""
    language = db.query(CategoryLanguage).filter(CategoryLanguage.id == lang_id).first()
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")
    
    for field, value in language_data.dict(exclude_unset=True).items():
        setattr(language, field, value)
    
    db.commit()
    db.refresh(language)
    return language

# VOC Categories
class VOCCreate(BaseModel):
    name: str
    is_active: bool = True

class VOCUpdate(BaseModel):
    name: str = None
    is_active: bool = None

class VOCResponse(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True

@router.post("/voc", response_model=VOCResponse)
async def create_voc(
    voc_data: VOCCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Create VOC category (admin only)"""
    existing = db.query(CategoryVOC).filter(CategoryVOC.name == voc_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="VOC already exists")
    
    voc = CategoryVOC(**voc_data.dict())
    db.add(voc)
    db.commit()
    db.refresh(voc)
    return voc

@router.get("/voc", response_model=List[VOCResponse])
async def list_vocs(db: Session = Depends(get_db)):
    """List all VOC categories"""
    return db.query(CategoryVOC).order_by(CategoryVOC.name).all()

@router.patch("/voc/{voc_id}", response_model=VOCResponse)
async def update_voc(
    voc_id: int,
    voc_data: VOCUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Update VOC category (admin only)"""
    voc = db.query(CategoryVOC).filter(CategoryVOC.id == voc_id).first()
    if not voc:
        raise HTTPException(status_code=404, detail="VOC not found")
    
    for field, value in voc_data.dict(exclude_unset=True).items():
        setattr(voc, field, value)
    
    db.commit()
    db.refresh(voc)
    return voc

# Priority Categories
class PriorityCreate(BaseModel):
    name: str
    weight: int = 0
    is_active: bool = True

class PriorityUpdate(BaseModel):
    name: str = None
    weight: int = None
    is_active: bool = None

class PriorityResponse(BaseModel):
    id: int
    name: str
    weight: int
    is_active: bool

    class Config:
        from_attributes = True

@router.post("/priority", response_model=PriorityResponse)
async def create_priority(
    priority_data: PriorityCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Create priority category (admin only)"""
    existing = db.query(CategoryPriority).filter(CategoryPriority.name == priority_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Priority already exists")
    
    priority = CategoryPriority(**priority_data.dict())
    db.add(priority)
    db.commit()
    db.refresh(priority)
    return priority

@router.get("/priority", response_model=List[PriorityResponse])
async def list_priorities(db: Session = Depends(get_db)):
    """List all priority categories"""
    return db.query(CategoryPriority).order_by(CategoryPriority.weight.desc()).all()

@router.patch("/priority/{priority_id}", response_model=PriorityResponse)
async def update_priority(
    priority_id: int,
    priority_data: PriorityUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Update priority category (admin only)"""
    priority = db.query(CategoryPriority).filter(CategoryPriority.id == priority_id).first()
    if not priority:
        raise HTTPException(status_code=404, detail="Priority not found")
    
    for field, value in priority_data.dict(exclude_unset=True).items():
        setattr(priority, field, value)
    
    db.commit()
    db.refresh(priority)
    return priority 