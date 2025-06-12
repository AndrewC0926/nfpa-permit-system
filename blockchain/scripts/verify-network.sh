#!/bin/bash
# Do not use sudo. All operations must run as a regular user.
if [[ $EUID -eq 0 ]]; then
  echo "ERROR: This script must NOT be run as root or with sudo. Exiting." >&2
  exit 1
fi
if command -v sudo >/dev/null 2>&1; then
  if sudo -n true 2>/dev/null; then
    echo "ERROR: Sudo is available, but this script must not use sudo. Exiting." >&2
    exit 1
  fi
fi
set -e

# Set paths
BLOCKCHAIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Function to check container health
check_container_health() {
    local container_name=$1
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "unknown")
    echo "Container $container_name health status: $health_status"
    if [ "$health_status" != "healthy" ] && [ "$health_status" != "starting" ]; then
        echo "Warning: Container $container_name is not healthy"
        return 1
    fi
    return 0
}

# Function to check container logs for errors
check_container_logs() {
    local container_name=$1
    echo "Checking logs for $container_name..."
    if docker logs "$container_name" 2>&1 | grep -iE "error|panic|failed|fatal"; then
        echo "Warning: Found errors in $container_name logs"
        return 1
    fi
    return 0
}

# Check if required containers are running
echo "Checking container status..."
containers=(
    "ca-orderer"
    "ca-org1"
    "ca-org2"
    "orderer.permit.com"
    "peer0.org1.permit.com"
    "peer0.org2.permit.com"
)

for container in "${containers[@]}"; do
    if ! docker ps | grep -q "$container"; then
        echo "Error: Container $container is not running"
        exit 1
    fi
    check_container_health "$container"
    check_container_logs "$container"
done

# Set environment variables for Org1
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/peers/peer0.org1.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/users/Admin@org1.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:7051
export ORDERER_CA="$BLOCKCHAIN_DIR/organizations/ordererOrganizations/permit.com/orderers/orderer.permit.com/msp/tlscacerts/tlsca.permit.com-cert.pem"

# Verify channel exists
echo "Verifying channel..."
if ! peer channel list | grep -q "permitchannel"; then
    echo "Error: Channel permitchannel not found"
    exit 1
fi

# Verify chaincode is committed
echo "Verifying chaincode..."
if ! peer lifecycle chaincode querycommitted --channelID permitchannel --name permitcontract; then
    echo "Error: Chaincode permitcontract not found on channel"
    exit 1
fi

# Test chaincode functionality
echo "Testing chaincode functionality..."

# Create a test permit
echo "Creating test permit..."
peer chaincode invoke \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.permit.com \
    --tls \
    --cafile "$ORDERER_CA" \
    -C permitchannel \
    -n permitcontract \
    -c '{"function":"CreatePermit","Args":["PERMIT001","Test Permit","Test Description","org1.permit.com"]}'

# Query the permit
echo "Querying test permit..."
peer chaincode query \
    -C permitchannel \
    -n permitcontract \
    -c '{"function":"GetPermit","Args":["PERMIT001"]}'

# Log a file hash
echo "Logging file hash..."
peer chaincode invoke \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.permit.com \
    --tls \
    --cafile "$ORDERER_CA" \
    -C permitchannel \
    -n permitcontract \
    -c '{"function":"LogFileHash","Args":["PERMIT001","test-file.pdf","abc123hash"]}'

# Update permit status
echo "Updating permit status..."
peer chaincode invoke \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.permit.com \
    --tls \
    --cafile "$ORDERER_CA" \
    -C permitchannel \
    -n permitcontract \
    -c '{"function":"UpdatePermitStatus","Args":["PERMIT001","APPROVED"]}'

# Get permit history
echo "Getting permit history..."
peer chaincode query \
    -C permitchannel \
    -n permitcontract \
    -c '{"function":"GetPermitHistory","Args":["PERMIT001"]}'

echo "Network verification completed successfully!" 