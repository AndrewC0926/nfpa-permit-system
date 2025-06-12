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

# Set environment variables for Org1
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/peers/peer0.org1.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/users/Admin@org1.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:7051
export ORDERER_CA="$BLOCKCHAIN_DIR/organizations/ordererOrganizations/permit.com/orderers/orderer.permit.com/msp/tlscacerts/tlsca.permit.com-cert.pem"

# Package chaincode
echo "Packaging chaincode..."
peer lifecycle chaincode package permitcontract.tar.gz \
    --path "$BLOCKCHAIN_DIR/chaincode" \
    --lang golang \
    --label permitcontract_1.0

# Install chaincode on Org1
echo "Installing chaincode on Org1..."
peer lifecycle chaincode install permitcontract.tar.gz

# Install chaincode on Org2
echo "Installing chaincode on Org2..."
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/peers/peer0.org2.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/users/Admin@org2.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:8051
peer lifecycle chaincode install permitcontract.tar.gz

# Get package ID
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep permitcontract_1.0 | awk '{print $3}' | sed 's/,//')

# Approve chaincode for Org1
echo "Approving chaincode for Org1..."
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/peers/peer0.org1.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/users/Admin@org1.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode approveformyorg \
    --package-id $PACKAGE_ID \
    --channelID permitchannel \
    --name permitcontract \
    --version 1.0 \
    --sequence 1 \
    --tls \
    --cafile "$ORDERER_CA"

# Approve chaincode for Org2
echo "Approving chaincode for Org2..."
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/peers/peer0.org2.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/users/Admin@org2.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:8051
peer lifecycle chaincode approveformyorg \
    --package-id $PACKAGE_ID \
    --channelID permitchannel \
    --name permitcontract \
    --version 1.0 \
    --sequence 1 \
    --tls \
    --cafile "$ORDERER_CA"

# Commit chaincode
echo "Committing chaincode..."
peer lifecycle chaincode commit \
    --channelID permitchannel \
    --name permitcontract \
    --version 1.0 \
    --sequence 1 \
    --tls \
    --cafile "$ORDERER_CA"

echo "Chaincode installation completed successfully!" 