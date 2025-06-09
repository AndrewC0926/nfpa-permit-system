#!/bin/bash

echo "🏭 Deploying NFPA Permit System - Production"

# Create production environment file if it doesn't exist
if [ ! -f backend/.env.production ]; then
    echo "⚠️  Creating production environment file..."
    cp backend/.env.example backend/.env.production
    echo "🔧 Please configure backend/.env.production before continuing"
    exit 1
fi

# Build and start production services
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Wait for services
echo "⏳ Waiting for production services..."
sleep 60

# Health check
curl -f http://localhost/health || {
    echo "❌ Production deployment failed - health check failed"
    exit 1
}

echo "✅ Production deployment completed!"
echo "🌐 System is live and ready for government use"
