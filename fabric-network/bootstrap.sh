#!/bin/bash

# Exit on first error
set -e

# Fabric version
VERSION=2.5.0
CA_VERSION=1.5.5

# Create bin directory if it doesn't exist
mkdir -p bin

# Download Fabric binaries
curl -sSL https://github.com/hyperledger/fabric/releases/download/v${VERSION}/hyperledger-fabric-linux-amd64-${VERSION}.tar.gz | tar xz -C bin
curl -sSL https://github.com/hyperledger/fabric-ca/releases/download/v${CA_VERSION}/hyperledger-fabric-ca-linux-amd64-${CA_VERSION}.tar.gz | tar xz -C bin

# Add execute permissions
chmod +x bin/*

echo "Fabric binaries installed successfully" 