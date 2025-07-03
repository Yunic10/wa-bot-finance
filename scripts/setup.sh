#!/bin/bash

# WhatsApp Finance Bot Setup Script
# This script will help you set up the bot for the first time

set -e

echo "🤖 WhatsApp Finance Bot Setup"
echo "=============================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL is not installed. Please install MySQL first."
    echo "   You can use Docker: docker run --name mysql -e MYSQL_ROOT_PASSWORD=password -d mysql:8.0"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ MySQL is installed"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file..."
    cp env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
else
    echo "✅ .env file already exists"
fi

# Create database setup
echo "🗄️  Setting up database..."
if [ -f database/setup.sql ]; then
    echo "✅ Database setup script exists"
else
    echo "❌ Database setup script not found"
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p src/.wwebjs_auth

# Set permissions
echo "🔐 Setting permissions..."
chmod +x scripts/setup.sh
chmod +x scripts/start.sh
chmod +x scripts/stop.sh

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your database configuration"
echo "2. Create MySQL database: CREATE DATABASE wa_finance_bot;"
echo "3. Run the bot: npm run dev"
echo "4. Scan QR code with WhatsApp Web"
echo ""
echo "📚 For more information, see README.md" 