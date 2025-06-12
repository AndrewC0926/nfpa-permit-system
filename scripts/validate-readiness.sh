#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Starting Production Readiness Validation..."

# Check environment variables
echo -e "\n${YELLOW}Checking environment variables...${NC}"
required_vars=(
  "VITE_API_BASE_URL"
  "VITE_S3_BUCKET"
  "VITE_AI_SERVICE_URL"
  "VITE_BLOCKCHAIN_EXPLORER_URL"
  "VITE_SENTRY_DSN"
  "VITE_GA_TRACKING_ID"
  "MONGODB_URI"
  "JWT_SECRET"
  "JWT_REFRESH_SECRET"
  "AWS_ACCESS_KEY_ID"
  "AWS_SECRET_ACCESS_KEY"
  "AWS_REGION"
  "BLOCKCHAIN_NETWORK_CONFIG"
)

missing_vars=0
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}❌ Missing required environment variable: $var${NC}"
    missing_vars=1
  else
    echo -e "${GREEN}✅ Found $var${NC}"
  fi
done

if [ $missing_vars -eq 1 ]; then
  echo -e "${RED}❌ Missing required environment variables${NC}"
  exit 1
fi

# Check security configurations
echo -e "\n${YELLOW}Checking security configurations...${NC}"

# Check SSL certificates
if [ -f "/etc/ssl/certs/nfpa-permit-system.crt" ]; then
  echo -e "${GREEN}✅ SSL certificate found${NC}"
  openssl x509 -in /etc/ssl/certs/nfpa-permit-system.crt -noout -dates
else
  echo -e "${RED}❌ SSL certificate not found${NC}"
  exit 1
fi

# Check security headers
echo -e "\n${YELLOW}Checking security headers...${NC}"
headers=$(curl -sI https://nfpa-permit-system.vercel.app)
required_headers=(
  "Strict-Transport-Security"
  "X-Content-Type-Options"
  "X-Frame-Options"
  "X-XSS-Protection"
  "Content-Security-Policy"
  "Referrer-Policy"
)

for header in "${required_headers[@]}"; do
  if echo "$headers" | grep -q "$header"; then
    echo -e "${GREEN}✅ Found $header${NC}"
  else
    echo -e "${RED}❌ Missing $header${NC}"
    exit 1
  fi
done

# Check monitoring
echo -e "\n${YELLOW}Checking monitoring...${NC}"

# Check Sentry
if curl -s https://sentry.io/api/0/projects/ | grep -q "nfpa-permit-system"; then
  echo -e "${GREEN}✅ Sentry project configured${NC}"
else
  echo -e "${RED}❌ Sentry project not configured${NC}"
  exit 1
fi

# Check Prometheus
if curl -s http://localhost:9090/-/healthy | grep -q "OK"; then
  echo -e "${GREEN}✅ Prometheus healthy${NC}"
else
  echo -e "${RED}❌ Prometheus not healthy${NC}"
  exit 1
fi

# Check Grafana
if curl -s http://localhost:3000/api/health | grep -q "ok"; then
  echo -e "${GREEN}✅ Grafana healthy${NC}"
else
  echo -e "${RED}❌ Grafana not healthy${NC}"
  exit 1
fi

# Check backups
echo -e "\n${YELLOW}Checking backups...${NC}"

# Check MongoDB backup
if aws s3 ls s3://${VITE_S3_BUCKET}-backups/mongodb/ | grep -q "$(date +%Y%m%d)"; then
  echo -e "${GREEN}✅ MongoDB backup found for today${NC}"
else
  echo -e "${RED}❌ MongoDB backup not found for today${NC}"
  exit 1
fi

# Check S3 backup
if aws s3 ls s3://${VITE_S3_BUCKET}-backups/s3/ | grep -q "$(date +%Y%m%d)"; then
  echo -e "${GREEN}✅ S3 backup found for today${NC}"
else
  echo -e "${RED}❌ S3 backup not found for today${NC}"
  exit 1
fi

# Check blockchain backup
if aws s3 ls s3://${VITE_S3_BUCKET}-backups/blockchain/ | grep -q "$(date +%Y%m%d)"; then
  echo -e "${GREEN}✅ Blockchain backup found for today${NC}"
else
  echo -e "${RED}❌ Blockchain backup not found for today${NC}"
  exit 1
fi

# Test recovery procedures
echo -e "\n${YELLOW}Testing recovery procedures...${NC}"

# Test MongoDB restore
echo "Testing MongoDB restore..."
./scripts/restore.sh mongodb-$(date +%Y%m%d).tar.gz
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ MongoDB restore successful${NC}"
else
  echo -e "${RED}❌ MongoDB restore failed${NC}"
  exit 1
fi

# Test S3 restore
echo "Testing S3 restore..."
./scripts/restore.sh s3-$(date +%Y%m%d).tar.gz
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ S3 restore successful${NC}"
else
  echo -e "${RED}❌ S3 restore failed${NC}"
  exit 1
fi

# Test blockchain restore
echo "Testing blockchain restore..."
./scripts/restore.sh blockchain-$(date +%Y%m%d).tar.gz
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Blockchain restore successful${NC}"
else
  echo -e "${RED}❌ Blockchain restore failed${NC}"
  exit 1
fi

# Check log rotation
echo -e "\n${YELLOW}Checking log rotation...${NC}"
if [ -f "/var/log/nfpa-permit-system/app.log.1" ]; then
  echo -e "${GREEN}✅ Log rotation configured${NC}"
else
  echo -e "${RED}❌ Log rotation not configured${NC}"
  exit 1
fi

# Check CI/CD
echo -e "\n${YELLOW}Checking CI/CD...${NC}"
if [ -f ".github/workflows/deploy.yml" ]; then
  echo -e "${GREEN}✅ GitHub Actions workflow found${NC}"
else
  echo -e "${RED}❌ GitHub Actions workflow not found${NC}"
  exit 1
fi

# Check Vercel deployment
echo -e "\n${YELLOW}Checking Vercel deployment...${NC}"
if vercel ls | grep -q "nfpa-permit-system"; then
  echo -e "${GREEN}✅ Vercel project found${NC}"
else
  echo -e "${RED}❌ Vercel project not found${NC}"
  exit 1
fi

# Check AWS deployment
echo -e "\n${YELLOW}Checking AWS deployment...${NC}"
if aws ecs describe-services --cluster nfpa-permit-system --services backend frontend | grep -q "ACTIVE"; then
  echo -e "${GREEN}✅ AWS ECS services running${NC}"
else
  echo -e "${RED}❌ AWS ECS services not running${NC}"
  exit 1
fi

# Check CloudFront
if aws cloudfront list-distributions | grep -q "nfpa-permit-system"; then
  echo -e "${GREEN}✅ CloudFront distribution found${NC}"
else
  echo -e "${RED}❌ CloudFront distribution not found${NC}"
  exit 1
fi

# Final health check
echo -e "\n${YELLOW}Performing final health check...${NC}"
if curl -s https://nfpa-permit-system.vercel.app/health | grep -q "ok"; then
  echo -e "${GREEN}✅ Application healthy${NC}"
else
  echo -e "${RED}❌ Application not healthy${NC}"
  exit 1
fi

echo -e "\n${GREEN}✅ Production Readiness Validation Completed Successfully!${NC}" 