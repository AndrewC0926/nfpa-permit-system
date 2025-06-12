#!/bin/bash

# Exit on error
set -e

echo "🌱 Seeding test data..."

# Create test users
echo "Creating test users..."
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contractor@test.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Contractor",
    "role": "contractor",
    "organization": "ABC Electrical"
  }'

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "inspector@test.com",
    "password": "password123",
    "firstName": "Sarah",
    "lastName": "Inspector",
    "role": "inspector",
    "organization": "City Fire Department"
  }'

# Create test permits
echo "Creating test permits..."
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/permits \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $(curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email": "contractor@test.com", "password": "password123"}' | jq -r '.token')" \
    -d "{
      \"projectName\": \"Test Project $i\",
      \"projectAddress\": \"123 Test St, City, State $i\",
      \"projectType\": \"commercial\",
      \"applicantName\": \"John Contractor\",
      \"applicantEmail\": \"contractor@test.com\",
      \"applicantPhone\": \"555-012$i\",
      \"description\": \"Test permit description $i\"
    }"
done

# Create test documents
echo "Creating test documents..."
mkdir -p test-documents

# Create sample PDFs
for i in {1..3}; do
  echo "Creating sample permit $i..."
  cat > "test-documents/sample-permit-$i.pdf" << EOF
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 100 700 Td (Sample Permit $i) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000111 00000 n
0000000212 00000 n
0000000277 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
364
%%EOF
EOF
done

# Upload test documents
echo "Uploading test documents..."
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/documents/upload \
    -H "Authorization: Bearer $(curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email": "contractor@test.com", "password": "password123"}' | jq -r '.token')" \
    -F "file=@test-documents/sample-permit-$i.pdf" \
    -F "permitId=$i"
done

# Create test comments
echo "Creating test comments..."
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/comments \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $(curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email": "inspector@test.com", "password": "password123"}' | jq -r '.token')" \
    -d "{
      \"permitId\": $i,
      \"content\": \"Test comment $i from inspector\"
    }"
done

# Create test audit logs
echo "Creating test audit logs..."
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/audit-logs \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $(curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email": "inspector@test.com", "password": "password123"}' | jq -r '.token')" \
    -d "{
      \"action\": \"PERMIT_CREATED\",
      \"entityType\": \"permit\",
      \"entityId\": $i,
      \"userId\": 1,
      \"details\": \"Test audit log $i\"
    }"
done

echo "✅ Test data seeding completed!" 