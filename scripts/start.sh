#!/bin/bash

# WhatsApp Finance Bot Start Script

echo "🚀 Starting WhatsApp Finance Bot..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run setup.sh first."
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the bot
echo "🤖 Starting bot..."
npm start 