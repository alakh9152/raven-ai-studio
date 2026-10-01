#!/bin/bash
echo "🦅 Raven AI Studio - Starting..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client not found. Database migrations may fail."
    echo "   Install with: sudo apt install postgresql-client"
fi

# Check for .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "   Please edit .env and add your database credentials"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set up database
echo "🗄️  Setting up database..."
echo "   Database: raven_studio"
echo "   Please ensure PostgreSQL is running"
echo ""
echo "   To create database and run migrations:"
echo "   createdb raven_studio"
echo "   psql -d raven_studio -f src/config/migrations/001_initial_schema.sql"
echo "   psql -d raven_studio -f src/config/migrations/002_security_improvements.sql"
echo "   psql -d raven_studio -f src/config/migrations/003_email_verification_improvements.sql"
echo "   psql -d raven_studio -f src/config/migrations/004_project_fields.sql"
echo "   psql -d raven_studio -f src/config/migrations/005_enquiry_fields.sql"
echo "   psql -d raven_studio -f src/config/migrations/006_activity_logs.sql"
echo ""

# Start server
echo "🚀 Starting server..."
echo "   Opening http://localhost:3000"
echo ""
npm run dev
