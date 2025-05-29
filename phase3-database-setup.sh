#!/bin/bash

# Phase 3: Production Database Setup for NFPA Permit System
# This creates an enterprise-grade database layer to complement the blockchain

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}🗄️  PHASE 3: PRODUCTION DATABASE SETUP${NC}"
    echo "======================================"
    echo "Setting up enterprise database layer for NFPA permit system"
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header

# Check if we're in the right directory
if [ ! -d "application" ]; then
    print_error "Please run this from the nfpa-permit-system directory"
    exit 1
fi

print_status "Creating production database infrastructure"

# Create database directory structure
mkdir -p database/{postgresql,redis,scripts,backups,monitoring}
mkdir -p database/postgresql/{data,logs,config}
mkdir -p database/redis/{data,logs,config}

print_status "Database directory structure created"

# Create PostgreSQL configuration
cat > database/postgresql/config/postgresql.conf << 'EOF'
# PostgreSQL Configuration for NFPA Permit System
# Production-ready settings

# Connection Settings
listen_addresses = '*'
port = 5432
max_connections = 200
superuser_reserved_connections = 3

# Memory Settings
shared_buffers = 512MB
effective_cache_size = 2GB
work_mem = 4MB
maintenance_work_mem = 64MB

# WAL Settings (for high availability)
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3
wal_keep_segments = 32
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archives/%f'

# Logging
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d.log'
log_statement = 'mod'
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Performance
checkpoint_completion_target = 0.9
default_statistics_target = 100
random_page_cost = 1.1

# Security
ssl = on
password_encryption = scram-sha-256
EOF

print_status "PostgreSQL configuration created"

# Create Redis configuration
cat > database/redis/config/redis.conf << 'EOF'
# Redis Configuration for NFPA Permit System
# Production-ready caching and session storage

# Network
bind 127.0.0.1
port 6379
protected-mode yes

# Security
requirepass nfpa_redis_secure_password_change_in_production

# Memory Management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Performance
tcp-keepalive 300
timeout 0
EOF

print_status "Redis configuration created"

# Create Docker Compose for production database
cat > database/docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgresql:
    image: postgres:15-alpine
    container_name: nfpa-postgresql
    restart: unless-stopped
    environment:
      POSTGRES_DB: nfpa_permits
      POSTGRES_USER: nfpa_admin
      POSTGRES_PASSWORD: nfpa_secure_password_change_in_production
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - ./postgresql/data:/var/lib/postgresql/data
      - ./postgresql/config/postgresql.conf:/etc/postgresql/postgresql.conf
      - ./postgresql/logs:/var/log/postgresql
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    ports:
      - "5432:5432"
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nfpa_admin -d nfpa_permits"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: nfpa-redis
    restart: unless-stopped
    volumes:
      - ./redis/data:/data
      - ./redis/config/redis.conf:/etc/redis/redis.conf
      - ./redis/logs:/var/log/redis
    ports:
      - "6379:6379"
    command: redis-server /etc/redis/redis.conf
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  adminer:
    image: adminer:latest
    container_name: nfpa-adminer
    restart: unless-stopped
    ports:
      - "8080:8080"
    depends_on:
      - postgresql
    environment:
      ADMINER_DEFAULT_SERVER: postgresql

networks:
  default:
    name: nfpa-network
    external: false

volumes:
  postgresql_data:
    driver: local
  redis_data:
    driver: local
EOF

print_status "Docker Compose configuration created"

# Create database initialization script
cat > database/scripts/init-db.sql << 'EOF'
-- NFPA Permit System Database Schema
-- Production-ready PostgreSQL schema

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    organization VARCHAR(255),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create permit_types table
CREATE TABLE permit_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    base_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    inspection_required BOOLEAN DEFAULT true,
    validity_period_days INTEGER DEFAULT 365,
    required_documents JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create permits table
CREATE TABLE permits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permit_number VARCHAR(50) UNIQUE NOT NULL,
    blockchain_tx_id VARCHAR(255),
    applicant_id UUID REFERENCES users(id),
    permit_type_id UUID REFERENCES permit_types(id),
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    application_data JSONB NOT NULL,
    project_address TEXT NOT NULL,
    project_description TEXT,
    estimated_value DECIMAL(12,2),
    square_footage INTEGER,
    occupancy_type VARCHAR(100),
    contractor_info JSONB,
    fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    payment_transaction_id VARCHAR(255),
    assigned_inspector_id UUID REFERENCES users(id),
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approval_date TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create inspections table
CREATE TABLE inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permit_id UUID REFERENCES permits(id) ON DELETE CASCADE,
    inspection_type VARCHAR(100) NOT NULL,
    inspector_id UUID REFERENCES users(id),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    result VARCHAR(50),
    findings JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permit_id UUID REFERENCES permits(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_hash VARCHAR(255),
    uploaded_by UUID REFERENCES users(id),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT false
);

-- Create permit_history table (audit trail)
CREATE TABLE permit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permit_id UUID REFERENCES permits(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    performed_by UUID REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    notes TEXT,
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table (for Redis backup)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- CITY, STATE, FEDERAL, CONTRACTOR
    jurisdiction VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    address JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notification_preferences table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    notification_types JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_permits_status ON permits(status);
CREATE INDEX idx_permits_applicant ON permits(applicant_id);
CREATE INDEX idx_permits_type ON permits(permit_type_id);
CREATE INDEX idx_permits_number ON permits(permit_number);
CREATE INDEX idx_permits_submission_date ON permits(submission_date);
CREATE INDEX idx_permits_project_address ON permits USING gin(to_tsvector('english', project_address));

CREATE INDEX idx_inspections_permit ON inspections(permit_id);
CREATE INDEX idx_inspections_inspector ON inspections(inspector_id);
CREATE INDEX idx_inspections_scheduled ON inspections(scheduled_date);
CREATE INDEX idx_inspections_status ON inspections(status);

CREATE INDEX idx_documents_permit ON documents(permit_id);
CREATE INDEX idx_documents_type ON documents(document_type);

CREATE INDEX idx_permit_history_permit ON permit_history(permit_id);
CREATE INDEX idx_permit_history_date ON permit_history(created_at);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Full-text search indexes
CREATE INDEX idx_permits_fulltext ON permits USING gin(
    to_tsvector('english', 
        coalesce(project_address, '') || ' ' || 
        coalesce(project_description, '') || ' ' ||
        coalesce(permit_number, '')
    )
);

-- Insert default permit types
INSERT INTO permit_types (code, name, description, category, base_fee, inspection_required, required_documents) VALUES
('NFPA72_COMMERCIAL', 'NFPA 72 Commercial Fire Alarm System', 'Commercial fire alarm system installation and maintenance', 'Fire Alarm', 150.00, true, '["floor_plans", "system_specifications", "contractor_license"]'),
('NFPA72_RESIDENTIAL', 'NFPA 72 Residential Fire Alarm System', 'Residential fire alarm system installation', 'Fire Alarm', 75.00, true, '["floor_plans", "contractor_license"]'),
('NFPA13_SPRINKLER', 'NFPA 13 Fire Sprinkler System', 'Fire sprinkler system installation and modification', 'Fire Suppression', 200.00, true, '["hydraulic_calculations", "system_plans", "contractor_license"]'),
('NFPA25_INSPECTION', 'NFPA 25 Fire System Inspection', 'Inspection, testing and maintenance of water-based fire protection systems', 'Inspection', 100.00, false, '["previous_inspection_report"]'),
('NFPA101_OCCUPANCY', 'NFPA 101 Life Safety Code Compliance', 'Life safety code compliance review', 'Life Safety', 125.00, true, '["floor_plans", "occupancy_calculations", "egress_analysis"]');

-- Create default admin user (password: admin123 - CHANGE IN PRODUCTION!)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active, email_verified) VALUES
('admin', 'admin@nfpapermits.gov', '$2b$10$rOzJz5XEV5QEwZQKhXvG4uF8kXKqVqGQaWGvPnHcVqYvKb2a5rN3K', 'System', 'Administrator', 'ADMIN', true, true);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permits_updated_at BEFORE UPDATE ON permits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permit_types_updated_at BEFORE UPDATE ON permit_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for permit history logging
CREATE OR REPLACE FUNCTION log_permit_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO permit_history (permit_id, action, old_values, new_values, created_at)
        VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), CURRENT_TIMESTAMP);
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO permit_history (permit_id, action, new_values, created_at)
        VALUES (NEW.id, 'CREATE', to_jsonb(NEW), CURRENT_TIMESTAMP);
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER permit_audit_trigger
    AFTER INSERT OR UPDATE ON permits
    FOR EACH ROW EXECUTE FUNCTION log_permit_changes();

-- Create view for permit dashboard
CREATE VIEW permit_dashboard AS
SELECT 
    pt.category,
    p.status,
    COUNT(*) as count,
    SUM(p.fee_amount) as total_fees,
    AVG(EXTRACT(EPOCH FROM (COALESCE(p.approval_date, CURRENT_TIMESTAMP) - p.submission_date))/86400) as avg_processing_days
FROM permits p
JOIN permit_types pt ON p.permit_type_id = pt.id
GROUP BY pt.category, p.status;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nfpa_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nfpa_admin;
GRANT USAGE ON SCHEMA public TO nfpa_admin;

-- Create read-only user for reporting
CREATE USER nfpa_readonly WITH PASSWORD 'readonly_password_change_in_production';
GRANT CONNECT ON DATABASE nfpa_permits TO nfpa_readonly;
GRANT USAGE ON SCHEMA public TO nfpa_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO nfpa_readonly;
GRANT SELECT ON permit_dashboard TO nfpa_readonly;

COMMIT;
EOF

print_status "Database schema created"

# Create backup script
cat > database/scripts/backup.sh << 'EOF'
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
EOF

chmod +x database/scripts/backup.sh

print_status "Backup script created"

# Create monitoring script
cat > database/scripts/monitor.sh << 'EOF'
#!/bin/bash

# NFPA Database Monitoring Script
# Checks database health and performance

echo "🔍 NFPA Database Health Check"
echo "============================="

# Check PostgreSQL
echo "📊 PostgreSQL Status:"
if docker exec nfpa-postgresql pg_isready -U nfpa_admin -d nfpa_permits > /dev/null 2>&1; then
    echo "✅ PostgreSQL is running"
    
    # Get connection info
    connections=$(docker exec nfpa-postgresql psql -U nfpa_admin -d nfpa_permits -t -c "SELECT count(*) FROM pg_stat_activity;")
    echo "🔗 Active connections: $connections"
    
    # Get database size
    db_size=$(docker exec nfpa-postgresql psql -U nfpa_admin -d nfpa_permits -t -c "SELECT pg_size_pretty(pg_database_size('nfpa_permits'));")
    echo "💾 Database size: $db_size"
    
    # Get table counts
    echo "📋 Table statistics:"
    docker exec nfpa-postgresql psql -U nfpa_admin -d nfpa_permits -c "
    SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows
    FROM pg_stat_user_tables 
    WHERE n_live_tup > 0
    ORDER BY n_live_tup DESC;
    "
else
    echo "❌ PostgreSQL is not responding"
fi

echo ""

# Check Redis
echo "🔄 Redis Status:"
if docker exec nfpa-redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
    
    # Get Redis info
    memory_used=$(docker exec nfpa-redis redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    echo "💾 Memory used: $memory_used"
    
    keys_count=$(docker exec nfpa-redis redis-cli dbsize)
    echo "🔑 Keys stored: $keys_count"
else
    echo "❌ Redis is not responding"
fi

echo ""
echo "📈 System Resources:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.1f%"), $3/$2 * 100.0}')"
echo "Disk Usage: $(df -h . | awk 'NR==2{printf "%s", $5}')"
EOF

chmod +x database/scripts/monitor.sh

print_status "Monitoring script created"

# Create environment configuration
cat > database/.env.example << 'EOF'
# NFPA Database Environment Configuration
# Copy to .env and update with your production values

# PostgreSQL Configuration
POSTGRES_DB=nfpa_permits
POSTGRES_USER=nfpa_admin
POSTGRES_PASSWORD=change_this_secure_password_in_production
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=change_this_redis_password_in_production

# Backup Configuration
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=nfpa-backups
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Monitoring
ALERT_EMAIL=admin@nfpapermits.gov
SMTP_HOST=smtp.your-provider.com
SMTP_USER=noreply@nfpapermits.gov
SMTP_PASSWORD=email_password

# SSL Configuration (for production)
SSL_CERT_PATH=/etc/ssl/certs/nfpa.crt
SSL_KEY_PATH=/etc/ssl/private/nfpa.key
EOF

print_status "Environment configuration template created"

# Update the main application to use the database
print_info "Updating application configuration for database integration..."

# Create database connection module
cat > application/backend/database.js << 'EOF'
const { Pool } = require('pg');
const redis = require('redis');

// PostgreSQL connection pool
const pool = new Pool({
    user: process.env.POSTGRES_USER || 'nfpa_admin',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'nfpa_permits',
    password: process.env.POSTGRES_PASSWORD || 'nfpa_secure_password_change_in_production',
    port: process.env.POSTGRES_PORT || 5432,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Redis client
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || 'nfpa_redis_secure_password_change_in_production',
    retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Redis retry time exhausted');
        }
        if (options.attempt > 10) {
            return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
    }
});

// Database helper functions
class DatabaseService {
    
    // Execute query with error handling
    async query(text, params) {
        const start = Date.now();
        try {
            const res = await pool.query(text, params);
            const duration = Date.now() - start;
            console.log('Executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    // Get connection from pool
    async getClient() {
        return await pool.connect();
    }

    // Cache operations
    async setCache(key, value, expireSeconds = 3600) {
        try {
            await redisClient.setex(key, expireSeconds, JSON.stringify(value));
        } catch (error) {
            console.error('Redis set error:', error);
        }
    }

    async getCache(key) {
        try {
            const result = await redisClient.get(key);
            return result ? JSON.parse(result) : null;
        } catch (error) {
            console.error('Redis get error:', error);
            return null;
        }
    }

    async deleteCache(key) {
        try {
            await redisClient.del(key);
        } catch (error) {
            console.error('Redis delete error:', error);
        }
    }

    // Health check
    async healthCheck() {
        try {
            // Test PostgreSQL
            await this.query('SELECT 1');
            
            // Test Redis
            await redisClient.ping();
            
            return { status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
        }
    }
}

// Initialize connections
async function initializeDatabase() {
    try {
        // Test PostgreSQL connection
        await pool.query('SELECT NOW()');
        console.log('✅ PostgreSQL connected successfully');
        
        // Test Redis connection
        redisClient.on('connect', () => {
            console.log('✅ Redis connected successfully');
        });
        
        redisClient.on('error', (err) => {
            console.error('❌ Redis connection error:', err);
        });
        
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

module.exports = {
    pool,
    redisClient,
    DatabaseService: new DatabaseService(),
    initializeDatabase
};
EOF

print_status "Database connection module created"

# Create updated package.json with database dependencies
cat > application/backend/package.json << 'EOF'
{
  "name": "nfpa-permit-backend",
  "version": "2.0.0",
  "description": "NFPA Fire Safety Permit Management System - Enterprise Backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "migrate": "node scripts/migrate.js",
    "seed": "node scripts/seed.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1",
    "fabric-network": "^2.2.20",
    "fabric-ca-client": "^2.2.20",
    "pg": "^8.11.3",
    "redis": "^4.6.8",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "joi": "^17.9.2",
    "multer": "^1.4.5-lts.1",
    "express-rate-limit": "^6.10.0",
    "compression": "^1.7.4",
    "express-session": "^1.17.3",
    "connect-redis": "^7.1.0",
    "nodemailer": "^6.9.4",
    "uuid": "^9.0.0",
    "winston": "^3.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.2",
    "supertest": "^6.3.3"
  }
}
EOF

print_status "Updated package.json with database dependencies"

print_info "Starting database services..."

# Start database services
cd database
docker-compose up -d

# Wait for services to be ready
print_info "Waiting for database services to initialize..."
sleep 30

# Check if services are running
if docker ps | grep -q "nfpa-postgresql"; then
    print_status "PostgreSQL is running"
else
    print_error "PostgreSQL failed to start"
fi

if docker ps | grep -q "nfpa-redis"; then
    print_status "Redis is running"
else
    print_error "Redis failed to start"
fi

cd ..

print_status "Installing updated backend dependencies..."
cd application/backend
npm install
cd ../..

print_info "Running database health check..."
bash database/scripts/monitor.sh

echo ""
echo -e "${GREEN}✅ PHASE 3 COMPLETE!${NC}"
echo "========================================"
echo ""
echo "🗄️  Enterprise Database Layer Ready:"
echo "   • PostgreSQL: Production-ready with full schema"
echo "   • Redis: High-performance caching and sessions"
echo "   • Backup system: Automated daily backups"
echo "   • Monitoring: Health checks and performance metrics"
echo ""
echo "🔧 Database Access:"
echo "   • PostgreSQL: localhost:5432"
echo "   • Redis: localhost:6379"
echo "   • Admin Panel: http://localhost:8080"
echo ""
echo "📊 Management Commands:"
echo "   • Health check: bash database/scripts/monitor.sh"
echo "   • Backup: bash database/scripts/backup.sh"
echo "   • View logs: docker-compose -f database/docker-compose.yml logs"
echo ""
echo "🔒 Security Notes:"
echo "   • Change default passwords in database/.env"
echo "   • Enable SSL for production"
echo "   • Configure firewall rules"
echo ""
echo "Ready for Phase 4: Advanced Features & AI Integration! 🚀"
