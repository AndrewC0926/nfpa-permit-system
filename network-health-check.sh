#!/bin/bash
set -e

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Environment variables
CHANNEL_NAME="mychannel"
BLOCKCHAIN_DIR="$(pwd)/blockchain"
PEER0_ORG1_DIR="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com"
PEER0_ORG2_DIR="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com"
ORDERER_DIR="$BLOCKCHAIN_DIR/organizations/ordererOrganizations/permit.com"
CHAINCODE_NAME="permitContract"
CHAINCODE_VERSION="1.0"

# Check container status
log "Checking container status..."
for container in orderer peer0-org1 peer0-org2; do
    if ! docker ps | grep -q "$container"; then
        log "ERROR: Container $container is not running"
        exit 1
    fi
    log "Container $container is running"
done

# Check peer0.org1 chaincode installation
log "Checking chaincode installation on peer0.org1..."
export FABRIC_CFG_PATH="$BLOCKCHAIN_DIR"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$PEER0_ORG1_DIR/peers/peer0.org1.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$PEER0_ORG1_DIR/users/Admin@org1.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

if ! peer lifecycle chaincode queryinstalled | grep -q "$CHAINCODE_NAME:$CHAINCODE_VERSION"; then
    log "ERROR: Chaincode $CHAINCODE_NAME:$CHAINCODE_VERSION is not installed on peer0.org1"
    exit 1
fi
log "Chaincode is installed on peer0.org1"

# Check peer0.org2 chaincode installation
log "Checking chaincode installation on peer0.org2..."
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$PEER0_ORG2_DIR/peers/peer0.org2.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$PEER0_ORG2_DIR/users/Admin@org2.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:8051

if ! peer lifecycle chaincode queryinstalled | grep -q "$CHAINCODE_NAME:$CHAINCODE_VERSION"; then
    log "ERROR: Chaincode $CHAINCODE_NAME:$CHAINCODE_VERSION is not installed on peer0.org2"
    exit 1
fi
log "Chaincode is installed on peer0.org2"

# Check chaincode commitment
log "Checking chaincode commitment..."
if ! peer lifecycle chaincode querycommitted -C $CHANNEL_NAME | grep -q "$CHAINCODE_NAME:$CHAINCODE_VERSION"; then
    log "ERROR: Chaincode $CHAINCODE_NAME:$CHAINCODE_VERSION is not committed to channel $CHANNEL_NAME"
    exit 1
fi
log "Chaincode is committed to channel"

# Test chaincode query
log "Testing chaincode query..."
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$PEER0_ORG1_DIR/peers/peer0.org1.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$PEER0_ORG1_DIR/users/Admin@org1.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

peer chaincode query -C $CHANNEL_NAME -n $CHAINCODE_NAME -c '{"function":"GetAllPermits","args":[]}'

# Check backend connectivity
log "Checking backend connectivity..."
if ! curl -s http://localhost:3000/api/health | grep -q "ok"; then
    log "ERROR: Backend health check failed"
    exit 1
fi
log "Backend is healthy"

# Check backend-to-blockchain integration
log "Testing backend-to-blockchain integration..."
if ! curl -s http://localhost:3000/api/permits | grep -q "permits"; then
    log "ERROR: Backend cannot query blockchain"
    exit 1
fi
log "Backend can successfully query blockchain"

log "Network health check completed successfully!" 