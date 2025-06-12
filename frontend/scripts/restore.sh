#!/bin/bash

# Exit on error
set -e

# Check arguments
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

BACKUP_FILE=$1

# Load environment variables
if [ -f .env.production ]; then
  source .env.production
fi

# Create restore directory
RESTORE_DIR="restore_$(date +%Y%m%d_%H%M%S)"
mkdir -p $RESTORE_DIR

# Download backup
echo "Downloading backup..."
aws s3 cp "s3://${VITE_S3_BUCKET}-backups/$BACKUP_FILE" "$RESTORE_DIR.tar.gz"

# Extract backup
echo "Extracting backup..."
tar -xzf "$RESTORE_DIR.tar.gz" -C "$RESTORE_DIR"

# Restore MongoDB
echo "Restoring MongoDB..."
mongorestore --uri="${MONGODB_URI}" --drop "$RESTORE_DIR/mongodb"

# Restore S3
echo "Restoring S3..."
aws s3 sync "$RESTORE_DIR/s3" "s3://${VITE_S3_BUCKET}"

# Restore blockchain state
echo "Restoring blockchain state..."
curl -X POST -F "file=@$RESTORE_DIR/blockchain.tar.gz" ${VITE_BLOCKCHAIN_EXPLORER_URL}/api/restore

# Clean up
echo "Cleaning up..."
rm -rf "$RESTORE_DIR" "$RESTORE_DIR.tar.gz"

echo "Restore completed successfully!" 