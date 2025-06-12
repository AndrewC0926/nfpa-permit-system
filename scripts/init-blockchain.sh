#!/bin/bash

# Create necessary directories
mkdir -p blockchain/channel-artifacts
mkdir -p blockchain/organizations/peerOrganizations/city.permit.com
mkdir -p blockchain/organizations/ordererOrganizations/permit.com

# Start the blockchain network
docker-compose -f docker-compose.blockchain.yml up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Create and join channel
docker exec peer0-city.permit.com peer channel create -o orderer.permit.com:7050 -c permit-channel -f /etc/hyperledger/fabric/channel-artifacts/channel.tx --tls --cafile /etc/hyperledger/fabric/orderer/tls/ca.crt

docker exec peer0-city.permit.com peer channel join -b permit-channel.block --tls --cafile /etc/hyperledger/fabric/orderer/tls/ca.crt

# Install and instantiate chaincode
docker exec peer0-city.permit.com peer chaincode install -n permit -v 1.0 -p github.com/chaincode/permit -l node

docker exec peer0-city.permit.com peer chaincode instantiate -o orderer.permit.com:7050 -C permit-channel -n permit -v 1.0 -c '{"Args":["init"]}' --tls --cafile /etc/hyperledger/fabric/orderer/tls/ca.crt

echo "Blockchain network initialized successfully!" 