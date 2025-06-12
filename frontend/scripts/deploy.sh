#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env.production ]; then
  source .env.production
fi

# Build the application
echo "Building application..."
npm run build

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod

# Verify deployment
echo "Verifying deployment..."
curl -s -o /dev/null -w "%{http_code}" https://nfpa-permit-system.vercel.app

# Run smoke tests
echo "Running smoke tests..."
npm run test:e2e

# Check Sentry integration
echo "Verifying Sentry integration..."
curl -s -o /dev/null -w "%{http_code}" https://sentry.io/api/0/projects/

# Check Google Analytics
echo "Verifying Google Analytics..."
curl -s -o /dev/null -w "%{http_code}" https://www.google-analytics.com/collect

echo "Deployment completed successfully!" 