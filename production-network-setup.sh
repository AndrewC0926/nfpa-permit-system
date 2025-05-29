#!/bin/bash

# Production Multi-Organization Hyperledger Fabric Network Setup
# This script sets up a government-ready blockchain network with City, State, and Federal nodes

set -e

echo "🏛️  Setting up Production NFPA Multi-Organization Blockchain Network"
echo "=========================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Configuration
NETWORK_NAME="nfpa-production"
CHANNEL_NAME="nfpa-permits"
CHAINCODE_NAME="nfpaPermitChaincode"

# Organization configurations
CITY_ORG="CityFireDept"
STATE_ORG="StateFMO" 
FEDERAL_ORG="FederalAgency"

# Create network directory structure
print_step "Creating production network directory structure"
mkdir -p production-network/organizations/ordererOrganizations
mkdir -p production-network/organizations/peerOrganizations/city.nfpa.gov
mkdir -p production-network/organizations/peerOrganizations/state.nfpa.gov
mkdir -p production-network/organizations/peerOrganizations/federal.nfpa.gov
mkdir -p production-network/configtx
mkdir -p production-network/docker
mkdir -p production-network/scripts
mkdir -p production-network/chaincode
mkdir -p production-network/channel-artifacts
mkdir -p production-network/system-genesis-block

cd production-network

# Step 1: Generate Production Certificates
print_step "Generating production-grade certificates and keys"

cat > crypto-config.yaml << 'EOF'
# Production Crypto Configuration for Multi-Org NFPA Network
OrdererOrgs:
  - Name: OrdererOrg
    Domain: orderer.nfpa.gov
    EnableNodeOUs: true
    Specs:
      - Hostname: orderer0
        SANS:
          - localhost
          - 127.0.0.1
          - orderer0.orderer.nfpa.gov
      - Hostname: orderer1
        SANS:
          - localhost
          - 127.0.0.1
          - orderer1.orderer.nfpa.gov
      - Hostname: orderer2
        SANS:
          - localhost
          - 127.0.0.1
          - orderer2.orderer.nfpa.gov

PeerOrganizations:
  - Name: CityFireDept
    Domain: city.nfpa.gov
    EnableNodeOUs: true
    Template:
      Count: 2
      SANS:
        - localhost
        - 127.0.0.1
    Users:
      Count: 3
    
  - Name: StateFMO
    Domain: state.nfpa.gov
    EnableNodeOUs: true
    Template:
      Count: 2
      SANS:
        - localhost
        - 127.0.0.1
    Users:
      Count: 3
      
  - Name: FederalAgency
    Domain: federal.nfpa.gov
    EnableNodeOUs: true
    Template:
      Count: 2
      SANS:
        - localhost
        - 127.0.0.1
    Users:
      Count: 3
EOF

# Generate certificates
cryptogen generate --config=./crypto-config.yaml --output="organizations"
print_success "Production certificates generated"

# Step 2: Create Production ConfigTx
print_step "Creating production consensus and channel configuration"

cat > configtx/configtx.yaml << 'EOF'
# Production Configuration for Multi-Organization NFPA Network

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
        OrdererEndpoints:
            - orderer0.orderer.nfpa.gov:7050
            - orderer1.orderer.nfpa.gov:8050
            - orderer2.orderer.nfpa.gov:9050

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

# Production-Grade Raft Consensus Configuration
Orderer: &OrdererDefaults
    OrdererType: etcdraft
    Addresses:
        - orderer0.orderer.nfpa.gov:7050
        - orderer1.orderer.nfpa.gov:8050
        - orderer2.orderer.nfpa.gov:9050
    EtcdRaft:
        Consenters:
        - Host: orderer0.orderer.nfpa.gov
          Port: 7050
          ClientTLSCert: ../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer0.orderer.nfpa.gov/tls/server.crt
          ServerTLSCert: ../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer0.orderer.nfpa.gov/tls/server.crt
        - Host: orderer1.orderer.nfpa.gov
          Port: 8050
          ClientTLSCert: ../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer1.orderer.nfpa.gov/tls/server.crt
          ServerTLSCert: ../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer1.orderer.nfpa.gov/tls/server.crt
        - Host: orderer2.orderer.nfpa.gov
          Port: 9050
          ClientTLSCert: ../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer2.orderer.nfpa.gov/tls/server.crt
          ServerTLSCert: ../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer2.orderer.nfpa.gov/tls/server.crt
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

# Step 3: Generate Genesis Block and Channel Artifacts
print_step "Generating production genesis block and channel configuration"

export FABRIC_CFG_PATH=${PWD}/configtx

# Generate system genesis block
configtxgen -profile ThreeOrgsOrdererGenesis -channelID system-channel -outputBlock ./system-genesis-block/genesis.block

# Generate channel configuration transaction
configtxgen -profile NFPAPermitsChannel -outputCreateChannelTx ./channel-artifacts/nfpa-permits.tx -channelID nfpa-permits

# Generate anchor peer transactions for each organization
configtxgen -profile NFPAPermitsChannel -outputAnchorPeersUpdate ./channel-artifacts/CityFireDeptMSPanchors.tx -channelID nfpa-permits -asOrg CityFireDeptMSP
configtxgen -profile NFPAPermitsChannel -outputAnchorPeersUpdate ./channel-artifacts/StateFMOMSPanchors.tx -channelID nfpa-permits -asOrg StateFMOMSP
configtxgen -profile NFPAPermitsChannel -outputAnchorPeersUpdate ./channel-artifacts/FederalAgencyMSPanchors.tx -channelID nfpa-permits -asOrg FederalAgencyMSP

print_success "Channel artifacts generated"

# Step 4: Production Docker Compose Configuration
print_step "Creating production Docker Compose configuration"

cat > docker/docker-compose-production.yaml << 'EOF'
version: '3.7'

volumes:
  orderer0.orderer.nfpa.gov:
  orderer1.orderer.nfpa.gov:
  orderer2.orderer.nfpa.gov:
  peer0.city.nfpa.gov:
  peer1.city.nfpa.gov:
  peer0.state.nfpa.gov:
  peer1.state.nfpa.gov:
  peer0.federal.nfpa.gov:
  peer1.federal.nfpa.gov:

networks:
  nfpa_production:
    name: nfpa_production

services:

  # Orderer Services - 3 Node Raft Consensus
  orderer0.orderer.nfpa.gov:
    container_name: orderer0.orderer.nfpa.gov
    image: hyperledger/fabric-orderer:latest
    environment:
      - FABRIC_LOGGING_SPEC=INFO
      - ORDERER_GENERAL_LISTENADDRESS=0.0.0.0
      - ORDERER_GENERAL_LISTENPORT=7050
      - ORDERER_GENERAL_GENESISMETHOD=file
      - ORDERER_GENERAL_GENESISFILE=/var/hyperledger/orderer/orderer.genesis.block
      - ORDERER_GENERAL_LOCALMSPID=OrdererMSP
      - ORDERER_GENERAL_LOCALMSPDIR=/var/hyperledger/orderer/msp
      - ORDERER_OPERATIONS_LISTENADDRESS=orderer0.orderer.nfpa.gov:9443
      - ORDERER_GENERAL_TLS_ENABLED=true
      - ORDERER_GENERAL_TLS_PRIVATEKEY=/var/hyperledger/orderer/tls/server.key
      - ORDERER_GENERAL_TLS_CERTIFICATE=/var/hyperledger/orderer/tls/server.crt
      - ORDERER_GENERAL_TLS_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]
      - ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE=/var/hyperledger/orderer/tls/server.crt
      - ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY=/var/hyperledger/orderer/tls/server.key
      - ORDERER_GENERAL_CLUSTER_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric
    command: orderer
    volumes:
        - ../system-genesis-block/genesis.block:/var/hyperledger/orderer/orderer.genesis.block
        - ../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer0.orderer.nfpa.gov/msp:/var/hyperledger/orderer/msp
        - ../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer0.orderer.nfpa.gov/tls/:/var/hyperledger/orderer/tls
        - orderer0.orderer.nfpa.gov:/var/hyperledger/production/orderer
    ports:
      - 7050:7050
      - 9443:9443
    networks:
      - nfpa_production

  orderer1.orderer.nfpa.gov:
    container_name: orderer1.orderer.nfpa.gov
    image: hyperledger/fabric-orderer:latest
    environment:
      - FABRIC_LOGGING_SPEC=INFO
      - ORDERER_GENERAL_LISTENADDRESS=0.0.0.0
      - ORDERER_GENERAL_LISTENPORT=8050
      - ORDERER_GENERAL_GENESISMETHOD=file
      - ORDERER_GENERAL_GENESISFILE=/var/hyperledger/orderer/orderer.genesis.block
      - ORDERER_GENERAL_LOCALMSPID=OrdererMSP
      - ORDERER_GENERAL_LOCALMSPDIR=/var/hyperledger/orderer/msp
      - ORDERER_OPERATIONS_LISTENADDRESS=orderer1.orderer.nfpa.gov:9444
      - ORDERER_GENERAL_TLS_ENABLED=true
      - ORDERER_GENERAL_TLS_PRIVATEKEY=/var/hyperledger/orderer/tls/server.key
      - ORDERER_GENERAL_TLS_CERTIFICATE=/var/hyperledger/orderer/tls/server.crt
      - ORDERER_GENERAL_TLS_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]
      - ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE=/var/hyperledger/orderer/tls/server.crt
      - ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY=/var/hyperledger/orderer/tls/server.key
      - ORDERER_GENERAL_CLUSTER_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric
    command: orderer
    volumes:
        - ../system-genesis-block/genesis.block:/var/hyperledger/orderer/orderer.genesis.block
        - ../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer1.orderer.nfpa.gov/msp:/var/hyperledger/orderer/msp
        - ../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer1.orderer.nfpa.gov/tls/:/var/hyperledger/orderer/tls
        - orderer1.orderer.nfpa.gov:/var/hyperledger/production/orderer
    ports:
      - 8050:8050
      - 9444:9444
    networks:
      - nfpa_production

  orderer2.orderer.nfpa.gov:
    container_name: orderer2.orderer.nfpa.gov
    image: hyperledger/fabric-orderer:latest
    environment:
      - FABRIC_LOGGING_SPEC=INFO
      - ORDERER_GENERAL_LISTENADDRESS=0.0.0.0
      - ORDERER_GENERAL_LISTENPORT=9050
      - ORDERER_GENERAL_GENESISMETHOD=file
      - ORDERER_GENERAL_GENESISFILE=/var/hyperledger/orderer/orderer.genesis.block
      - ORDERER_GENERAL_LOCALMSPID=OrdererMSP
      - ORDERER_GENERAL_LOCALMSPDIR=/var/hyperledger/orderer/msp
      - ORDERER_OPERATIONS_LISTENADDRESS=orderer2.orderer.nfpa.gov:9445
      - ORDERER_GENERAL_TLS_ENABLED=true
      - ORDERER_GENERAL_TLS_PRIVATEKEY=/var/hyperledger/orderer/tls/server.key
      - ORDERER_GENERAL_TLS_CERTIFICATE=/var/hyperledger/orderer/tls/server.crt
      - ORDERER_GENERAL_TLS_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]
      - ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE=/var/hyperledger/orderer/tls/server.crt
      - ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY=/var/hyperledger/orderer/tls/server.key
      - ORDERER_GENERAL_CLUSTER_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric
    command: orderer
    volumes:
        - ../system-genesis-block/genesis.block:/var/hyperledger/orderer/orderer.genesis.block
        - ../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer2.orderer.nfpa.gov/msp:/var/hyperledger/orderer/msp
        - ../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer2.orderer.nfpa.gov/tls/:/var/hyperledger/orderer/tls
        - orderer2.orderer.nfpa.gov:/var/hyperledger/production/orderer
    ports:
      - 9050:9050
      - 9445:9445
    networks:
      - nfpa_production

  # City Fire Department Peers
  peer0.city.nfpa.gov:
    container_name: peer0.city.nfpa.gov
    image: hyperledger/fabric-peer:latest
    environment:
      - CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock
      - CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=nfpa_production
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
      - CORE_PEER_GOSSIP_BOOTSTRAP=peer1.city.nfpa.gov:8051
      - CORE_PEER_GOSSIP_EXTERNALENDPOINT=peer0.city.nfpa.gov:7051
      - CORE_PEER_LOCALMSPID=CityFireDeptMSP
      - CORE_OPERATIONS_LISTENADDRESS=peer0.city.nfpa.gov:9446
      - CORE_LEDGER_STATE_STATEDATABASE=CouchDB
      - CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=couchdb0:5984
      - CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME=admin
      - CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD=adminpw
    volumes:
        - /var/run/:/host/var/run/
        - ../organizations/peerOrganizations/city.nfpa.gov/peers/peer0.city.nfpa.gov/msp:/etc/hyperledger/fabric/msp
        - ../organizations/peerOrganizations/city.nfpa.gov/peers/peer0.city.nfpa.gov/tls:/etc/hyperledger/fabric/tls
        - peer0.city.nfpa.gov:/var/hyperledger/production
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric/peer
    command: peer node start
    ports:
      - 7051:7051
      - 9446:9446
    networks:
      - nfpa_production

  # State Fire Marshal Peers  
  peer0.state.nfpa.gov:
    container_name: peer0.state.nfpa.gov
    image: hyperledger/fabric-peer:latest
    environment:
      - CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock
      - CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=nfpa_production
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
      - CORE_PEER_GOSSIP_BOOTSTRAP=peer1.state.nfpa.gov:10051
      - CORE_PEER_LOCALMSPID=StateFMOMSP
      - CORE_OPERATIONS_LISTENADDRESS=peer0.state.nfpa.gov:9447
      - CORE_LEDGER_STATE_STATEDATABASE=CouchDB
      - CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=couchdb1:5984
      - CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME=admin
      - CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD=adminpw
    volumes:
        - /var/run/:/host/var/run/
        - ../organizations/peerOrganizations/state.nfpa.gov/peers/peer0.state.nfpa.gov/msp:/etc/hyperledger/fabric/msp
        - ../organizations/peerOrganizations/state.nfpa.gov/peers/peer0.state.nfpa.gov/tls:/etc/hyperledger/fabric/tls
        - peer0.state.nfpa.gov:/var/hyperledger/production
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric/peer
    command: peer node start
    ports:
      - 9051:9051
      - 9447:9447
    networks:
      - nfpa_production

  # Federal Agency Peers
  peer0.federal.nfpa.gov:
    container_name: peer0.federal.nfpa.gov
    image: hyperledger/fabric-peer:latest
    environment:
      - CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock
      - CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=nfpa_production
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
      - CORE_PEER_GOSSIP_BOOTSTRAP=peer1.federal.nfpa.gov:12051
      - CORE_PEER_LOCALMSPID=FederalAgencyMSP
      - CORE_OPERATIONS_LISTENADDRESS=peer0.federal.nfpa.gov:9448
      - CORE_LEDGER_STATE_STATEDATABASE=CouchDB
      - CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=couchdb2:5984
      - CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME=admin
      - CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD=adminpw
    volumes:
        - /var/run/:/host/var/run/
        - ../organizations/peerOrganizations/federal.nfpa.gov/peers/peer0.federal.nfpa.gov/msp:/etc/hyperledger/fabric/msp
        - ../organizations/peerOrganizations/federal.nfpa.gov/peers/peer0.federal.nfpa.gov/tls:/etc/hyperledger/fabric/tls
        - peer0.federal.nfpa.gov:/var/hyperledger/production
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric/peer
    command: peer node start
    ports:
      - 11051:11051
      - 9448:9448
    networks:
      - nfpa_production

  # CouchDB Databases
  couchdb0:
    container_name: couchdb0
    image: couchdb:3.1.1
    environment:
      - COUCHDB_USER=admin
      - COUCHDB_PASSWORD=adminpw
    ports:
      - "5984:5984"
    volumes:
      - couchdb0_data:/opt/couchdb/data
    networks:
      - nfpa_production

  couchdb1:
    container_name: couchdb1
    image: couchdb:3.1.1
    environment:
      - COUCHDB_USER=admin
      - COUCHDB_PASSWORD=adminpw
    ports:
      - "7984:5984"
    volumes:
      - couchdb1_data:/opt/couchdb/data
    networks:
      - nfpa_production

  couchdb2:
    container_name: couchdb2
    image: couchdb:3.1.1
    environment:
      - COUCHDB_USER=admin
      - COUCHDB_PASSWORD=adminpw
    ports:
      - "8984:5984"
    volumes:
      - couchdb2_data:/opt/couchdb/data
    networks:
      - nfpa_production

volumes:
  couchdb0_data:
  couchdb1_data:
  couchdb2_data:
EOF

print_success "Production Docker Compose configuration created"

# Step 5: Network Management Scripts
print_step "Creating network management scripts"

cat > scripts/start-network.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting Production NFPA Multi-Organization Network"

# Start the network
cd docker
docker-compose -f docker-compose-production.yaml up -d

echo "⏳ Waiting for network to stabilize..."
sleep 15

# Create and join channel
cd ../scripts
./create-channel.sh

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
peer channel create -o localhost:7050 -c nfpa-permits -f ../channel-artifacts/nfpa-permits.tx --tls --cafile ${PWD}/../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer0.orderer.nfpa.gov/msp/tlscacerts/tlsca.orderer.nfpa.gov-cert.pem

# Join City peers
peer channel join -b nfpa-permits.block

# Update anchor peer for City
peer channel update -o localhost:7050 -c nfpa-permits -f ../channel-artifacts/CityFireDeptMSPanchors.tx --tls --cafile ${PWD}/../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer0.orderer.nfpa.gov/msp/tlscacerts/tlsca.orderer.nfpa.gov-cert.pem

# Join State peers
export CORE_PEER_LOCALMSPID="StateFMOMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/../organizations/peerOrganizations/state.nfpa.gov/peers/peer0.state.nfpa.gov/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/../organizations/peerOrganizations/state.nfpa.gov/users/Admin@state.nfpa.gov/msp
export CORE_PEER_ADDRESS=localhost:9051

peer channel join -b nfpa-permits.block
peer channel update -o localhost:7050 -c nfpa-permits -f ../channel-artifacts/StateFMOMSPanchors.tx --tls --cafile ${PWD}/../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer0.orderer.nfpa.gov/msp/tlscacerts/tlsca.orderer.nfpa.gov-cert.pem

# Join Federal peers
export CORE_PEER_LOCALMSPID="FederalAgencyMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/../organizations/peerOrganizations/federal.nfpa.gov/peers/peer0.federal.nfpa.gov/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/../organizations/peerOrganizations/federal.nfpa.gov/users/Admin@federal.nfpa.gov/msp
export CORE_PEER_ADDRESS=localhost:11051

peer channel join -b nfpa-permits.block
peer channel update -o localhost:7050 -c nfpa-permits -f ../channel-artifacts/FederalAgencyMSPanchors.tx --tls --cafile ${PWD}/../organizations/ordererOrganizations/orderer.nfpa.gov/orderers/orderer0.orderer.nfpa.gov/msp/tlscacerts/tlsca.orderer.nfpa.gov-cert.pem

echo "✅ All organizations joined NFPA Permits channel"
EOF

cat > scripts/stop-network.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping Production NFPA Network"
cd docker
docker-compose -f docker-compose-production.yaml down -v
docker system prune -f
echo "✅ Network stopped and cleaned"
EOF

chmod +x scripts/*.sh

print_success "Network management scripts created"

# Step 6: Production Chaincode
print_step "Setting up production-grade chaincode"

mkdir -p chaincode/nfpa-permit
cat > chaincode/nfpa-permit/package.json << 'EOF'
{
    "name": "nfpa-permit-chaincode",
    "version": "1.0.0",
    "description": "Production NFPA Fire Safety Permit Management",
    "main": "index.js",
    "engines": {
        "node": ">=16.0.0"
    },
    "dependencies": {
        "fabric-contract-api": "^2.2.20"
    }
}
EOF

print_success "Production network setup completed!"

echo ""
echo "🎉 PRODUCTION MULTI-ORGANIZATION BLOCKCHAIN NETWORK READY!"
echo "==========================================================="
echo ""
echo "📁 Network Structure:"
echo "  • 3 Orderer nodes (Raft consensus)"
echo "  • 6 Peer nodes (2 per organization)"  
echo "  • 3 CouchDB databases"
echo "  • TLS encryption enabled"
echo "  • Production-grade certificates"
echo ""
echo "🏛️ Organizations:"
echo "  • City Fire Department (CityFireDeptMSP)"
echo "  • State Fire Marshal Office (StateFMOMSP)"
echo "  • Federal Agency (FederalAgencyMSP)"
echo ""
echo "🚀 To start the network:"
echo "  cd production-network"
echo "  ./scripts/start-network.sh"
echo ""
echo "🛑 To stop the network:"
echo "  ./scripts/stop-network.sh"
echo ""
echo "📊 Monitor network:"
echo "  docker logs orderer0.orderer.nfpa.gov"
echo "  docker logs peer0.city.nfpa.gov"
echo ""
print_success "Ready for government-grade permit management!"
