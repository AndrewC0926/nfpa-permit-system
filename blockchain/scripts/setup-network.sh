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

echo "Setting up Hyperledger Fabric network..."

# Set paths
BLOCKCHAIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Blockchain directory: $BLOCKCHAIN_DIR"
echo "Scripts directory: $SCRIPTS_DIR"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Determine which docker compose command to use
if command_exists docker-compose; then
    DOCKER_COMPOSE="docker-compose"
elif command_exists docker && docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    echo "Error: Neither docker-compose nor docker compose is available"
    exit 1
fi

# Create directories
mkdir -p "$BLOCKCHAIN_DIR/bin"
mkdir -p "$BLOCKCHAIN_DIR/crypto-config"
mkdir -p $(pwd)/blockchain/channel-artifacts
mkdir -p "$BLOCKCHAIN_DIR/organizations/ordererOrganizations/permit.com/orderers/orderer.permit.com/msp"
mkdir -p "$BLOCKCHAIN_DIR/organizations/ordererOrganizations/permit.com/orderers/orderer.permit.com/tls"
mkdir -p "$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/peers/peer0.org1.permit.com/msp"
mkdir -p "$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/peers/peer0.org1.permit.com/tls"
mkdir -p "$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/users/Admin@org1.permit.com/msp"
mkdir -p "$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/peers/peer0.org2.permit.com/msp"
mkdir -p "$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/peers/peer0.org2.permit.com/tls"
mkdir -p "$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/users/Admin@org2.permit.com/msp"

# Download and install Fabric binaries if not present
if [ ! -f "$BLOCKCHAIN_DIR/bin/cryptogen" ]; then
  echo "Downloading Fabric binaries..."
  cd "$BLOCKCHAIN_DIR"
  curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.4.1 1.5.5
  cp -r fabric-samples/bin/* "$BLOCKCHAIN_DIR/bin/"
  rm -rf fabric-samples
fi

# Stop any running containers
echo "Stopping any running containers..."
$DOCKER_COMPOSE -f "$BLOCKCHAIN_DIR/docker-compose-test-net.yaml" down -v

# Generate crypto material
echo "Generating crypto material..."
"$BLOCKCHAIN_DIR/scripts/generate-crypto.sh"

# Create Docker network if it doesn't exist
echo "Creating Docker network..."
docker network create permit-network || true

# Generate channel artifacts
echo "Generating channel artifacts..."
configtxgen -profile PermitGenesis -channelID system-channel -outputBlock $(pwd)/blockchain/channel-artifacts/genesis.block
configtxgen -profile PermitChannel -channelID permitchannel -outputCreateChannelTx $(pwd)/blockchain/channel-artifacts/channel.tx
configtxgen -profile PermitChannel -channelID permitchannel -outputAnchorPeersUpdate $(pwd)/blockchain/channel-artifacts/Org1MSPanchors.tx -asOrg Org1MSP
configtxgen -profile PermitChannel -channelID permitchannel -outputAnchorPeersUpdate $(pwd)/blockchain/channel-artifacts/Org2MSPanchors.tx -asOrg Org2MSP

# Start the network
echo "Starting the network..."
$DOCKER_COMPOSE -f "$BLOCKCHAIN_DIR/docker-compose-test-net.yaml" up -d

# Wait for containers to start
echo "Waiting for containers to start..."
sleep 10

# Set environment variables for Org1
export PATH="$BLOCKCHAIN_DIR/bin:$PATH"
export FABRIC_CFG_PATH="$BLOCKCHAIN_DIR"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/peers/peer0.org1.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/users/Admin@org1.permit.com/msp"
export CORE_PEER_ADDRESS=peer0.org1.permit.com:7051
export ORDERER_CA="$BLOCKCHAIN_DIR/organizations/ordererOrganizations/permit.com/orderers/orderer.permit.com/msp/tlscacerts/tlsca.permit.com-cert.pem"

# Wait for orderer to be ready
until docker logs orderer.permit.com 2>&1 | grep -q "Starting orderer"; do
    echo "Waiting for orderer to start..."
    sleep 2
done

# Create channel
echo "Creating channel..."
peer channel create \
    -o orderer.permit.com:7050 \
    -c permitchannel \
    -f "$BLOCKCHAIN_DIR/channel-artifacts/channel.tx" \
    --tls \
    --cafile "$ORDERER_CA"

# Join Org1 peer to channel
echo "Joining Org1 peer to channel..."
peer channel join -b "$BLOCKCHAIN_DIR/permitchannel.block"

# Update anchor peer for Org1
echo "Updating anchor peer for Org1..."
peer channel update \
    -o orderer.permit.com:7050 \
    -c permitchannel \
    -f "$BLOCKCHAIN_DIR/channel-artifacts/Org1MSPanchors.tx" \
    --tls \
    --cafile "$ORDERER_CA"

# Set environment variables for Org2
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/peers/peer0.org2.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/users/Admin@org2.permit.com/msp"
export CORE_PEER_ADDRESS=peer0.org2.permit.com:8051

# Join Org2 peer to channel
echo "Joining Org2 peer to channel..."
peer channel join -b "$BLOCKCHAIN_DIR/permitchannel.block"

# Update anchor peer for Org2
echo "Updating anchor peer for Org2..."
peer channel update \
    -o orderer.permit.com:7050 \
    -c permitchannel \
    -f "$BLOCKCHAIN_DIR/channel-artifacts/Org2MSPanchors.tx" \
    --tls \
    --cafile "$ORDERER_CA"

# Verify channel creation
echo "Verifying channel creation..."
peer channel list

# Verify peer channel membership
echo "Verifying peer channel membership..."
peer channel getinfo -c permitchannel

echo "Network setup completed successfully!" 