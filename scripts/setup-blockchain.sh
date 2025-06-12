#!/bin/bash

# Exit on error
set -e

echo "Starting blockchain setup..."

# Clean up any existing setup
./scripts/cleanup-blockchain.sh

# Generate crypto materials and channel artifacts
echo "Generating crypto materials and channel artifacts..."
./scripts/generate-crypto.sh

# Initialize the blockchain network
echo "Initializing blockchain network..."
./scripts/init-blockchain.sh

echo "Blockchain setup completed successfully!" 