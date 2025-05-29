#!/bin/bash

# Simple Production NFPA Network Setup
# This creates a working multi-org network step by step

set -e

echo "🏛️ Setting up Simple Production NFPA Network"
echo "=============================================="

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Clean start
print_step "Cleaning up any existing setup"
cd ~/nfpa-permit-system
rm -rf simple-production-network
mkdir simple-production-network
cd simple-production-network

# Step 1: Create basic structure
print_step "Creating directory structure"
mkdir -p {organizations,configtx,docker,scripts,channel-artifacts,system-genesis-block}

# Step 2: Simple crypto config
print_step "Creating certificate configuration"
cat > crypto-config.yaml << 'EOF'
OrdererOrgs:
  - Name: Orderer
    Domain: orderer.nfpa.gov
    EnableNodeOUs: true
    Specs:
      - Hostname: orderer

PeerOrganizations:
  - Name: CityFireDept
    Domain: city.nfpa.gov
    EnableNodeOUs: true
    Template:
      Count: 1
    Users:
      Count: 1
      
  - Name: StateFMO
    Domain: state.nfpa.gov
    EnableNodeOUs: true
    Template:
      Count: 1
    Users:
      Count: 1
      
  - Name: FederalAgency
    Domain: federal.nfpa.gov
    EnableNodeOUs: true
    Template:
      Count: 1
    Users:
      Count: 1
EOF

# Step 3: Generate certificates
print_step "Generating certificates"
cryptogen generate --config=./crypto-config.yaml

print_success "Certificates generated successfully"

# Step 4: Simple configtx
print_step "Creating channel configuration"
cat > configtx/configtx.yaml << 'EOF'
Organizations:
    - &OrdererOrg
        Name: OrdererMSP
        ID: OrdererMSP
        MSPDir: ../organizations/ordererOrganizations/orderer.nfpa.gov/msp
        Policies:
            Readers:
                Type: Signature
                Rule: "OR('OrdererMSP.member')"
            Writers:
                Type: Signature
                Rule: "OR('OrdererMSP.member')"
            Admins:
                Type: Signature
                Rule: "OR('OrdererMSP.admin')"

    - &CityFireDept
        Name: CityFireDeptMSP
        ID: CityFireDeptMSP
        MSPDir: ../organizations/peerOrganizations/city.nfpa.gov/msp
        Policies:
            Readers:
                Type: Signature
                Rule: "OR('CityFireDeptMSP.admin', 'CityFireDeptMSP.peer', 'CityFireDeptMSP.client')"
            Writers:
                Type: Signature
                Rule: "OR('CityFireDeptMSP.admin', 'CityFireDeptMSP.client')"
            Admins:
                Type: Signature
                Rule: "OR('CityFireDeptMSP.admin')"
            Endorsement:
                Type: Signature
                Rule: "OR('CityFireDeptMSP.peer')"

    - &StateFMO
        Name: StateFMOMSP
        ID: StateFMOMSP
        MSPDir: ../organizations/peerOrganizations/state.nfpa.gov/msp
        Policies:
            Readers:
                Type: Signature
                Rule: "OR('StateFMOMSP.admin', 'StateFMOMSP.peer', 'StateFMOMSP.client')"
            Writers:
                Type: Signature
                Rule: "OR('StateFMOMSP.admin', 'StateFMOMSP.client')"
            Admins:
                Type: Signature
                Rule: "OR('StateFMOMSP.admin')"
            Endorsement:
                Type: Signature
                Rule: "OR('StateFMOMSP.peer')"

    - &FederalAgency
        Name: FederalAgencyMSP
        ID: FederalAgencyMSP
        MSPDir: ../organizations/peerOrganizations/federal.nfpa.gov/msp
        Policies:
            Readers:
                Type: Signature
                Rule: "OR('FederalAgencyMSP.admin', 'FederalAgencyMSP.peer', 'FederalAgencyMSP.client')"
            Writers:
                Type: Signature
                Rule: "OR('FederalAgencyMSP.admin', 'FederalAgencyMSP.client')"
            Admins:
                Type: Signature
                Rule: "OR('FederalAgencyMSP.admin')"
            Endorsement:
                Type: Signature
                Rule: "OR('FederalAgencyMSP.peer')"

Capabilities:
    Channel: &ChannelCapabilities
        V2_0: true
    Orderer: &OrdererCapabilities
        V2_0: true
    Application: &ApplicationCapabilities
        V2_0: true

Application: &ApplicationDefaults
    Organizations:
    Policies:
        Readers:
            Type: ImplicitMeta
            Rule: "ANY Readers"
        Writers:
            Type: ImplicitMeta
            Rule: "ANY Writers"
        Admins:
            Type: ImplicitMeta
            Rule: "MAJORITY Admins"
        LifecycleEndorsement:
            Type: ImplicitMeta
            Rule: "MAJORITY Endorsement"
        Endorsement:
            Type: ImplicitMeta
            Rule: "MAJORITY Endorsement"
    Capabilities:
        <<: *ApplicationCapabilities

Orderer: &OrdererDefaults
    OrdererType: solo
    Addresses:
        - orderer.orderer.nfpa.gov:7050
    BatchTimeout: 2s
    BatchSize:
        MaxMessageCount: 10
        AbsoluteMaxBytes: 99 MB
        PreferredMaxBytes: 512 KB
    Organizations:
    Policies:
        Readers:
            Type: ImplicitMeta
            Rule: "ANY Readers"
        Writers:
            Type: ImplicitMeta
            Rule: "ANY Writers"
        Admins:
            Type: ImplicitMeta
            Rule: "MAJORITY Admins"
        BlockValidation:
            Type: ImplicitMeta
            Rule: "ANY Writers"
    Capabilities:
        <<: *OrdererCapabilities

Channel: &ChannelDefaults
    Policies:
        Readers:
            Type: ImplicitMeta
            Rule: "ANY Readers"
        Writers:
            Type: ImplicitMeta
            Rule: "ANY Writers"
        Admins:
            Type: ImplicitMeta
            Rule: "MAJORITY Admins"
    Capabilities:
        <<: *ChannelCapabilities

Profiles:
    ThreeOrgsOrdererGenesis:
        <<: *ChannelDefaults
        Orderer:
            <<: *OrdererDefaults
            Organizations:
                - *OrdererOrg
        Consortiums:
            NFPAConsortium:
                Organizations:
                    - *CityFireDept
                    - *StateFMO
                    - *FederalAgency
                    
    NFPAPermitsChannel:
        Consortium: NFPAConsortium
        <<: *ChannelDefaults
        Application:
            <<: *ApplicationDefaults
            Organizations:
                - *CityFireDept
                - *StateFMO
                - *FederalAgency
EOF

# Step 5: Generate channel artifacts
print_step "Generating genesis block and channel artifacts"
export FABRIC_CFG_PATH=${PWD}/configtx

configtxgen -profile ThreeOrgsOrdererGenesis -channelID system-channel -outputBlock ./system-genesis-block/genesis.block

configtxgen -profile NFPAPermitsChannel -outputCreateChannelTx ./channel-artifacts/nfpa-permits.tx -channelID nfpa-permits

print_success "Channel artifacts generated"

# Step 6: Simple Docker Compose
print_step "Creating Docker Compose configuration"
cat > docker/docker-compose.yaml << 'EOF'
version: '3.7'

networks:
  nfpa_network:

services:
  orderer.orderer.nfpa.gov:
    container_name: orderer.orderer.nfpa.gov
    image: hyperledger/fabric-orderer:latest
    environment:
      - FABRIC_LOGGING_SPEC=INFO
      - ORDERER_GENERAL_LISTENADDRESS=0.0.0.0
      - ORDERER_GENERAL_LISTENPORT=7050
      - ORDERER_GENERAL_GENESISMETHOD=file
      - ORDERER_GENERAL_GENESISFILE=/var/hyperledger/orderer/orderer.genesis.block
      - ORDERER_GENERAL_LOCALMSPID=OrdererMSP
      - ORDERER_GENERAL_LOCALMSPDIR=/var/hyperledger/orderer/msp
      - ORDERER_GENERAL_TLS_ENABLED=true
      - ORDERER_GENERAL_TLS_PRIVATEKEY=/var/hyperledger/orderer/tls/server.key
      - ORDERER_GENERAL_TLS_CERTIFICATE=/var/hyperledger/orderer/tls/server.crt
      - ORDERER_GENERAL_TLS_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric
    command: orderer
    volumes:
        - ../system-genesis-block/genesis.block:/var/hyperledger/orderer/orderer.genesis.block
        - ../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer.orderer.nfpa.gov/msp:/var/hyperledger/orderer/msp
        - ../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer.orderer.nfpa.gov/tls/:/var/hyperledger/orderer/tls
    ports:
      - 7050:7050
    networks:
      - nfpa_network

  peer0.city.nfpa.gov:
    container_name: peer0.city.nfpa.gov
    image: hyperledger/fabric-peer:latest
    environment:
      - CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock
      - CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=simple-production-network_nfpa_network
      - FABRIC_LOGGING_SPEC=INFO
      - CORE_PEER_TLS_ENABLED=true
      - CORE_PEER_PROFILE_ENABLED=true
      - CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt
      - CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key
      - CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
      - CORE_PEER_ID=peer0.city.nfpa.gov
      - CORE_PEER_ADDRESS=peer0.city.nfpa.gov:7051
      - CORE_PEER_LISTENADDRESS=0.0.0.0:7051
      - CORE_PEER_CHAINCODEADDRESS=peer0.city.nfpa.gov:7052
      - CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:7052
      - CORE_PEER_GOSSIP_EXTERNALENDPOINT=peer0.city.nfpa.gov:7051
      - CORE_PEER_LOCALMSPID=CityFireDeptMSP
    volumes:
        - /var/run/:/host/var/run/
        - ../organizations/peerOrganizations/city.nfpa.gov/peers/peer0.city.nfpa.gov/msp:/etc/hyperledger/fabric/msp
        - ../organizations/peerOrganizations/city.nfpa.gov/peers/peer0.city.nfpa.gov/tls:/etc/hyperledger/fabric/tls
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric/peer
    command: peer node start
    ports:
      - 7051:7051
    networks:
      - nfpa_network

  peer0.state.nfpa.gov:
    container_name: peer0.state.nfpa.gov
    image: hyperledger/fabric-peer:latest
    environment:
      - CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock
      - CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=simple-production-network_nfpa_network
      - FABRIC_LOGGING_SPEC=INFO
      - CORE_PEER_TLS_ENABLED=true
      - CORE_PEER_PROFILE_ENABLED=true
      - CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt
      - CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key
      - CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
      - CORE_PEER_ID=peer0.state.nfpa.gov
      - CORE_PEER_ADDRESS=peer0.state.nfpa.gov:9051
      - CORE_PEER_LISTENADDRESS=0.0.0.0:9051
      - CORE_PEER_CHAINCODEADDRESS=peer0.state.nfpa.gov:9052
      - CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:9052
      - CORE_PEER_GOSSIP_EXTERNALENDPOINT=peer0.state.nfpa.gov:9051
      - CORE_PEER_LOCALMSPID=StateFMOMSP
    volumes:
        - /var/run/:/host/var/run/
        - ../organizations/peerOrganizations/state.nfpa.gov/peers/peer0.state.nfpa.gov/msp:/etc/hyperledger/fabric/msp
        - ../organizations/peerOrganizations/state.nfpa.gov/peers/peer0.state.nfpa.gov/tls:/etc/hyperledger/fabric/tls
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric/peer
    command: peer node start
    ports:
      - 9051:9051
    networks:
      - nfpa_network

  peer0.federal.nfpa.gov:
    container_name: peer0.federal.nfpa.gov
    image: hyperledger/fabric-peer:latest
    environment:
      - CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock
      - CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=simple-production-network_nfpa_network
      - FABRIC_LOGGING_SPEC=INFO
      - CORE_PEER_TLS_ENABLED=true
      - CORE_PEER_PROFILE_ENABLED=true
      - CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt
      - CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key
      - CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
      - CORE_PEER_ID=peer0.federal.nfpa.gov
      - CORE_PEER_ADDRESS=peer0.federal.nfpa.gov:11051
      - CORE_PEER_LISTENADDRESS=0.0.0.0:11051
      - CORE_PEER_CHAINCODEADDRESS=peer0.federal.nfpa.gov:11052
      - CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:11052
      - CORE_PEER_GOSSIP_EXTERNALENDPOINT=peer0.federal.nfpa.gov:11051
      - CORE_PEER_LOCALMSPID=FederalAgencyMSP
    volumes:
        - /var/run/:/host/var/run/
        - ../organizations/peerOrganizations/federal.nfpa.gov/peers/peer0.federal.nfpa.gov/msp:/etc/hyperledger/fabric/msp
        - ../organizations/peerOrganizations/federal.nfpa.gov/peers/peer0.federal.nfpa.gov/tls:/etc/hyperledger/fabric/tls
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric/peer
    command: peer node start
    ports:
      - 11051:11051
    networks:
      - nfpa_network
EOF

# Step 7: Management Scripts
print_step "Creating management scripts"

cat > scripts/start-network.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting Simple Production NFPA Network"

# Start the network
cd docker
docker-compose up -d

echo "⏳ Waiting for network to stabilize..."
sleep 10

echo "✅ Production network is running!"
echo "📊 Network Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
EOF

cat > scripts/create-channel.sh << 'EOF'
#!/bin/bash
set -e

echo "🔗 Creating NFPA Permits Channel"

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="CityFireDeptMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/../organizations/peerOrganizations/city.nfpa.gov/peers/peer0.city.nfpa.gov/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/../organizations/peerOrganizations/city.nfpa.gov/users/Admin@city.nfpa.gov/msp
export CORE_PEER_ADDRESS=localhost:7051

# Create channel
peer channel create -o localhost:7050 -c nfpa-permits -f ../channel-artifacts/nfpa-permits.tx --tls --cafile ${PWD}/../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer.orderer.nfpa.gov/msp/tlscacerts/tlsca.orderer.nfpa.gov-cert.pem

# Join City peer
peer channel join -b nfpa-permits.block

# Join State peer
export CORE_PEER_LOCALMSPID="StateFMOMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/../organizations/peerOrganizations/state.nfpa.gov/peers/peer0.state.nfpa.gov/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/../organizations/peerOrganizations/state.nfpa.gov/users/Admin@state.nfpa.gov/msp
export CORE_PEER_ADDRESS=localhost:9051

peer channel join -b nfpa-permits.block

# Join Federal peer
export CORE_PEER_LOCALMSPID="FederalAgencyMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/../organizations/peerOrganizations/federal.nfpa.gov/peers/peer0.federal.nfpa.gov/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/../organizations/peerOrganizations/federal.nfpa.gov/users/Admin@federal.nfpa.gov/msp
export CORE_PEER_ADDRESS=localhost:11051

peer channel join -b nfpa-permits.block

echo "✅ All organizations joined NFPA Permits channel"
EOF

cat > scripts/stop-network.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping Production NFPA Network"
cd docker
docker-compose down -v
echo "✅ Network stopped"
EOF

chmod +x scripts/*.sh

print_success "Management scripts created"

echo ""
print_success "🎉 SIMPLE PRODUCTION NETWORK READY!"
echo "=================================="
echo ""
echo "🏛️ Organizations:"
echo "  • City Fire Department (CityFireDeptMSP)"
echo "  • State Fire Marshal Office (StateFMOMSP)"
echo "  • Federal Agency (FederalAgencyMSP)"
echo ""
echo "🚀 To start the network:"
echo "  cd simple-production-network"
echo "  ./scripts/start-network.sh"
echo ""
echo "🔗 To create and join channel:"
echo "  ./scripts/create-channel.sh"
echo ""
echo "🛑 To stop the network:"
echo "  ./scripts/stop-network.sh"
echo ""
print_success "Ready for government permit management!"
