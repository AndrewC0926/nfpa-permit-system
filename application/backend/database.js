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
