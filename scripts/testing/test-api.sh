#!/bin/bash

echo "🧪 Testing NFPA Permit System API..."

API_BASE="http://localhost:3001"

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s $API_BASE/health | jq . || echo "❌ Health check failed"

# Test system status
echo "2. Testing system status..."
curl -s $API_BASE/api/status | jq . || echo "❌ Status check failed"

# Test permit creation
echo "3. Testing permit creation..."
curl -s -X POST $API_BASE/api/permits \
  -H "Content-Type: application/json" \
  -d '{
    "applicantInfo": {
      "name": "Test Fire Protection Co.",
      "email": "test@fireprotection.com",
      "phone": "555-0123"
    },
    "projectDetails": {
      "type": "NFPA72_COMMERCIAL",
      "address": "123 Test Street, Test City",
      "description": "Test fire alarm system installation"
    }
  }' | jq . || echo "❌ Permit creation failed"

# Test get permits
echo "4. Testing get permits..."
curl -s $API_BASE/api/permits | jq . || echo "❌ Get permits failed"

# Test admin dashboard
echo "5. Testing admin dashboard..."
curl -s $API_BASE/api/admin/dashboard | jq . || echo "❌ Dashboard test failed"

echo "✅ API testing completed!"
