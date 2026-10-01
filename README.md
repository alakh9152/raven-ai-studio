# Raven AI Studio - Complete Setup Guide

## Architecture Overview

```
┌──────────────────────┐
│      Browser         │
│ HTML/CSS/JavaScript  │
└──────────┬───────────┘
           │
   HTTPS / JSON / Cookies
           │
           ▼
┌───────────────────────────┐
│       Node.js             │
│       Express             │
└─────────────┬─────────────┘
              │
┌─────────────┼─────────────┐
│             │             │
▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Middleware│  │  Routes  │  │ Services │
│          │  │          │  │          │
│ Auth     │  │ Auth     │  │ Email    │
│ CORS     │  │ Users    │  │ Contact  │
│ Rate Limit│ │ Projects │  │ Future   │
│ Validation│ │ Enquiries│  │ APIs     │
└──────────┘  └────┬──────┘  └──────────┘
                  │
                  ▼
         ┌────────────────┐
         │   PostgreSQL   │
         │                │
         │ Users          │
         │ Sessions       │
         │ Projects       │
         │ Enquiries      │
         │ Activity Logs  │
         └────────────────┘
```

## Project Structure

```
ai-saas-website/
├── src/
│   ├── server.js                 # Express server entry point
│   ├── config/
│   │   ├── db.js                 # Database connection with security
│   │   └── migrations/           # Database migrations
│   │       ├── 001_initial_schema.sql
│   │       ├── 002_security_improvements.sql
│   │       ├── 003_email_verification_improvements.sql
│   │       ├── 004_project_fields.sql
│   │       ├── 005_enquiry_fields.sql
│   │       └── 006_activity_logs.sql
│   ├── middleware/
│   │   ├── session.js            # Session management
│   │   ├── auth.js               # Authentication middleware
│   │   └── logging.js            # Request logging & error handling
│   ├── routes/
│   │   ├── auth.js               # Auth routes (login, register, logout)
│   │   ├── dashboard.js          # Dashboard routes
│   │   └── api.js                # Public API routes
│   ├── services/
│   │   ├── authService.js        # Business logic for auth
│   │   ├── dashboardService.js   # Dashboard business logic
│   │   └── crypto.js             # Security utilities
│   └── models/                   # Data models (future)
├── public/                       # Frontend
│   ├── css/
│   │   └── style.css            # Main stylesheet
│   ├── js/
│   │   └── app.js               # Frontend JavaScript
│   ├── index.html               # Homepage
│   ├── login.html               # Login/Register page
│   ├── services.html            # Services page
│   ├── work.html                # Portfolio page
│   ├── pricing.html             # Pricing page
│   └── faq.html                 # FAQ page
├── package.json
├── .env.example
└── README.md
```

## Security Features

### Database Security
- Parameterized queries (prevents SQL injection)
- Connection pooling with SSL support
- Row-level security ready
- Audit logging for all sensitive operations

### Authentication Security
- Server-side sessions (no JWT)
- Password hashing with bcrypt (12 salt rounds)
- Session timeout and revocation
- Account lockout after failed attempts
- CSRF protection ready

### API Security
- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- Input validation with express-validator
- Request logging with request IDs

### Error Handling
- Centralized error handler middleware
- Validation error formatting
- Request/response logging
- Structured error responses

## Database Migrations

### Migration Files
1. **001_initial_schema.sql** - Base tables (users, sessions)
2. **002_security_improvements.sql** - Audit logs, rate limiting
3. **003_email_verification_improvements.sql** - Email verification, login attempts
4. **004_project_fields.sql** - Projects and milestones
5. **005_enquiry_fields.sql** - Enhanced enquiries
6. **006_activity_logs.sql** - Comprehensive activity logging

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/change-password` - Change password

### Dashboard (Protected)
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/projects` - List projects
- `GET /api/dashboard/users` - List users (admin only)
- `POST /api/dashboard/enquiries` - List enquiries
- `POST /api/dashboard/enquiries/:id/status` - Update enquiry status

### Public
- `GET /api/contact` - Get contact info
- `POST /api/contact` - Submit enquiry

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Setup Steps

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create database:
   ```bash
   createdb raven_studio
   ```

3. Run migrations:
   ```bash
   psql -d raven_studio -f src/config/migrations/001_initial_schema.sql
   psql -d raven_studio -f src/config/migrations/002_security_improvements.sql
   psql -d raven_studio -f src/config/migrations/003_email_verification_improvements.sql
   psql -d raven_studio -f src/config/migrations/004_project_fields.sql
   psql -d raven_studio -f src/config/migrations/005_enquiry_fields.sql
   psql -d raven_studio -f src/config/migrations/006_activity_logs.sql
   ```

4. Create `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

6. Start production server:
   ```bash
   npm start
   ```

## Development

### Running Tests
```bash
npm test
```

### Database Commands
```bash
# Connect to database
psql -d raven_studio

# Run migrations manually
psql -d raven_studio -f src/config/migrations/001_initial_schema.sql
```

### Environment Variables
```env
PORT=3000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=raven_studio
DB_USER=postgres
DB_PASSWORD=your_password_here

# Session
SESSION_SECRET=raven_session_secret_change_in_production
SESSION_EXPIRY=7d

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
```

## License

MIT
