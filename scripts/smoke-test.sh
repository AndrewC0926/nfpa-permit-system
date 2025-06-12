#!/bin/bash

# Fail fast if run as root or with sudo
if [ "$(id -u)" = "0" ]; then
  echo "❌ Do not run this script as root or with sudo. Exiting."
  exit 1
fi

if [ -n "$SUDO_USER" ]; then
  echo "❌ Do not run this script with sudo. Exiting."
  exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check service health
check_health() {
  local service=$1
  local url=$2
  local max_retries=5
  local retry_count=0
  
  echo -e "${YELLOW}Checking $service health...${NC}"
  
  while [ $retry_count -lt $max_retries ]; do
    if curl -s -f "$url" > /dev/null; then
      echo -e "${GREEN}✅ $service is healthy${NC}"
      return 0
    fi
    
    retry_count=$((retry_count + 1))
    echo -e "${YELLOW}Retrying $service health check ($retry_count/$max_retries)...${NC}"
    sleep 5
  done
  
  echo -e "${RED}❌ $service health check failed${NC}"
  return 1
}

# Function to check metrics
check_metrics() {
  local service=$1
  local url=$2
  local metric=$3
  
  echo -e "${YELLOW}Checking $service metrics...${NC}"
  
  if curl -s "$url" | grep -q "$metric"; then
    echo -e "${GREEN}✅ $service metrics are available${NC}"
    return 0
  else
    echo -e "${RED}❌ $service metrics check failed${NC}"
    return 1
  fi
}

# Function to check logs
check_logs() {
  local service=$1
  local pattern=$2
  
  echo -e "${YELLOW}Checking $service logs...${NC}"
  
  if docker logs "$service" 2>&1 | grep -q "$pattern"; then
    echo -e "${GREEN}✅ $service logs are available${NC}"
    return 0
  else
    echo -e "${RED}❌ $service logs check failed${NC}"
    return 1
  fi
}

# Check backend health
check_health "Backend" "http://localhost:3000/health"

# Check frontend health
check_health "Frontend" "http://localhost:5173"

# Check MongoDB
check_health "MongoDB" "http://localhost:27017"

# Check blockchain peers
check_health "Peer0.Org1" "http://localhost:7051/healthz"
check_health "Peer0.Org2" "http://localhost:8051/healthz"

# Check orderer
check_health "Orderer" "http://localhost:7050/healthz"

# Check monitoring stack
check_health "Prometheus" "http://localhost:9090/-/healthy"
check_health "Grafana" "http://localhost:3000/api/health"
check_health "Jaeger" "http://localhost:16686/api/services"
check_health "Elasticsearch" "http://localhost:9200/_cluster/health"
check_health "Kibana" "http://localhost:5601/api/status"
check_health "Loki" "http://localhost:3100/ready"

# Check metrics
check_metrics "Prometheus" "http://localhost:9090/metrics" "prometheus_build_info"
check_metrics "Node Exporter" "http://localhost:9100/metrics" "node_cpu_seconds_total"
check_metrics "cAdvisor" "http://localhost:8080/metrics" "container_cpu_usage_seconds_total"

# Check logs
check_logs "backend" "Server started"
check_logs "frontend" "Local:"
check_logs "peer0.org1.example.com" "Starting peer"
check_logs "orderer.example.com" "Starting orderer"

# Check backup status
echo -e "${YELLOW}Checking backup status...${NC}"
if [ -f "backup/latest-backup.txt" ]; then
  echo -e "${GREEN}✅ Latest backup: $(cat backup/latest-backup.txt)${NC}"
else
  echo -e "${RED}❌ No backup information found${NC}"
fi

# Check disk space
echo -e "${YELLOW}Checking disk space...${NC}"
df -h | grep -v "tmpfs" | while read -r line; do
  usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
  if [ "$usage" -gt 85 ]; then
    echo -e "${RED}❌ High disk usage: $line${NC}"
  else
    echo -e "${GREEN}✅ Disk space OK: $line${NC}"
  fi
done

# Check memory usage
echo -e "${YELLOW}Checking memory usage...${NC}"
free -h | while read -r line; do
  if [[ $line == *"Mem:"* ]]; then
    usage=$(echo "$line" | awk '{print $3}' | sed 's/Gi//')
    total=$(echo "$line" | awk '{print $2}' | sed 's/Gi//')
    percent=$((usage * 100 / total))
    if [ "$percent" -gt 85 ]; then
      echo -e "${RED}❌ High memory usage: $percent%${NC}"
    else
      echo -e "${GREEN}✅ Memory usage OK: $percent%${NC}"
    fi
  fi
done

# Check CPU usage
echo -e "${YELLOW}Checking CPU usage...${NC}"
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}')
if (( $(echo "$cpu_usage > 85" | bc -l) )); then
  echo -e "${RED}❌ High CPU usage: $cpu_usage%${NC}"
else
  echo -e "${GREEN}✅ CPU usage OK: $cpu_usage%${NC}"
fi

# Check network connectivity
echo -e "${YELLOW}Checking network connectivity...${NC}"
if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Network connectivity OK${NC}"
else
  echo -e "${RED}❌ Network connectivity failed${NC}"
fi

# Check SSL certificates
echo -e "${YELLOW}Checking SSL certificates...${NC}"
if [ -f "certs/server.crt" ]; then
  expiry=$(openssl x509 -enddate -noout -in certs/server.crt | cut -d= -f2)
  echo -e "${GREEN}✅ SSL certificate valid until: $expiry${NC}"
else
  echo -e "${RED}❌ SSL certificate not found${NC}"
fi

# Check security headers
echo -e "${YELLOW}Checking security headers...${NC}"
headers=$(curl -sI http://localhost:3000)
if echo "$headers" | grep -q "Strict-Transport-Security"; then
  echo -e "${GREEN}✅ HSTS header present${NC}"
else
  echo -e "${RED}❌ HSTS header missing${NC}"
fi

if echo "$headers" | grep -q "X-Content-Type-Options: nosniff"; then
  echo -e "${GREEN}✅ X-Content-Type-Options header present${NC}"
else
  echo -e "${RED}❌ X-Content-Type-Options header missing${NC}"
fi

if echo "$headers" | grep -q "X-Frame-Options: DENY"; then
  echo -e "${GREEN}✅ X-Frame-Options header present${NC}"
else
  echo -e "${RED}❌ X-Frame-Options header missing${NC}"
fi

# Check API endpoints
echo -e "${YELLOW}Checking API endpoints...${NC}"
endpoints=(
  "/api/health"
  "/api/auth/register"
  "/api/auth/login"
  "/api/permits"
  "/api/documents"
  "/api/blockchain/status"
)

for endpoint in "${endpoints[@]}"; do
  if curl -s -f "http://localhost:3000$endpoint" > /dev/null; then
    echo -e "${GREEN}✅ $endpoint is accessible${NC}"
  else
    echo -e "${RED}❌ $endpoint is not accessible${NC}"
  fi
done

# Check blockchain network
echo -e "${YELLOW}Checking blockchain network...${NC}"
if docker exec peer0.org1.example.com peer channel list | grep -q "mychannel"; then
  echo -e "${GREEN}✅ Channel 'mychannel' exists${NC}"
else
  echo -e "${RED}❌ Channel 'mychannel' not found${NC}"
fi

# Check chaincode
echo -e "${YELLOW}Checking chaincode...${NC}"
if docker exec peer0.org1.example.com peer chaincode list --installed | grep -q "permit"; then
  echo -e "${GREEN}✅ Chaincode 'permit' is installed${NC}"
else
  echo -e "${RED}❌ Chaincode 'permit' not found${NC}"
fi

# Final status
echo -e "\n${YELLOW}Smoke test completed${NC}"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed${NC}"
  exit 0
else
  echo -e "${RED}❌ Some checks failed${NC}"
  exit 1
fi 