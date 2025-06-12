#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env.production ]; then
  source .env.production
fi

# Create test users
echo "Creating test users..."
curl -X POST ${VITE_API_BASE_URL}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!",
    "role": "admin"
  }'

curl -X POST ${VITE_API_BASE_URL}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "inspector@example.com",
    "password": "Inspector123!",
    "role": "inspector"
  }'

curl -X POST ${VITE_API_BASE_URL}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "applicant@example.com",
    "password": "Applicant123!",
    "role": "applicant"
  }'

# Create test permits
echo "Creating test permits..."
for i in {1..5}; do
  curl -X POST ${VITE_API_BASE_URL}/api/permits \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $(curl -X POST ${VITE_API_BASE_URL}/api/auth/login -H "Content-Type: application/json" -d '{"email": "applicant@example.com", "password": "Applicant123!"}' | jq -r '.token')" \
    -d "{
      \"projectName\": \"Test Project $i\",
      \"projectAddress\": \"123 Test St, City, State $i\",
      \"projectType\": \"commercial\",
      \"applicantName\": \"Test Applicant $i\",
      \"applicantEmail\": \"applicant@example.com\",
      \"applicantPhone\": \"555-012$i\",
      \"description\": \"Test permit description $i\"
    }"
done

# Upload test documents
echo "Uploading test documents..."
for i in {1..5}; do
  curl -X POST ${VITE_API_BASE_URL}/api/documents/upload \
    -H "Authorization: Bearer $(curl -X POST ${VITE_API_BASE_URL}/api/auth/login -H "Content-Type: application/json" -d '{"email": "applicant@example.com", "password": "Applicant123!"}' | jq -r '.token')" \
    -F "file=@test-documents/sample-permit-$i.pdf" \
    -F "permitId=$i"
done

# Create test comments
echo "Creating test comments..."
for i in {1..5}; do
  curl -X POST ${VITE_API_BASE_URL}/api/comments \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $(curl -X POST ${VITE_API_BASE_URL}/api/auth/login -H "Content-Type: application/json" -d '{"email": "inspector@example.com", "password": "Inspector123!"}' | jq -r '.token')" \
    -d "{
      \"permitId\": $i,
      \"content\": \"Test comment $i from inspector\"
    }"
done

# Create test audit logs
echo "Creating test audit logs..."
for i in {1..5}; do
  curl -X POST ${VITE_API_BASE_URL}/api/audit-logs \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $(curl -X POST ${VITE_API_BASE_URL}/api/auth/login -H "Content-Type: application/json" -d '{"email": "admin@example.com", "password": "Admin123!"}' | jq -r '.token')" \
    -d "{
      \"action\": \"PERMIT_CREATED\",
      \"entityType\": \"permit\",
      \"entityId\": $i,
      \"userId\": 1,
      \"details\": \"Test audit log $i\"
    }"
done

echo "Test data seeding completed successfully!" 