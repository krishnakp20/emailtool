# Email→Ticket Helpdesk App

A complete helpdesk system that automatically creates tickets from incoming emails, assigns them to advisers using round-robin, and provides a full admin/adviser interface.

## Features

- **Auto Ticket Creation**: IMAP worker processes incoming emails and creates tickets
- **Round-Robin Assignment**: Automatically assigns tickets to active advisers
- **Threading**: Maintains email conversations with `[TKT-{id}]` prefix
- **Categories**: Language, VOC, and Priority classification
- **Templates**: Predefined email templates for responses
- **Auto-Acknowledgement**: Sends confirmation on first ticket creation
- **Full UI**: Admin dashboard and adviser interface

## Quick Start

1. **Setup Environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

2. **Start Services**
   ```bash
   docker compose up --build
   ```

3. **Access Services**
   - **API Documentation**: http://localhost:8000/docs
   - **Frontend**: http://localhost:5173
   - **Mailhog UI** (dev SMTP): http://localhost:8025

## First Login

1. Use the Swagger UI at `/users` to create your first admin user
2. Login through the frontend with your credentials

## Testing Flows

### 1. Auto Ticket Creation
- Send an email from Mailhog UI to `support@mas.local`
- Ticket is automatically created with auto-ack sent
- Ticket is assigned via round-robin to an active adviser

### 2. Email Threading
- Reply to an email with `[TKT-{id}]` in subject
- Message is appended to existing ticket
- If ticket was closed, it automatically reopens

### 3. Blocked Senders
- Add a sender to blocked list
- New emails from blocked sender are skipped
- Check `email_ingest` table for skipped status

### 4. Adviser Management
- Deactivate an adviser → they stop receiving new tickets
- Round-robin automatically excludes inactive advisers

### 5. Ticket Reassignment
- Admin can reassign tickets between advisers
- Changes are reflected in real-time

## Architecture

- **Backend**: FastAPI + SQLAlchemy + MySQL
- **Frontend**: React + TypeScript + Tailwind CSS
- **Email Processing**: IMAP worker with 15-second polling
- **SMTP**: Mailhog for development, configurable for production
- **Authentication**: JWT-based with role-based access control

## Database Schema

- **Users**: Admin and adviser accounts with role-based permissions
- **Tickets**: Main ticket entities with categorization and assignment
- **Messages**: Email thread storage with direction tracking
- **Categories**: Language, VOC, and Priority classifications
- **Templates**: Reusable email response templates

## API Endpoints

- `/auth/*` - Authentication (login)
- `/users/*` - User management (admin only)
- `/categories/*` - Category management (admin only)
- `/templates/*` - Template management (admin only)
- `/tickets/*` - Ticket operations and messaging

## Development

The app uses Docker Compose for easy development setup. All services are containerized and configured for hot-reload during development. 