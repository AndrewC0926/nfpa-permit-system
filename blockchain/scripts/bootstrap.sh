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

# Check prerequisites
echo "Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "Error: docker is required but not installed"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Error: docker-compose is required but not installed"; exit 1; }
command -v cryptogen >/dev/null 2>&1 || { echo "Error: cryptogen is required but not installed"; exit 1; }
command -v configtxgen >/dev/null 2>&1 || { echo "Error: configtxgen is required but not installed"; exit 1; }

# Make scripts executable
echo "Making scripts executable..."
chmod +x "$BLOCKCHAIN_DIR/scripts/"*.sh

# Create Docker network if it doesn't exist
echo "Creating Docker network..."
docker network create permit-network || true

# Setup network
echo "Setting up Hyperledger Fabric network..."
"$BLOCKCHAIN_DIR/scripts/setup-network.sh"

# Install and instantiate chaincode
echo "Installing and instantiating chaincode..."
"$BLOCKCHAIN_DIR/scripts/install-chaincode.sh"

# Verify network
echo "Verifying network setup..."
"$BLOCKCHAIN_DIR/scripts/verify-network.sh"

echo "Bootstrap completed successfully!" 