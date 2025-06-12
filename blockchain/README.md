# Blockchain Network (Hyperledger Fabric v2.5)

This directory contains the configuration, chaincode, and scripts for the city-grade permit system's Hyperledger Fabric network.

## Network Structure
- **Certificate Authorities (CAs):**
  - ca-org1
  - ca-org2
  - ca-orderer
- **Peers:**
  - peer0.org1
  - peer0.org2
- **Orderer:**
  - orderer.example.com
- **Channel:**
  - permitchannel
- **Chaincode:**
  - permitContract (Go)

## Key Chaincode Functions
- `InitLedger()`
- `LogFileHash(permitId, filename, sha256, uploader)`
- `UpdateStatus(permitId, newStatus)`
- `GetPermitById(permitId)`

## Configs
- `core.yaml` (no external builders, working BCCSP)
- `configtx.yaml` (TwoOrgsChannel + TwoOrgsOrdererGenesis)

## Scripts
- `bootstrap.sh` — Start the network and create the channel
- `registerEnroll.sh` — Register and enroll identities
- `deployChaincode.sh` — Deploy the permitContract chaincode
- `verify-network.sh` — Health and status checks

## Docker
- `docker-compose-test-net.yaml` — All CA/peer/orderer containers

## Setup Steps
1. `./scripts/bootstrap.sh` — Start network, create channel
2. `./scripts/registerEnroll.sh` — Register/enroll orgs and orderer
3. `./scripts/deployChaincode.sh` — Deploy chaincode to permitchannel
4. `./scripts/verify-network.sh` — Verify network health

---

See each script and config for details. This network is designed for city/enterprise-grade auditability and integrity. 