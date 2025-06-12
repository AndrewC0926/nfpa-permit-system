#!/bin/bash

# Fail fast if run as root or with sudo
if [ "$EUID" -eq 0 ]; then 
  echo "❌ Do not run as root or with sudo"
  exit 1
fi

# Load environment variables
source .env

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Starting NFPA Permit System Demo Seed"

# Create test users
echo "👥 Creating test users..."
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "inspector@city.gov",
    "password": "Test@123",
    "firstName": "John",
    "lastName": "Inspector",
    "role": "INSPECTOR",
    "organization": "City Fire Department"
  }'

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contractor@example.com",
    "password": "Test@123",
    "firstName": "Jane",
    "lastName": "Contractor",
    "role": "CONTRACTOR",
    "organization": "ABC Construction"
  }'

# Login and get tokens
echo "🔑 Logging in users..."
INSPECTOR_TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "inspector@city.gov",
    "password": "Test@123"
  }' | jq -r '.data.token')

CONTRACTOR_TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contractor@example.com",
    "password": "Test@123"
  }' | jq -r '.data.token')

# Create test permit
echo "📝 Creating test permit..."
PERMIT_ID=$(curl -X POST http://localhost:3000/api/permits \
  -H "Authorization: Bearer $CONTRACTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ERRCS",
    "property": {
      "address": "123 Main St",
      "type": "Commercial",
      "constructionType": "Type I-A",
      "floorsAboveGrade": 5,
      "floorsBelowGrade": 1,
      "squareFootage": 50000
    },
    "projectName": "Main Street Office Building",
    "description": "ERRCS system installation for new office building"
  }' | jq -r '.data.id')

# Upload test documents
echo "📄 Uploading test documents..."
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Authorization: Bearer $CONTRACTOR_TOKEN" \
  -F "permitId=$PERMIT_ID" \
  -F "file=@test/fixtures/errcs-specs.pdf" \
  -F "type=SPECIFICATION"

curl -X POST http://localhost:3000/api/documents/upload \
  -H "Authorization: Bearer $CONTRACTOR_TOKEN" \
  -F "permitId=$PERMIT_ID" \
  -F "file=@test/fixtures/floor-plans.pdf" \
  -F "type=FLOOR_PLAN"

# Submit for review
echo "📤 Submitting permit for review..."
curl -X POST http://localhost:3000/api/permits/$PERMIT_ID/submit \
  -H "Authorization: Bearer $CONTRACTOR_TOKEN"

# Trigger AI analysis
echo "🤖 Triggering AI analysis..."
curl -X POST http://localhost:3000/api/permits/$PERMIT_ID/analyze \
  -H "Authorization: Bearer $INSPECTOR_TOKEN"

# Simulate failed validation
echo "❌ Simulating failed validation..."
curl -X POST http://localhost:3000/api/permits/$PERMIT_ID/validate \
  -H "Authorization: Bearer $INSPECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "REJECTED",
    "comments": "Missing battery backup specifications and signal strength calculations"
  }'

# Upload revised documents
echo "📄 Uploading revised documents..."
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Authorization: Bearer $CONTRACTOR_TOKEN" \
  -F "permitId=$PERMIT_ID" \
  -F "file=@test/fixtures/revised-specs.pdf" \
  -F "type=SPECIFICATION"

# Resubmit for review
echo "📤 Resubmitting permit..."
curl -X POST http://localhost:3000/api/permits/$PERMIT_ID/submit \
  -H "Authorization: Bearer $CONTRACTOR_TOKEN"

# Final approval
echo "✅ Approving permit..."
curl -X POST http://localhost:3000/api/permits/$PERMIT_ID/approve \
  -H "Authorization: Bearer $INSPECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "comments": "All requirements met"
  }'

# Export audit trail
echo "📊 Exporting audit trail..."
curl -X GET http://localhost:3000/api/permits/$PERMIT_ID/audit/export \
  -H "Authorization: Bearer $INSPECTOR_TOKEN" \
  --output exports/audit-log-demo.csv

echo -e "${GREEN}✅ Demo data seeded successfully!${NC}"
echo "📝 Permit ID: $PERMIT_ID"
echo "🔑 Inspector Token: $INSPECTOR_TOKEN"
echo "🔑 Contractor Token: $CONTRACTOR_TOKEN" 