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

# Check if required directories exist
for dir in "$PEER0_ORG1_DIR" "$PEER0_ORG2_DIR" "$ORDERER_DIR"; do
    if [ ! -d "$dir" ]; then
        log "ERROR: Required directory $dir does not exist"
        exit 1
    fi
done

# Create channel
log "Creating channel $CHANNEL_NAME..."
export FABRIC_CFG_PATH="$BLOCKCHAIN_DIR"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$PEER0_ORG1_DIR/peers/peer0.org1.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$PEER0_ORG1_DIR/users/Admin@org1.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

peer channel create -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.permit.com \
    -c $CHANNEL_NAME \
    -f "$BLOCKCHAIN_DIR/channel-artifacts/channel.tx" \
    --outputBlock "$BLOCKCHAIN_DIR/channel-artifacts/$CHANNEL_NAME.block" \
    --tls --cafile "$ORDERER_DIR/orderers/orderer.permit.com/msp/tlscacerts/tlsca.permit.com-cert.pem"

# Join peer0.org1 to channel
log "Joining peer0.org1 to channel $CHANNEL_NAME..."
peer channel join -b "$BLOCKCHAIN_DIR/channel-artifacts/$CHANNEL_NAME.block"

# Update anchor peer for org1
log "Updating anchor peer for org1..."
peer channel update -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.permit.com \
    -c $CHANNEL_NAME \
    -f "$BLOCKCHAIN_DIR/channel-artifacts/Org1MSPanchors.tx" \
    --tls --cafile "$ORDERER_DIR/orderers/orderer.permit.com/msp/tlscacerts/tlsca.permit.com-cert.pem"

# Join peer0.org2 to channel
log "Joining peer0.org2 to channel $CHANNEL_NAME..."
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$PEER0_ORG2_DIR/peers/peer0.org2.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$PEER0_ORG2_DIR/users/Admin@org2.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:8051

peer channel join -b "$BLOCKCHAIN_DIR/channel-artifacts/$CHANNEL_NAME.block"

# Update anchor peer for org2
log "Updating anchor peer for org2..."
peer channel update -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.permit.com \
    -c $CHANNEL_NAME \
    -f "$BLOCKCHAIN_DIR/channel-artifacts/Org2MSPanchors.tx" \
    --tls --cafile "$ORDERER_DIR/orderers/orderer.permit.com/msp/tlscacerts/tlsca.permit.com-cert.pem"

# Verify channel creation and peer joins
log "Verifying channel creation and peer joins..."
peer channel getinfo -c $CHANNEL_NAME

log "Channel creation and peer joins completed successfully!" 