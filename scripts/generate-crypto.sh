#!/bin/bash

# Create a temporary container to run the crypto generation
docker run --rm -v $(pwd)/blockchain:/blockchain hyperledger/fabric-tools:2.5 bash -c '
cd /blockchain

# Generate crypto materials
cryptogen generate --config=./crypto-config.yaml --output="crypto-config"

# Generate channel artifacts
configtxgen -profile PermitChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID permit-channel
configtxgen -profile PermitChannel -outputBlock ./channel-artifacts/genesis.block -channelID system-channel
configtxgen -profile PermitChannel -outputAnchorPeersUpdate ./channel-artifacts/CityMSPanchors.tx -channelID permit-channel -asOrg CityMSP

# Set proper permissions
chown -R $(id -u):$(id -g) /blockchain
'

echo "Crypto materials and channel artifacts generated successfully!" 