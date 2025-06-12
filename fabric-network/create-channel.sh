#!/bin/bash

# Exit on first error
set -e

# Create channel
peer channel create -o orderer.permit.com:7050 -c permitchannel -f ./channel-artifacts/permitchannel.tx --outputBlock ./channel-artifacts/permitchannel.block

# Join peer to channel
peer channel join -b ./channel-artifacts/permitchannel.block

# Update anchor peers
peer channel update -o orderer.permit.com:7050 -c permitchannel -f ./channel-artifacts/Org1MSPanchors.tx

echo "Channel created and joined successfully" 