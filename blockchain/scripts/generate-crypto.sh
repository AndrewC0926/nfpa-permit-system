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

# Clean up existing crypto material
echo "Cleaning up existing crypto material..."
rm -rf "$BLOCKCHAIN_DIR/organizations"
rm -rf "$BLOCKCHAIN_DIR/channel-artifacts"
rm -rf "$BLOCKCHAIN_DIR/system-genesis-block"

# Create required directories
echo "Creating required directories..."
mkdir -p "$BLOCKCHAIN_DIR/organizations/ordererOrganizations/permit.com"
mkdir -p "$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com"
mkdir -p "$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com"
mkdir -p $(pwd)/blockchain/channel-artifacts
mkdir -p "$BLOCKCHAIN_DIR/system-genesis-block"

# Generate crypto material
echo "Generating crypto material..."
cryptogen generate --config="$BLOCKCHAIN_DIR/crypto-config.yaml" --output="$BLOCKCHAIN_DIR/organizations"

# Generate genesis block
echo "Generating genesis block..."
configtxgen -profile PermitGenesis -channelID system-channel -outputBlock $(pwd)/blockchain/channel-artifacts/genesis.block

# Generate channel configuration transaction
echo "Generating channel configuration transaction..."
configtxgen -profile PermitChannel -channelID permitchannel -outputCreateChannelTx $(pwd)/blockchain/channel-artifacts/channel.tx

# Generate anchor peer transactions
echo "Generating anchor peer transactions..."
configtxgen -profile PermitChannel -channelID permitchannel -outputAnchorPeersUpdate $(pwd)/blockchain/channel-artifacts/Org1MSPanchors.tx -asOrg Org1MSP
configtxgen -profile PermitChannel -channelID permitchannel -outputAnchorPeersUpdate $(pwd)/blockchain/channel-artifacts/Org2MSPanchors.tx -asOrg Org2MSP

# Verify generated files
echo "Verifying generated files..."
if [ ! -f "$BLOCKCHAIN_DIR/organizations/ordererOrganizations/permit.com/orderers/orderer.permit.com/msp/admincerts/Admin@permit.com-cert.pem" ]; then
    echo "Error: Orderer admin certificate not found"
    exit 1
fi

if [ ! -f "$BLOCKCHAIN_DIR/system-genesis-block/genesis.block" ]; then
    echo "Error: Genesis block not found"
    exit 1
fi

if [ ! -f "$BLOCKCHAIN_DIR/channel-artifacts/channel.tx" ]; then
    echo "Error: Channel configuration transaction not found"
    exit 1
fi

echo "Crypto material generation completed successfully!" 