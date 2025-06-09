#!/bin/bash

# NFPA Permit System Organization Script
# This script organizes your existing files into proper structure

set -e

echo "🔧 Organizing NFPA Permit System..."

# Create proper directory structure
mkdir -p backend/{routes,services,middleware,utils,chaincode}
mkdir -p frontend/src/{components,pages,services,utils}
mkdir -p fabric-network/{configtx,organizations,scripts}
mkdir -p scripts
mkdir -p docs
mkdir -p docker

# Move files to proper locations
echo "📁 Moving backend files..."
if [ -f "enhanced-ai-server.js" ]; then
    mv enhanced-ai-server.js backend/server.js
fi

# If you have other JavaScript files, move them appropriately
find . -maxdepth 1 -name "*.js" -not -path "./backend/*" -not -path "./frontend/*" -exec mv {} backend/ \;

# Move shell scripts to scripts directory
echo "📁 Moving scripts..."
mv *.sh scripts/ 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true

# Create package.json for backend if it doesn't exist
echo "📦 Creating backend package.json..."
cat > backend/package.json << 'EOF'
{
  "name": "nfpa-permit-backend",
  "version": "1.0.0",
  "description": "NFPA Fire Safety Permit Management System - Backend API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "fabric-network": "^2.2.20",
    "fabric-ca-client": "^2.2.20",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.2"
  },
  "keywords": ["nfpa", "fire-safety", "permits", "blockchain", "hyperledger-fabric"],
  "author": "NFPA Permit System",
  "license": "MIT"
}
EOF

# Create environment template
echo "🔧 Creating environment template..."
cat > backend/.env.example << 'EOF'
# NFPA Permit System Configuration

# Application
NODE_ENV=development
PORT=3001
API_VERSION=v1

# Hyperledger Fabric
FABRIC_NETWORK_PATH=../fabric-network
FABRIC_WALLET_PATH=./wallet
CHANNEL_NAME=mychannel
CHAINCODE_NAME=nfpaPermit

# Security
JWT_SECRET=your-super-secure-jwt-secret-change-in-production
SESSION_SECRET=your-super-secure-session-secret

# Database (CouchDB)
COUCHDB_URL=http://localhost:5984
COUCHDB_USERNAME=admin
COUCHDB_PASSWORD=adminpw

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/nfpa-system.log

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
EOF

# Create Docker Compose for development
echo "🐳 Creating Docker configuration..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # NFPA Backend API
  nfpa-backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - PORT=3001
    volumes:
      - ./backend:/app
      - ./fabric-network:/app/fabric-network
    depends_on:
      - couchdb
    networks:
      - nfpa-network

  # CouchDB for state database
  couchdb:
    image: couchdb:3.3
    environment:
      - COUCHDB_USER=admin
      - COUCHDB_PASSWORD=adminpw
    ports:
      - "5984:5984"
    volumes:
      - couchdb-data:/opt/couchdb/data
    networks:
      - nfpa-network

  # NFPA Frontend (if using)
  nfpa-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - nfpa-backend
    networks:
      - nfpa-network

volumes:
  couchdb-data:

networks:
  nfpa-network:
    driver: bridge
EOF

# Create production Docker Compose
echo "🏭 Creating production Docker configuration..."
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  # NFPA Backend API - Production
  nfpa-backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    volumes:
      - ./fabric-network:/app/fabric-network:ro
      - nfpa-logs:/app/logs
    restart: unless-stopped
    networks:
      - nfpa-network

  # Production CouchDB
  couchdb:
    image: couchdb:3.3
    environment:
      - COUCHDB_USER=admin
      - COUCHDB_PASSWORD=${COUCHDB_PASSWORD:-secure-password-change-me}
    ports:
      - "5984:5984"
    volumes:
      - couchdb-data:/opt/couchdb/data
    restart: unless-stopped
    networks:
      - nfpa-network

  # NGINX Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - nfpa-backend
    restart: unless-stopped
    networks:
      - nfpa-network

  # Monitoring (optional)
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    networks:
      - nfpa-network

volumes:
  couchdb-data:
  nfpa-logs:

networks:
  nfpa-network:
    driver: bridge
EOF

# Create backend Dockerfile
echo "🐳 Creating backend Dockerfile..."
cat > backend/Dockerfile << 'EOF'
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["npm", "start"]
EOF

# Create production Dockerfile
cat > backend/Dockerfile.prod << 'EOF'
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nfpa -u 1001

# Create directories and set permissions
RUN mkdir -p logs wallet uploads && \
    chown -R nfpa:nodejs /app

# Switch to non-root user
USER nfpa

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["npm", "start"]
EOF

# Create .gitignore
echo "📝 Creating .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env
.env.local
.env.production
.env.*.local

# Logs
logs/
*.log

# Blockchain artifacts
fabric-network/organizations/
fabric-network/channel-artifacts/
fabric-network/system-genesis-block/

# Wallets and certificates
backend/wallet/
*.pem
*.key
*.crt

# Uploads
backend/uploads/

# Build outputs
dist/
build/
.next/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker
.docker/

# Temporary files
*.tmp
*.temp
EOF

# Create basic README
echo "📚 Creating README..."
cat > README.md << 'EOF'
# 🏛️ NFPA Fire Safety Permit Management System

Enterprise blockchain-based permit management system for fire safety compliance.

## Quick Start

```bash
# Install dependencies
cd backend && npm install

# Start development environment
docker-compose up -d

# Initialize the system
cd backend && npm start
```

## Features

- NFPA 72/13/25 compliance
- Blockchain-based audit trails
- Multi-organization workflow
- Government-ready deployment

## Documentation

- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Architecture Overview](docs/ARCHITECTURE.md)

## License

MIT License - See [LICENSE](LICENSE) for details.
EOF

echo "✅ NFPA Permit System organized successfully!"
echo ""
echo "📁 Project structure:"
echo "  backend/           - Express.js API server"
echo "  frontend/          - Web application"
echo "  fabric-network/    - Hyperledger Fabric configuration"
echo "  scripts/           - Setup and utility scripts"
echo "  docs/              - Documentation"
echo "  docker/            - Docker configurations"
echo ""
echo "🚀 Next steps:"
echo "  1. cd backend && npm install"
echo "  2. docker-compose up -d"
echo "  3. npm start"
