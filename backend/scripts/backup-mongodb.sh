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
BACKUP_DIR="mongodb-backup"
TAR_FILE="mongodb-backup-${TIMESTAMP}.tar.gz"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup MongoDB data
echo "Backing up MongoDB data..."
mongodump --uri="${MONGODB_URI}" --out="${BACKUP_DIR}"

# Create tar archive
echo "Creating archive..."
tar -czf "${TAR_FILE}" "${BACKUP_DIR}"

# Cleanup
echo "Cleaning up..."
rm -rf "${BACKUP_DIR}"

 