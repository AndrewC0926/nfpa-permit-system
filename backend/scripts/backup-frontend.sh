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
BACKUP_DIR="frontend-backup"
TAR_FILE="frontend-backup-${TIMESTAMP}.tar.gz"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup frontend build
echo "Backing up frontend build..."
cp -r ../frontend/build "${BACKUP_DIR}/"

# Create tar archive
echo "Creating archive..."
tar -czf "${TAR_FILE}" "${BACKUP_DIR}"

# Cleanup
echo "Cleaning up..."
rm -rf "${BACKUP_DIR}"

echo "✅ Backup completed: ${TAR_FILE}" 