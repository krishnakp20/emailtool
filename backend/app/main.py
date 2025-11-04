from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from .db import engine
from .models import Base
from .routers import auth, users, categories, templates, tickets, blocked_senders, emails, exports, instagram
from .config import settings

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Email Ticket Helpdesk API",
    description="API for managing email-based helpdesk tickets",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(categories.router, prefix="/categories", tags=["categories"])
app.include_router(templates.router, prefix="/templates", tags=["templates"])
app.include_router(tickets.router, prefix="/tickets", tags=["tickets"])
app.include_router(blocked_senders.router, prefix="/blocked-senders", tags=["blocked-senders"])
app.include_router(emails.router, prefix="/emails", tags=["emails"])
app.include_router(exports.router, prefix="/exports", tags=["exports"])
app.include_router(instagram.router, prefix="/instagram", tags=["instagram"])

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"ok": True, "message": "Email Ticket Helpdesk API"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

# File serving for attachments
@app.get("/attachments/{file_path:path}")
async def serve_attachment(file_path: str):
    """Serve attachment files from the attachments directory"""
    # For development, serve from local attachments directory
    # In production, this could be replaced with cloud storage URLs
    attachment_dir = "attachments"
    
    # Ensure the file path is safe (no directory traversal)
    if ".." in file_path or file_path.startswith("/"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid file path")
    
    file_path = os.path.join(attachment_dir, file_path)
    
    if not os.path.exists(file_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path) 