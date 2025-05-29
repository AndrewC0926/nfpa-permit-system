const express = require('express');
const cors = require('cors');
const path = require('path');

// Simple in-memory storage for development
const InMemoryDB = require('./database/in-memory-db');
const SecurityMiddleware = require('./middleware/security');
const EnterpriseGateway = require('./enterprise-gateway');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize components
const db = new InMemoryDB();
const security = new SecurityMiddleware();
const middleware = security.getAllMiddleware();

// Security middleware
app.use(middleware.securityHeaders);
app.use(middleware.requestId);
app.use(middleware.auditLog);

// CORS and parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting (relaxed for development)
app.use('/api', middleware.rateLimiters.api);

// Health check
app.get('/health', async (req, res) => {
    res.json({
        status: 'OK',
        service: 'NFPA Enterprise Permit System - Development',
        mode: 'in-memory',
        timestamp: new Date().toISOString()
    });
});

// Authentication
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (username === 'admin' && password === 'admin123') {
            const token = security.generateToken({
                id: 'admin',
                username: 'admin',
                role: 'admin',
                tenantId: 'demo',
                permissions: ['multi_tenant_access']
            });
            
            res.json({ success: true, token });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Permits API (simplified for demo)
app.get('/api/permits', async (req, res) => {
    try {
        const permits = await db.getAllPermits();
        res.json({ success: true, data: permits });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/permits', async (req, res) => {
    try {
        const permitData = {
            id: 'PERMIT_' + Date.now(),
            ...req.body,
            status: 'SUBMITTED',
            createdAt: new Date().toISOString()
        };
        
        const permit = await db.createPermit(permitData);
        res.status(201).json({ success: true, data: permit });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/permits/:id', async (req, res) => {
    try {
        const permit = await db.getPermit(req.params.id);
        if (!permit) {
            return res.status(404).json({ error: 'Permit not found' });
        }
        res.json({ success: true, data: permit });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling
app.use(middleware.errorHandler);

// Start server
async function startServer() {
    try {
        console.log('🔧 Starting development server with in-memory database...');
        
        // Add some demo data
        await db.seedDemoData();
        
        console.log('🔧 Starting Enterprise Gateway...');
        const gateway = new EnterpriseGateway();
        gateway.start(4000);
        
        app.listen(PORT, () => {
            console.log('🏛️ ==========================================');
            console.log('🏛️  NFPA Enterprise System - DEVELOPMENT');
            console.log('🏛️ ==========================================');
            console.log(`🚀 Main API: http://localhost:${PORT}`);
            console.log(`🏛️ Enterprise Gateway: http://localhost:4000`);
            console.log(`🔒 Security: JWT + Rate Limiting`);
            console.log(`💾 Database: In-Memory (Development)`);
            console.log(`✅ Ready for demo and testing!`);
            console.log('🏛️ ==========================================');
            console.log('');
            console.log('🧪 Test Commands:');
            console.log('curl http://localhost:3001/health');
            console.log('curl http://localhost:3001/api/permits');
            console.log('curl http://localhost:4000/health');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
