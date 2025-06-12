#!/bin/bash

# Exit on first error
set -e

# Create bin directory if it doesn't exist
mkdir -p bin

# Download and setup fabric samples
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.4.1 1.5.2

# Copy binaries to our bin directory
cp fabric-samples/bin/* bin/

# Add Fabric binary path to PATH
export PATH=${PWD}/bin:$PATH

# Create necessary directories
mkdir -p organizations/cryptogen
mkdir -p organizations/ordererOrganizations
mkdir -p organizations/peerOrganizations
mkdir -p channel-artifacts

echo "Setup complete. Fabric binaries installed." 