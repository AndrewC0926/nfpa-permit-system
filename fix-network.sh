#!/bin/bash

# Exit on first error
set -e

echo "Starting network fix script..."

# Clean up any existing environment
echo "Cleaning up existing environment..."
docker compose -f docker-compose-test-net.yaml down --volumes --remove-orphans

# Clean up directories with proper permissions
echo "Cleaning up directories..."
if [ -d "organizations" ]; then
    find organizations -type d -exec chmod 755 {} \;
    find organizations -type f -exec chmod 644 {} \;
    rm -rf organizations
fi

if [ -d "channel-artifacts" ]; then
    find channel-artifacts -type d -exec chmod 755 {} \;
    find channel-artifacts -type f -exec chmod 644 {} \;
    rm -rf channel-artifacts/*
fi

if [ -f "permitcontract.tar.gz" ]; then
    chmod 644 permitcontract.tar.gz
    rm -f permitcontract.tar.gz
fi

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p organizations/peerOrganizations/city.permit.com/msp
mkdir -p organizations/ordererOrganizations/permit.com/msp
mkdir -p channel-artifacts

# Set up environment variables
export PATH=${PWD}/bin:$PATH
export FABRIC_CFG_PATH=${PWD}

# Generate crypto material
echo "Generating crypto material..."
cryptogen generate --config=./organizations/cryptogen/crypto-config-orderer.yaml --output="organizations"
cryptogen generate --config=./organizations/cryptogen/crypto-config-org1.yaml --output="organizations"

# Copy admin certificates
echo "Copying admin certificates..."
cp organizations/ordererOrganizations/permit.com/users/Admin@permit.com/msp/admincerts/Admin@permit.com-cert.pem organizations/ordererOrganizations/permit.com/msp/admincerts/
cp organizations/peerOrganizations/city.permit.com/users/Admin@city.permit.com/msp/admincerts/Admin@city.permit.com-cert.pem organizations/peerOrganizations/city.permit.com/msp/admincerts/

# Generate genesis block and channel transaction
echo "Generating genesis block..."
configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block

echo "Generating channel transaction..."
configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/permitchannel.tx -channelID permitchannel

# Set up host entries
echo "Setting up host entries..."
echo "127.0.0.1 orderer.permit.com" | sudo tee -a /etc/hosts
echo "127.0.0.1 peer0.city.permit.com" | sudo tee -a /etc/hosts

# Start the network
echo "Starting the network..."
docker compose -f docker-compose-test-net.yaml up -d

# Wait for containers to start
echo "Waiting for containers to start..."
sleep 10

# Wait for orderer
echo "Waiting for orderer to start..."
until docker logs orderer.permit.com 2>&1 | grep -q "Starting orderer"; do
    sleep 2
done
echo "Orderer is ready"

# Wait for peer
echo "Waiting for peer to start..."
until docker logs peer0.city.permit.com 2>&1 | grep -q "Starting peer"; do
    sleep 2
done
echo "Peer is ready"

# Set up environment variables for channel creation
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/permit.com/orderers/orderer.permit.com/msp/tlscacerts/tlsca.permit.com-cert.pem
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="CityMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/city.permit.com/peers/peer0.city.permit.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/city.permit.com/users/Admin@city.permit.com/msp
export CORE_PEER_ADDRESS=peer0.city.permit.com:7051

# Create and join channel
echo "Creating channel..."
peer channel create -o orderer.permit.com:7050 -c permitchannel \
    --ordererTLSHostnameOverride orderer.permit.com \
    -f ./channel-artifacts/permitchannel.tx --outputBlock ./channel-artifacts/permitchannel.block \
    --tls --cafile $ORDERER_CA

echo "Joining channel..."
peer channel join -b ./channel-artifacts/permitchannel.block

# Package and deploy chaincode
echo "Packaging chaincode..."
peer lifecycle chaincode package permitcontract.tar.gz --path ./permitContract --lang node --label permitcontract_1.0

echo "Installing chaincode..."
peer lifecycle chaincode install permitcontract.tar.gz

echo "Getting package ID..."
CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep permitcontract_1.0 | awk -F' ' '{print $3}' | sed 's/,//')

echo "Approving chaincode..."
peer lifecycle chaincode approveformyorg -o orderer.permit.com:7050 \
    --ordererTLSHostnameOverride orderer.permit.com \
    --channelID permitchannel --name permitcontract --version 1.0 \
    --package-id $CC_PACKAGE_ID --sequence 1 \
    --tls --cafile $ORDERER_CA

echo "Checking commit readiness..."
peer lifecycle chaincode checkcommitreadiness \
    --channelID permitchannel --name permitcontract --version 1.0 \
    --sequence 1 --output json

echo "Committing chaincode..."
peer lifecycle chaincode commit -o orderer.permit.com:7050 \
    --ordererTLSHostnameOverride orderer.permit.com \
    --channelID permitchannel --name permitcontract --version 1.0 \
    --sequence 1 --tls --cafile $ORDERER_CA

echo "Network setup complete!" 