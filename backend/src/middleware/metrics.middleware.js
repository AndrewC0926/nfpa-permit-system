const prometheus = require('prom-client');
const { v4: uuidv4 } = require('uuid');

// Create a Registry to register metrics
const register = new prometheus.Registry();

// Add default metrics (CPU, memory, etc.)
prometheus.collectDefaultMetrics({ register });

// Create custom metrics
const httpRequestDurationMicroseconds = new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code', 'tenant_id'],
    buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new prometheus.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'tenant_id']
});

const activeConnections = new prometheus.Gauge({
    name: 'active_connections',
    help: 'Number of active connections',
    labelNames: ['tenant_id']
});

const blockchainTransactionsTotal = new prometheus.Counter({
    name: 'blockchain_transactions_total',
    help: 'Total number of blockchain transactions',
    labelNames: ['type', 'status', 'tenant_id']
});

const documentUploadsTotal = new prometheus.Counter({
    name: 'document_uploads_total',
    help: 'Total number of document uploads',
    labelNames: ['type', 'status', 'tenant_id']
});

// Register custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);
register.registerMetric(blockchainTransactionsTotal);
register.registerMetric(documentUploadsTotal);

// Middleware to track request metrics
const metricsMiddleware = (req, res, next) => {
    const start = Date.now();
    const requestId = uuidv4();
    const tenantId = req.headers['x-tenant-id'] || 'default';

    // Add requestId to request object
    req.requestId = requestId;
    req.tenantId = tenantId;

    // Add requestId to response headers
    res.setHeader('X-Request-ID', requestId);

    // Track active connections
    activeConnections.inc({ tenant_id: tenantId });

    // Response finished handler
    res.on('finish', () => {
        const duration = Date.now() - start;
        const route = req.route ? req.route.path : req.path;
        
        httpRequestDurationMicroseconds
            .labels(req.method, route, res.statusCode.toString(), tenantId)
            .observe(duration / 1000);

        httpRequestsTotal
            .labels(req.method, route, res.statusCode.toString(), tenantId)
            .inc();

        activeConnections.dec({ tenant_id: tenantId });
    });

    next();
};

// Metrics endpoint handler
const metricsHandler = async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
};

module.exports = {
    metricsMiddleware,
    metricsHandler,
    register,
    httpRequestDurationMicroseconds,
    httpRequestsTotal,
    activeConnections,
    blockchainTransactionsTotal,
    documentUploadsTotal
}; 