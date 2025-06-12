#!/bin/bash

# Exit on first error
set -e

# Generate crypto material for orderer org
cryptogen generate --config=./crypto-config-orderer.yaml --output="organizations"

# Generate crypto material for peer org
cryptogen generate --config=./crypto-config-org1.yaml --output="organizations"

# Create required directories
mkdir -p system-genesis-block channel-artifacts

# Create genesis block
configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock ./system-genesis-block/genesis.block -configPath .

# Create channel creation transaction
configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/permitchannel.tx -channelID permitchannel -configPath .

# Create anchor peer transactions
configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID permitchannel -asOrg Org1MSP -configPath .

echo "Generated crypto materials, genesis block and channel artifacts" 