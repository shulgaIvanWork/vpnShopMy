#!/bin/bash

# MAX VPN Bot - Deployment Script
# Usage: chmod +x deploy.sh && ./deploy.sh

set -e

echo "🚀 MAX VPN Bot - Deployment Script"
echo "==================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker found: $(docker --version)"
echo "✅ Docker Compose found: $(docker-compose --version)"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating from .env.example..."
    cp .env.example .env
    echo "❌ Please edit .env file with your configuration and run this script again."
    echo "   nano .env"
    exit 1
fi

# Check if assets directory exists
if [ ! -d "assets" ]; then
    echo "📁 Creating assets directory..."
    mkdir -p assets
fi

# Check if instruction video exists
if [ ! -f "assets/instruction.mp4" ]; then
    echo "⚠️  Instruction video not found at assets/instruction.mp4"
    echo "   You can add it later and restart the bot."
fi

echo ""
echo "📦 Building Docker images..."
docker-compose build --no-cache

echo ""
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

echo ""
echo "📊 Service status:"
docker-compose ps

echo ""
echo "📝 Viewing bot logs (Ctrl+C to exit):"
docker-compose logs -f vpnbot
