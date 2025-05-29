// Production Security Middleware for NFPA Permit System
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class SecurityMiddleware {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || this.generateSecret();
        this.apiKeys = new Map();
        this.setupMiddleware();
    }

    generateSecret() {
        return crypto.randomBytes(64).toString('hex');
    }

    setupMiddleware() {
        // Helmet for security headers
        this.helmetConfig = helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                },
            },
            crossOriginEmbedderPolicy: false
        });

        // Rate limiting
        this.rateLimiters = {
            general: rateLimit({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 100, // limit each IP to 100 requests per windowMs
                message: {
                    error: 'Too many requests from this IP, please try again later.'
                },
                standardHeaders: true,
                legacyHeaders: false,
            }),

            auth: rateLimit({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 5, // limit each IP to 5 login attempts per windowMs
                message: {
                    error: 'Too many authentication attempts, please try again later.'
                },
                skipSuccessfulRequests: true
            }),

            api: rateLimit({
                windowMs: 60 * 1000, // 1 minute
                max: 60, // limit each IP to 60 API requests per minute
                message: {
                    error: 'API rate limit exceeded, please slow down.'
                }
            })
        };
    }

    // JWT Authentication
    generateToken(payload, expiresIn = '24h') {
        return jwt.sign(payload, this.jwtSecret, { expiresIn });
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    // Authentication middleware
    authenticateJWT() {
        return (req, res, next) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader) {
                return res.status(401).json({ error: 'No authorization header' });
            }

            const token = authHeader.split(' ')[1]; // Bearer TOKEN
            
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            try {
                const decoded = this.verifyToken(token);
                req.user = decoded;
                next();
            } catch (error) {
                return res.status(403).json({ error: 'Invalid token' });
            }
        };
    }

    // API Key authentication for integrations
    authenticateAPIKey() {
        return (req, res, next) => {
            const apiKey = req.headers['x-api-key'];
            
            if (!apiKey) {
                return res.status(401).json({ error: 'API key required' });
            }

            // In production, validate against database
            const keyInfo = this.validateAPIKey(apiKey);
            if (!keyInfo) {
                return res.status(401).json({ error: 'Invalid API key' });
            }

            req.apiKey = keyInfo;
            next();
        };
    }

    validateAPIKey(apiKey) {
        // In production, this would query the database
        // For now, return mock validation
        return {
            id: 'api_key_123',
            name: 'City Integration Key',
            permissions: ['read_permits', 'write_permits'],
            tenantId: 'springfield'
        };
    }

    // Role-based access control
    requireRole(allowedRoles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const userRole = req.user.role;
            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    required: allowedRoles,
                    current: userRole
                });
            }

            next();
        };
    }

    // Tenant isolation middleware
    ensureTenantAccess() {
        return (req, res, next) => {
            const userTenant = req.user?.tenantId || req.apiKey?.tenantId;
            const requestedTenant = req.params.tenantId || req.query.tenantId;

            if (requestedTenant && userTenant !== requestedTenant) {
                // Check if user has multi-tenant access (admin)
                if (!req.user?.permissions?.includes('multi_tenant_access')) {
                    return res.status(403).json({ 
                        error: 'Access denied to requested tenant' 
                    });
                }
            }

            req.tenantId = userTenant;
            next();
        };
    }

    // Input validation and sanitization
    validateInput(schema) {
        return (req, res, next) => {
            const { error, value } = schema.validate(req.body);
            
            if (error) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.details.map(d => d.message)
                });
            }

            req.body = value; // Use sanitized values
            next();
        };
    }

    // Audit logging middleware
    auditLog() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            // Log the request
            const logData = {
                timestamp: new Date().toISOString(),
                method: req.method,
                url: req.url,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                userId: req.user?.id,
                tenantId: req.tenantId,
                requestId: crypto.randomUUID()
            };

            console.log('🔍 API Request:', JSON.stringify(logData));

            // Store original end function
            const originalEnd = res.end;
            
            // Override end function to log response
            res.end = function(chunk, encoding) {
                const responseTime = Date.now() - startTime;
                
                console.log('✅ API Response:', JSON.stringify({
                    ...logData,
                    statusCode: res.statusCode,
                    responseTime: `${responseTime}ms`
                }));

                // Call original end
                originalEnd.call(this, chunk, encoding);
            };

            next();
        };
    }

    // CORS configuration for production
    corsConfig() {
        return {
            origin: (origin, callback) => {
                // In production, maintain a whitelist of allowed origins
                const allowedOrigins = [
                    'https://permits.springfield-il.gov',
                    'https://admin.nfpa-permits.com',
                    'https://dashboard.nfpa-permits.com'
                ];

                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            optionsSuccessStatus: 200
        };
    }

    // Security headers middleware
    securityHeaders() {
        return (req, res, next) => {
            // Custom security headers
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
            
            next();
        };
    }

    // Request ID middleware for tracing
    requestId() {
        return (req, res, next) => {
            req.id = crypto.randomUUID();
            res.setHeader('X-Request-ID', req.id);
            next();
        };
    }

    // Error handling middleware
    errorHandler() {
        return (error, req, res, next) => {
            console.error('💥 API Error:', {
                requestId: req.id,
                error: error.message,
                stack: error.stack,
                url: req.url,
                method: req.method,
                userId: req.user?.id
            });

            // Don't leak error details in production
            const isDevelopment = process.env.NODE_ENV === 'development';
            
            res.status(error.status || 500).json({
                error: isDevelopment ? error.message : 'Internal server error',
                requestId: req.id,
                timestamp: new Date().toISOString()
            });
        };
    }

    // Combine all middleware for easy setup
    getAllMiddleware() {
        return {
            helmet: this.helmetConfig,
            rateLimiters: this.rateLimiters,
            authenticateJWT: this.authenticateJWT(),
            authenticateAPIKey: this.authenticateAPIKey(),
            requireRole: this.requireRole.bind(this),
            ensureTenantAccess: this.ensureTenantAccess(),
            auditLog: this.auditLog(),
            securityHeaders: this.securityHeaders(),
            requestId: this.requestId(),
            errorHandler: this.errorHandler()
        };
    }
}

module.exports = SecurityMiddleware;
