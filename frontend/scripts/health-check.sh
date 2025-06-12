#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env.production ]; then
  source .env.production
fi

# Check API health
echo "Checking API health..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${VITE_API_BASE_URL}/health)
if [ "$API_STATUS" != "200" ]; then
  echo "API health check failed with status $API_STATUS"
  exit 1
fi

# Check S3 access
echo "Checking S3 access..."
aws s3 ls s3://${VITE_S3_BUCKET} --summarize > /dev/null

# Check AI service
echo "Checking AI service..."
AI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${VITE_AI_SERVICE_URL}/health)
if [ "$AI_STATUS" != "200" ]; then
  echo "AI service health check failed with status $AI_STATUS"
  exit 1
fi

# Check blockchain explorer
echo "Checking blockchain explorer..."
EXPLORER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${VITE_BLOCKCHAIN_EXPLORER_URL}/health)
if [ "$EXPLORER_STATUS" != "200" ]; then
  echo "Blockchain explorer health check failed with status $EXPLORER_STATUS"
  exit 1
fi

# Check Sentry
echo "Checking Sentry..."
SENTRY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://sentry.io/api/0/projects/)
if [ "$SENTRY_STATUS" != "200" ]; then
  echo "Sentry health check failed with status $SENTRY_STATUS"
  exit 1
fi

# Check Google Analytics
echo "Checking Google Analytics..."
GA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://www.google-analytics.com/collect)
if [ "$GA_STATUS" != "204" ]; then
  echo "Google Analytics health check failed with status $GA_STATUS"
  exit 1
fi

echo "All health checks passed successfully!" 