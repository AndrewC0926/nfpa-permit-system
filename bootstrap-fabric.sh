#!/bin/bash
set -e

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Parse command line arguments
CLEAN=false
SKIP_REGISTER=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN=true
            shift
            ;;
        --skip-register)
            SKIP_REGISTER=true
            shift
            ;;
        *)
            log "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Environment variables
BLOCKCHAIN_DIR="$(pwd)/blockchain"
CHANNEL_NAME="mychannel"
CHAINCODE_NAME="permitContract"
CHAINCODE_VERSION="1.0"
CHAINCODE_SEQUENCE=1

# Clean up if requested
if [ "$CLEAN" = true ]; then
    log "Cleaning up existing identities and artifacts..."
    rm -rf "$BLOCKCHAIN_DIR/organizations"
    rm -rf "$BLOCKCHAIN_DIR/channel-artifacts"
    rm -rf "$BLOCKCHAIN_DIR/system-genesis-block"
    log "Cleanup complete"
fi

# Create required directories
log "Creating required directories..."
mkdir -p "$BLOCKCHAIN_DIR/channel-artifacts"
mkdir -p "$BLOCKCHAIN_DIR/system-genesis-block"

# Register and enroll identities
if [ "$SKIP_REGISTER" = false ]; then
    log "Registering and enrolling identities..."
    ./registerEnroll.sh
    if [ $? -ne 0 ]; then
        log "ERROR: Identity registration failed"
        exit 1
    fi
    log "Identity registration complete"
else
    log "Skipping identity registration"
fi

# Generate channel artifacts
log "Generating channel artifacts..."
export FABRIC_CFG_PATH="$BLOCKCHAIN_DIR"
configtxgen -profile PermitGenesis -channelID system-channel -outputBlock "$BLOCKCHAIN_DIR/channel-artifacts/genesis.block"
configtxgen -profile PermitChannel -channelID $CHANNEL_NAME -outputCreateChannelTx "$BLOCKCHAIN_DIR/channel-artifacts/channel.tx"
configtxgen -profile PermitChannel -channelID $CHANNEL_NAME -outputAnchorPeersUpdate "$BLOCKCHAIN_DIR/channel-artifacts/Org1MSPanchors.tx" -asOrg Org1MSP
configtxgen -profile PermitChannel -channelID $CHANNEL_NAME -outputAnchorPeersUpdate "$BLOCKCHAIN_DIR/channel-artifacts/Org2MSPanchors.tx" -asOrg Org2MSP
log "Channel artifacts generated"

# Create and join channel
log "Creating and joining channel..."
./channel-create.sh
if [ $? -ne 0 ]; then
    log "ERROR: Channel creation failed"
    exit 1
fi
log "Channel creation complete"

# Package chaincode
log "Packaging chaincode..."
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/peers/peer0.org1.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/users/Admin@org1.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode package "$CHAINCODE_NAME.tar.gz" \
    --path "$(pwd)/chaincode/permitContract" \
    --lang node \
    --label "$CHAINCODE_NAME_$CHAINCODE_VERSION"

# Install chaincode on peer0.org1
log "Installing chaincode on peer0.org1..."
peer lifecycle chaincode install "$CHAINCODE_NAME.tar.gz"
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "$CHAINCODE_NAME" | awk '{print $3}' | sed 's/,//')

# Install chaincode on peer0.org2
log "Installing chaincode on peer0.org2..."
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/peers/peer0.org2.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/users/Admin@org2.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:8051

peer lifecycle chaincode install "$CHAINCODE_NAME.tar.gz"

# Approve chaincode for org1
log "Approving chaincode for org1..."
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/peers/peer0.org1.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/users/Admin@org1.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode approveformyorg \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.permit.com \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --package-id $PACKAGE_ID \
    --sequence $CHAINCODE_SEQUENCE \
    --tls \
    --cafile "$BLOCKCHAIN_DIR/organizations/ordererOrganizations/permit.com/orderers/orderer.permit.com/msp/tlscacerts/tlsca.permit.com-cert.pem"

# Approve chaincode for org2
log "Approving chaincode for org2..."
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/peers/peer0.org2.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/users/Admin@org2.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:8051

peer lifecycle chaincode approveformyorg \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.permit.com \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --package-id $PACKAGE_ID \
    --sequence $CHAINCODE_SEQUENCE \
    --tls \
    --cafile "$BLOCKCHAIN_DIR/organizations/ordererOrganizations/permit.com/orderers/orderer.permit.com/msp/tlscacerts/tlsca.permit.com-cert.pem"

# Commit chaincode
log "Committing chaincode..."
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/peers/peer0.org1.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/users/Admin@org1.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode commit \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.permit.com \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --sequence $CHAINCODE_SEQUENCE \
    --tls \
    --cafile "$BLOCKCHAIN_DIR/organizations/ordererOrganizations/permit.com/orderers/orderer.permit.com/msp/tlscacerts/tlsca.permit.com-cert.pem"

log "Bootstrap complete! Network is ready for use." 