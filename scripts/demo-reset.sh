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
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🧹 Starting NFPA Permit System Demo Reset"

# Stop all containers
echo "🛑 Stopping containers..."
docker-compose down

# Clean up volumes
echo "🗑️ Cleaning up volumes..."
docker volume rm nfpa-permit-system_mongodb_data
docker volume rm nfpa-permit-system_blockchain_data

# Clean up test data
echo "🧹 Cleaning up test data..."
rm -rf test/fixtures/*
rm -rf exports/*
rm -rf logs/*

# Reset blockchain network
echo "🔄 Resetting blockchain network..."
cd blockchain
./network.sh down
./network.sh up
cd ..

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run health checks
echo "🏥 Running health checks..."
./scripts/health-check.sh

# Create test fixtures
echo "📄 Creating test fixtures..."
mkdir -p test/fixtures

# Generate test PDFs
echo "📝 Generating test PDFs..."
cat > test/fixtures/errcs-specs.pdf << EOL
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
BT /F1 12 Tf 100 700 Td (ERRCS Specifications) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000111 00000 n
0000000212 00000 n
0000000299 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
406
%%EOF
EOL

cat > test/fixtures/floor-plans.pdf << EOL
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
BT /F1 12 Tf 100 700 Td (Floor Plans) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000111 00000 n
0000000212 00000 n
0000000299 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
406
%%EOF
EOL

cat > test/fixtures/revised-specs.pdf << EOL
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
BT /F1 12 Tf 100 700 Td (Revised ERRCS Specifications) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000111 00000 n
0000000212 00000 n
0000000299 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
406
%%EOF
EOL

# Create export directory
echo "📁 Creating export directory..."
mkdir -p exports

# Run demo seed
echo "🌱 Running demo seed..."
./scripts/demo-seed.sh

echo -e "${GREEN}✅ Demo environment reset successfully!${NC}"
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Check the audit log at exports/audit-log-demo.csv"
echo "2. View the permit in the frontend at http://localhost:5173"
echo "3. Check the blockchain explorer at http://localhost:8080" 