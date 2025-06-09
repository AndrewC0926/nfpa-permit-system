#!/bin/bash

echo "🚀 Deploying NFPA Permit System - Development"

# Build and start services
docker-compose build
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Test the deployment
./scripts/testing/test-api.sh

echo "✅ Development deployment completed!"
echo "🌐 Access the system:"
echo "  • API: http://localhost:3001"
echo "  • Health: http://localhost:3001/health"
echo "  • Docs: http://localhost:3001/api-docs"
