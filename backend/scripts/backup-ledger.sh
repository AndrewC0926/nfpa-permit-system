#!/bin/bash

# Fail fast if run as root or with sudo
if [ "$(id -u)" = "0" ]; then
  echo "❌ Do not run this script as root or with sudo. Exiting."
  exit 1
fi

if [ -n "$SUDO_USER" ]; then
  echo "❌ Do not run this script with sudo. Exiting."
  exit 1
fi

# Set variables
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="ledger-backup"
TAR_FILE="ledger-backup-${TIMESTAMP}.tar.gz"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup peer data
echo "Backing up peer data..."
docker cp peer0.org1.example.com:/var/hyperledger/production "${BACKUP_DIR}/peer0.org1.example.com"
docker cp peer0.org2.example.com:/var/hyperledger/production "${BACKUP_DIR}/peer0.org2.example.com"

# Backup orderer data
echo "Backing up orderer data..."
docker cp orderer.example.com:/var/hyperledger/production "${BACKUP_DIR}/orderer.example.com"

# Backup channel artifacts
echo "Backing up channel artifacts..."
cp -r channel-artifacts "${BACKUP_DIR}/"

# Backup crypto-config
echo "Backing up crypto-config..."
cp -r crypto-config "${BACKUP_DIR}/"

# Create tar archive
echo "Creating archive..."
tar -czf "${TAR_FILE}" "${BACKUP_DIR}"

# Cleanup
echo "Cleaning up..."
rm -rf "${BACKUP_DIR}"

echo "✅ Backup completed: ${TAR_FILE}" 