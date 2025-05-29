#!/bin/bash
echo "🚀 Deploying NFPA Enterprise System..."

# Set production environment
export NODE_ENV=production
export ENTERPRISE_MODE=true

# Start all services
pm2 start enhanced-web-server-v2.js --name "nfpa-main"
pm2 start application/backend/enterprise-gateway.js --name "enterprise-gateway"

echo "✅ Enterprise NFPA System deployed!"
echo "📊 Main System: http://localhost:3001"
echo "🏛️ Enterprise Gateway: http://localhost:4000"
echo "📈 Monitor: pm2 monit"
