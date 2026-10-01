#!/bin/bash

echo "🦅 Raven AI Studio - Setup Script"
echo "================================"
echo ""

# Check if PostgreSQL is running
echo "Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    echo "✓ PostgreSQL client found"
else
    echo "⚠ PostgreSQL client not found. Install it first:"
    echo "  Ubuntu/Debian: sudo apt install postgresql-client"
    echo "  macOS: brew install postgresql"
    echo ""
fi

# Create database
echo "Setting up database..."
echo "Please enter your PostgreSQL password when prompted:"
read -s DB_PASSWORD

# Create database if it doesn't exist
psql -U postgres -c "CREATE DATABASE raven_studio;" 2>/dev/null || echo "Database may already exist"

# Run schema
echo "Running migrations..."
psql -U postgres -d raven_studio -f src/config/schema.sql

# Create .env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "✓ Created .env file"
    echo "Please edit .env and set your database password"
fi

# Install npm packages
echo ""
echo "Installing Node.js dependencies..."
npm install

echo ""
echo "================================"
echo "✓ Setup complete!"
echo ""
echo "To start the server:"
echo "  npm run dev"
echo ""
echo "Open http://localhost:3000 in your browser"
echo ""