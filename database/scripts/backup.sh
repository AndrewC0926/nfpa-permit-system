#!/bin/bash

# NFPA Database Backup Script
# Creates compressed backups with timestamp

BACKUP_DIR="/backups/nfpa"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="nfpa_permits"
DB_USER="nfpa_admin"

mkdir -p $BACKUP_DIR

# PostgreSQL backup
echo "Creating PostgreSQL backup..."
docker exec nfpa-postgresql pg_dump -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/postgresql_backup_$TIMESTAMP.sql.gz

# Redis backup
echo "Creating Redis backup..."
docker exec nfpa-redis redis-cli BGSAVE
docker cp nfpa-redis:/data/dump.rdb $BACKUP_DIR/redis_backup_$TIMESTAMP.rdb

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR"
echo "PostgreSQL: postgresql_backup_$TIMESTAMP.sql.gz"
echo "Redis: redis_backup_$TIMESTAMP.rdb"
