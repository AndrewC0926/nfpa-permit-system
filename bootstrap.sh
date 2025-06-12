#!/bin/bash

# Exit on first error
set -e

# Clean up any previous runs
function cleanup {
    echo "Cleaning up previous runs..."
    docker compose -f docker-compose-test-net.yaml down --volumes --remove-orphans
    rm -rf organizations/peerOrganizations
    rm -rf organizations/ordererOrganizations
    rm -rf channel-artifacts/*
    rm -rf permitcontract.tar.gz
    
    # Remove host entries
    sudo sed -i '/orderer.permit.com/d' /etc/hosts
    sudo sed -i '/peer0.city.permit.com/d' /etc/hosts
}

# Setup host entries
function setupHosts {
    echo "Setting up host entries..."
    echo "127.0.0.1 orderer.permit.com" | sudo tee -a /etc/hosts
    echo "127.0.0.1 peer0.city.permit.com" | sudo tee -a /etc/hosts
}

# Generate crypto material
function generateCrypto {
    echo "Generating crypto material..."
    export PATH=${PWD}/bin:$PATH
    export FABRIC_CFG_PATH=${PWD}
    
    cryptogen generate --config=./organizations/cryptogen/crypto-config-orderer.yaml --output="organizations"
    cryptogen generate --config=./organizations/cryptogen/crypto-config-org1.yaml --output="organizations"
}

# Generate genesis block and channel transaction
function generateGenesisBlock {
    echo "Generating genesis block..."
    export FABRIC_CFG_PATH=${PWD}
    
    configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block
    
    echo "Generating channel transaction..."
    configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/permitchannel.tx -channelID permitchannel
}

# Start the network
function startNetwork {
    echo "Starting the network..."
    docker compose -f docker-compose-test-net.yaml up -d
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
}

# Create and join channel
function setupChannel {
    echo "Creating channel..."
    export PATH=${PWD}/bin:$PATH
    export FABRIC_CFG_PATH=${PWD}
    export ORDERER_CA=${PWD}/organizations/ordererOrganizations/permit.com/orderers/orderer.permit.com/msp/tlscacerts/tlsca.permit.com-cert.pem
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="CityMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/city.permit.com/peers/peer0.city.permit.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/city.permit.com/users/Admin@city.permit.com/msp
    export CORE_PEER_ADDRESS=peer0.city.permit.com:7051
    
    # Create the channel
    peer channel create -o orderer.permit.com:7050 -c permitchannel \
        --ordererTLSHostnameOverride orderer.permit.com \
        -f ./channel-artifacts/permitchannel.tx --outputBlock ./channel-artifacts/permitchannel.block \
        --tls --cafile $ORDERER_CA
    
    echo "Joining channel..."
    peer channel join -b ./channel-artifacts/permitchannel.block
}

# Install and instantiate chaincode
function deployChaincode {
    echo "Setting up chaincode environment..."
    export PATH=${PWD}/bin:$PATH
    export FABRIC_CFG_PATH=${PWD}
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="CityMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/city.permit.com/peers/peer0.city.permit.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/city.permit.com/users/Admin@city.permit.com/msp
    export CORE_PEER_ADDRESS=peer0.city.permit.com:7051
    export ORDERER_CA=${PWD}/organizations/ordererOrganizations/permit.com/orderers/orderer.permit.com/msp/tlscacerts/tlsca.permit.com-cert.pem
    
    echo "Creating chaincode directories..."
    docker exec peer0.city.permit.com mkdir -p /var/hyperledger/production/lifecycle/chaincodes
    docker exec peer0.city.permit.com chmod -R 777 /var/hyperledger/production
    
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
}

# Main execution
cleanup
setupHosts
generateCrypto
generateGenesisBlock
startNetwork
setupChannel
deployChaincode

echo "Network is ready!" 