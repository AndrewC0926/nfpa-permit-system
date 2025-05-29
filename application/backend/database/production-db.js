// Production Database Layer for NFPA Permit System
const { Pool } = require('pg');
const Redis = require('ioredis');

class ProductionDatabase {
    constructor() {
        this.pgPool = null;
        this.redis = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            // PostgreSQL connection pool
            this.pgPool = new Pool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 5432,
                database: process.env.DB_NAME,
                user: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
                max: 20, // Maximum pool size
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            // Redis connection for caching and sessions
            this.redis = new Redis({
                host: process.env.REDIS_HOST,
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_AUTH_TOKEN,
                retryDelayOnFailover: 100,
                enableReadyCheck: false,
                maxRetriesPerRequest: null,
            });

            // Test connections
            await this.testConnections();
            await this.createTables();
            
            this.initialized = true;
            console.log('✅ Production database initialized');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    async testConnections() {
        // Test PostgreSQL
        const client = await this.pgPool.connect();
        await client.query('SELECT NOW()');
        client.release();

        // Test Redis
        await this.redis.ping();
        
        console.log('✅ Database connections verified');
    }

    async createTables() {
        const client = await this.pgPool.connect();
        
        try {
            // Create permits table
            await client.query(`
                CREATE TABLE IF NOT EXISTS permits (
                    id VARCHAR(255) PRIMARY KEY,
                    tenant_id VARCHAR(100) NOT NULL,
                    blockchain_hash VARCHAR(255) UNIQUE,
                    permit_data JSONB NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX(tenant_id),
                    INDEX(status),
                    INDEX(created_at)
                );
            `);

            // Create audit trail table
            await client.query(`
                CREATE TABLE IF NOT EXISTS audit_trail (
                    id SERIAL PRIMARY KEY,
                    permit_id VARCHAR(255) NOT NULL,
                    action VARCHAR(100) NOT NULL,
                    old_data JSONB,
                    new_data JSONB,
                    user_id VARCHAR(255),
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ip_address INET,
                    user_agent TEXT,
                    INDEX(permit_id),
                    INDEX(timestamp),
                    FOREIGN KEY (permit_id) REFERENCES permits(id)
                );
            `);

            // Create integration sync table
            await client.query(`
                CREATE TABLE IF NOT EXISTS integration_sync (
                    id SERIAL PRIMARY KEY,
                    permit_id VARCHAR(255) NOT NULL,
                    external_system VARCHAR(100) NOT NULL,
                    external_id VARCHAR(255),
                    sync_status VARCHAR(50) NOT NULL,
                    last_sync TIMESTAMP,
                    error_message TEXT,
                    retry_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX(permit_id),
                    INDEX(external_system),
                    INDEX(sync_status),
                    FOREIGN KEY (permit_id) REFERENCES permits(id)
                );
            `);

            // Create tenant configuration table
            await client.query(`
                CREATE TABLE IF NOT EXISTS tenant_config (
                    tenant_id VARCHAR(100) PRIMARY KEY,
                    tenant_name VARCHAR(255) NOT NULL,
                    domain VARCHAR(255),
                    config JSONB NOT NULL,
                    active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            console.log('✅ Database tables created/verified');
        } finally {
            client.release();
        }
    }

    // Permit operations
    async createPermit(permitData, tenantId) {
        const client = await this.pgPool.connect();
        
        try {
            await client.query('BEGIN');
            
            const result = await client.query(
                'INSERT INTO permits (id, tenant_id, permit_data, status) VALUES ($1, $2, $3, $4) RETURNING *',
                [permitData.id, tenantId, JSON.stringify(permitData), 'SUBMITTED']
            );

            // Add to audit trail
            await this.addAuditEntry(permitData.id, 'CREATED', null, permitData, client);
            
            await client.query('COMMIT');
            
            // Cache in Redis
            await this.cachePermit(permitData.id, result.rows[0]);
            
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updatePermit(permitId, updates, userId) {
        const client = await this.pgPool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Get current data for audit
            const current = await client.query('SELECT * FROM permits WHERE id = $1', [permitId]);
            if (current.rows.length === 0) {
                throw new Error('Permit not found');
            }

            const oldData = current.rows[0];
            const newData = { ...oldData.permit_data, ...updates };
            
            const result = await client.query(
                'UPDATE permits SET permit_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                [JSON.stringify(newData), permitId]
            );

            // Add to audit trail
            await this.addAuditEntry(permitId, 'UPDATED', oldData.permit_data, newData, client, userId);
            
            await client.query('COMMIT');
            
            // Update cache
            await this.cachePermit(permitId, result.rows[0]);
            
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getPermit(permitId) {
        // Try cache first
        const cached = await this.redis.get(`permit:${permitId}`);
        if (cached) {
            return JSON.parse(cached);
        }

        // Fallback to database
        const result = await this.pgPool.query('SELECT * FROM permits WHERE id = $1', [permitId]);
        if (result.rows.length === 0) {
            return null;
        }

        const permit = result.rows[0];
        await this.cachePermit(permitId, permit);
        return permit;
    }

    async getPermitsByTenant(tenantId, filters = {}) {
        let query = 'SELECT * FROM permits WHERE tenant_id = $1';
        const params = [tenantId];
        
        if (filters.status) {
            query += ' AND status = $2';
            params.push(filters.status);
        }
        
        if (filters.dateFrom) {
            query += ` AND created_at >= $${params.length + 1}`;
            params.push(filters.dateFrom);
        }
        
        if (filters.dateTo) {
            query += ` AND created_at <= $${params.length + 1}`;
            params.push(filters.dateTo);
        }
        
        query += ' ORDER BY created_at DESC';
        
        if (filters.limit) {
            query += ` LIMIT $${params.length + 1}`;
            params.push(filters.limit);
        }

        const result = await this.pgPool.query(query, params);
        return result.rows;
    }

    async addAuditEntry(permitId, action, oldData, newData, client, userId = null) {
        await client.query(
            'INSERT INTO audit_trail (permit_id, action, old_data, new_data, user_id) VALUES ($1, $2, $3, $4, $5)',
            [
                permitId,
                action,
                oldData ? JSON.stringify(oldData) : null,
                newData ? JSON.stringify(newData) : null,
                userId
            ]
        );
    }

    async cachePermit(permitId, permit, ttl = 3600) {
        await this.redis.setex(`permit:${permitId}`, ttl, JSON.stringify(permit));
    }

    async invalidateCache(permitId) {
        await this.redis.del(`permit:${permitId}`);
    }

    // Integration sync tracking
    async recordSync(permitId, externalSystem, externalId, status, errorMessage = null) {
        await this.pgPool.query(
            `INSERT INTO integration_sync (permit_id, external_system, external_id, sync_status, error_message, last_sync)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
             ON CONFLICT (permit_id, external_system) 
             DO UPDATE SET external_id = $3, sync_status = $4, error_message = $5, last_sync = CURRENT_TIMESTAMP, retry_count = retry_count + 1`,
            [permitId, externalSystem, externalId, status, errorMessage]
        );
    }

    // Analytics and reporting
    async getTenantStats(tenantId, dateFrom, dateTo) {
        const result = await this.pgPool.query(`
            SELECT 
                COUNT(*) as total_permits,
                COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_permits,
                COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_permits,
                COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_permits,
                AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_processing_days
            FROM permits 
            WHERE tenant_id = $1 
            AND created_at BETWEEN $2 AND $3
        `, [tenantId, dateFrom, dateTo]);

        return result.rows[0];
    }

    // Health check
    async healthCheck() {
        try {
            // Check PostgreSQL
            const pgResult = await this.pgPool.query('SELECT 1');
            
            // Check Redis
            const redisResult = await this.redis.ping();
            
            return {
                postgresql: pgResult.rowCount === 1,
                redis: redisResult === 'PONG',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                postgresql: false,
                redis: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async close() {
        if (this.pgPool) {
            await this.pgPool.end();
        }
        if (this.redis) {
            this.redis.disconnect();
        }
    }
}

module.exports = ProductionDatabase;
