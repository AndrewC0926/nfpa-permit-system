#!/bin/bash

# Exit on first error
set -e

# Install chaincode
peer lifecycle chaincode install permitcontract.tar.gz

# Query installed chaincode to get package ID
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep permitcontract_1.0 | awk -F 'Package ID: ' '{print $2}' | awk -F ',' '{print $1}')

# Approve chaincode for Org1
peer lifecycle chaincode approveformyorg \
  -o orderer.permit.com:7050 \
  --channelID permitchannel \
  --name permitcontract \
  --version 1.0 \
  --package-id $PACKAGE_ID \
  --sequence 1

# Check commit readiness
peer lifecycle chaincode checkcommitreadiness \
  --channelID permitchannel \
  --name permitcontract \
  --version 1.0 \
  --sequence 1

# Commit chaincode
peer lifecycle chaincode commit \
  -o orderer.permit.com:7050 \
  --channelID permitchannel \
  --name permitcontract \
  --version 1.0 \
  --sequence 1

# Query committed chaincode
peer lifecycle chaincode querycommitted \
  --channelID permitchannel \
  --name permitcontract

echo "Chaincode deployed successfully" 