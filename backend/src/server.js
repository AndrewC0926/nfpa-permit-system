const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const winston = require('winston');
require('dotenv').config();

// Import routes
const permitRoutes = require('./routes/permits');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const inspectionRoutes = require('./routes/inspections');

const app = express();
const PORT = process.env.PORT || 3001;

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100,
  message: 'Too many requests from this IP'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NFPA Permit Management System API',
      version: '2.0.0',
      description: 'Enterprise API for NFPA fire safety permit management'
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: 'Development server'
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'NFPA Fire Safety Permit Management System',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// System status
app.get('/api/status', (req, res) => {
  res.json({
    system: 'NFPA Permit Management System',
    status: 'Active',
    version: '2.0.0',
    features: [
      'NFPA 72 Fire Alarm Permits',
      'NFPA 13 Sprinkler Permits', 
      'NFPA 25 Inspection Permits',
      'Blockchain Audit Trail',
      'Multi-organization Workflow',
      'Enterprise Security',
      'Government Compliance',
      'Real-time Dashboard',
      'Document Management',
      'Payment Processing Ready'
    ],
    permitTypes: {
      'NFPA72_COMMERCIAL': {
        name: 'Commercial Fire Alarm System',
        fee: 150.00,
        inspectionRequired: true
      },
      'NFPA72_RESIDENTIAL': {
        name: 'Residential Fire Alarm System', 
        fee: 75.00,
        inspectionRequired: true
      },
      'NFPA13_SPRINKLER': {
        name: 'Fire Sprinkler System',
        fee: 200.00,
        inspectionRequired: true
      },
      'NFPA25_INSPECTION': {
        name: 'Fire System Inspection',
        fee: 100.00,
        inspectionRequired: false
      }
    },
    ready: true,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/permits', permitRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/inspections', inspectionRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down NFPA Permit System...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down NFPA Permit System...');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info('🏛️ ==========================================');
  logger.info('🏛️  NFPA Permit Management System v2.0');
  logger.info('🏛️  Enterprise Government Solution');
  logger.info('🏛️ ==========================================');
  logger.info(`🚀 Server: http://localhost:${PORT}`);
  logger.info(`📊 Health: http://localhost:${PORT}/health`);
  logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  logger.info(`📋 Permits: http://localhost:${PORT}/api/permits`);
  logger.info(`📈 Status: http://localhost:${PORT}/api/status`);
  logger.info('✅ Ready for enterprise deployment');
  logger.info('🏛️ ==========================================');
});

module.exports = app;
