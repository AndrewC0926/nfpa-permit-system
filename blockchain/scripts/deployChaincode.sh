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

# Set Fabric config path to blockchain directory
export FABRIC_CFG_PATH=$(cd "$(dirname "$0")/.." && pwd)

# Check if organizations directory exists
if [ ! -d ../organizations ]; then
  echo "Error: organizations directory does not exist. Please generate crypto material using Fabric CA before running this script."
  exit 1
fi

# Ensure Go module and dependencies for chaincode
cd ..
if [ ! -f go.mod ]; then
  go mod init permitContract
  go get github.com/hyperledger/fabric-contract-api-go/contractapi
fi
cd scripts

CHAINCODE_NAME=permitContract
CHAINCODE_PATH=../permitContract.go
CHAINCODE_LABEL=permitContract_1
CHANNEL_NAME=permitchannel

# Package chaincode
peer lifecycle chaincode package ${CHAINCODE_NAME}.tar.gz --path ${CHAINCODE_PATH} --lang golang --label ${CHAINCODE_LABEL}

# Install chaincode on Org1
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_MSPCONFIGPATH=../organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz

# Install chaincode on Org2
export CORE_PEER_LOCALMSPID=Org2MSP
export CORE_PEER_MSPCONFIGPATH=../organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:8051
peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz

# Query installed chaincode to get package ID
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep ${CHAINCODE_LABEL} | awk -F ",|:| " '{print $3}')

# Approve chaincode for Org1
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_MSPCONFIGPATH=../organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID ${CHANNEL_NAME} --name ${CHAINCODE_NAME} --version 1.0 --package-id ${PACKAGE_ID} --sequence 1 --tls --cafile ../organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt

# Approve chaincode for Org2
export CORE_PEER_LOCALMSPID=Org2MSP
export CORE_PEER_MSPCONFIGPATH=../organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:8051
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID ${CHANNEL_NAME} --name ${CHAINCODE_NAME} --version 1.0 --package-id ${PACKAGE_ID} --sequence 1 --tls --cafile ../organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt

# Commit chaincode
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID ${CHANNEL_NAME} --name ${CHAINCODE_NAME} --version 1.0 --sequence 1 --tls --cafile ../organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt --peerAddresses localhost:7051 --tlsRootCertFiles ../organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:8051 --tlsRootCertFiles ../organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt

echo "Chaincode deployment complete." 