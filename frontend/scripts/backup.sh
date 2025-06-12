#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env.production ]; then
  source .env.production
fi

# Create backup directory
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup MongoDB
echo "Backing up MongoDB..."
mongodump --uri="${MONGODB_URI}" --out="$BACKUP_DIR/mongodb"

# Backup S3
echo "Backing up S3..."
aws s3 sync s3://${VITE_S3_BUCKET} "$BACKUP_DIR/s3"

# Backup blockchain state
echo "Backing up blockchain state..."
curl -X POST ${VITE_BLOCKCHAIN_EXPLORER_URL}/api/backup -o "$BACKUP_DIR/blockchain.tar.gz"

# Compress backup
echo "Compressing backup..."
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"

# Upload to backup storage
echo "Uploading backup to storage..."
aws s3 cp "$BACKUP_DIR.tar.gz" "s3://${VITE_S3_BUCKET}-backups/"

# Clean up
echo "Cleaning up..."
rm -rf "$BACKUP_DIR" "$BACKUP_DIR.tar.gz"

echo "Backup completed successfully!" 