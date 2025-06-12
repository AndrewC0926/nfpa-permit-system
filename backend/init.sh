#!/bin/bash

set -e

# Fail if run as root or with sudo
if [ "$EUID" -eq 0 ]; then
  echo "❌ Do not run this script as root or with sudo. Exiting." >&2
  exit 1
fi
if [ -n "$SUDO_USER" ]; then
  echo "❌ Do not run this script with sudo. Exiting." >&2
  exit 1
fi

# Fail if any root-owned files exist in backend/ or logs/
if find . -path './node_modules' -prune -o -user root | grep -qv '^\./node_modules'; then
  echo "❌ Root-owned files detected in backend/. Please fix permissions. Exiting." >&2
  exit 1
fi
if [ -d logs ] && find logs -user root | grep -q .; then
  echo "❌ Root-owned files detected in logs/. Please fix permissions. Exiting." >&2
  exit 1
fi

# Create necessary directories
mkdir -p src/config src/models src/routes src/middleware src/utils src/tests logs

# Initialize package.json if it doesn't exist
if [ ! -f package.json ]; then
  npm init -y
fi

# Install production dependencies
npm install \
  express \
  cors \
  helmet \
  compression \
  express-rate-limit \
  body-parser \
  mongoose \
  bcryptjs \
  jsonwebtoken \
  otplib \
  winston \
  express-validator \
  dotenv

# Install development dependencies
npm install --save-dev \
  typescript \
  ts-node \
  nodemon \
  jest \
  ts-jest \
  supertest \
  @types/node \
  @types/express \
  @types/cors \
  @types/helmet \
  @types/compression \
  @types/body-parser \
  @types/mongoose \
  @types/bcryptjs \
  @types/jsonwebtoken \
  @types/jest \
  @types/supertest

# Create TypeScript configuration
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "*": ["node_modules/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Create Jest configuration
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node']
};
EOF

# Update package.json scripts
npm pkg set scripts.start="node dist/server.js"
npm pkg set scripts.dev="nodemon src/server.ts"
npm pkg set scripts.build="tsc"
npm pkg set scripts.test="jest"
npm pkg set scripts.test:watch="jest --watch"
npm pkg set scripts.test:coverage="jest --coverage"

# Create environment file template
cat > .env.example << 'EOF'
# Application
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/errcs-permits

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENCRYPTION_KEY=your-encryption-key-32-chars-long

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Build
dist/

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# Testing
coverage/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
EOF

# Make the script executable
chmod +x init.sh

echo "✅ Backend project initialized successfully!"
echo "Next steps:"
echo "1. Copy .env.example to .env and update the values"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Run 'npm test' to run the tests" 