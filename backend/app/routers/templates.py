from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from ..db import get_db
from ..deps import require_admin
from ..models import EmailTemplate

router = APIRouter()

class TemplateCreate(BaseModel):
    name: str
    subject: str
    body: str

class TemplateUpdate(BaseModel):
    name: str = None
    subject: str = None
    body: str = None

class TemplateResponse(BaseModel):
    id: int
    name: str
    subject: str
    body: str

    class Config:
        from_attributes = True

@router.post("/", response_model=TemplateResponse)
async def create_template(
    template_data: TemplateCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Create email template (admin only)"""
    existing = db.query(EmailTemplate).filter(EmailTemplate.name == template_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Template name already exists")
    
    template = EmailTemplate(**template_data.dict())
    db.add(template)
    db.commit()
    db.refresh(template)
    return template

@router.get("/", response_model=List[TemplateResponse])
async def list_templates(db: Session = Depends(get_db)):
    """List all email templates"""
    return db.query(EmailTemplate).order_by(EmailTemplate.name).all()

@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: int, db: Session = Depends(get_db)):
    """Get template by ID"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.patch("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    template_data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Update email template (admin only)"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    for field, value in template_data.dict(exclude_unset=True).items():
        setattr(template, field, value)
    
    db.commit()
    db.refresh(template)
    return template

@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Delete email template (admin only)"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    return {"message": "Template deleted"} 