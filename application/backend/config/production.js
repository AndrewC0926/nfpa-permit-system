// Production Configuration for NFPA Permit System
module.exports = {
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'nfpa_permits',
        username: process.env.DB_USERNAME || 'nfpa_user',
        password: process.env.DB_PASSWORD || 'secure_password',
        ssl: process.env.NODE_ENV === 'production'
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_AUTH_TOKEN || null
    },
    security: {
        jwtSecret: process.env.JWT_SECRET || 'your-super-secure-jwt-secret',
        bcryptRounds: 12,
        sessionTimeout: '24h'
    },
    server: {
        port: process.env.PORT || 3001,
        environment: process.env.NODE_ENV || 'development'
    }
};
