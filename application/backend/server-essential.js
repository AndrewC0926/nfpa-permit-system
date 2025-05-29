// Essential Security Server for NFPA System
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// Essential security modules
const EssentialRBAC = require('./middleware/rbac');
const EssentialAuditLogger = require('./middleware/audit-logger');
// const EssentialSSO = require('./middleware/sso'); // Commented out for now
const InMemoryDB = require('./database/in-memory-db');

const app = express();
const PORT = process.env.PORT || 3003;

// Initialize components
const rbac = new EssentialRBAC();
const auditLogger = new EssentialAuditLogger();
// const sso = new EssentialSSO(); // Commented out for now
const db = new InMemoryDB();

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// JWT Authentication middleware
function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
}

// Audit logging middleware
app.use(auditLogger.auditMiddleware());

// SSO middleware (commented out)
// app.use(sso.ssoMiddleware());

// =============================================
// PUBLIC ROUTES (No authentication required)
// =============================================

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'NFPA Essential Security System',
        features: ['RBAC', 'Audit Logging', 'JWT Auth'],
        timestamp: new Date().toISOString()
    });
});

// Regular login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Mock authentication (replace with real user verification)
        const users = {
            'admin': { id: 'admin', username: 'admin', role: 'ADMIN', name: 'System Admin' },
            'marshal': { id: 'marshal', username: 'marshal', role: 'FIRE_MARSHAL', name: 'Fire Marshal' },
            'inspector': { id: 'inspector', username: 'inspector', role: 'INSPECTOR', name: 'Inspector Smith' },
            'contractor': { id: 'contractor', username: 'contractor', role: 'CONTRACTOR', name: 'ABC Fire Co' }
        };
        
        const user = users[username];
        if (user && password === 'password123') {
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                process.env.JWT_SECRET || 'dev-secret',
                { expiresIn: '8h' }
            );
            
            await auditLogger.logAction('USER_LOGIN', { username }, user, {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                success: true
            });
            
            res.json({ 
                success: true, 
                token,
                user: { id: user.id, username: user.username, role: user.role, name: user.name }
            });
        } else {
            await auditLogger.logAction('USER_LOGIN', { username }, null, {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                success: false,
                errorMessage: 'Invalid credentials'
            });
            
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// PROTECTED ROUTES (Authentication required)
// =============================================

// Get user profile
app.get('/api/profile', authenticateJWT, (req, res) => {
    const availableActions = {
        permits: rbac.getAvailableActions(req.user.role, 'permits'),
        inspections: rbac.getAvailableActions(req.user.role, 'inspections'),
        reports: rbac.getAvailableActions(req.user.role, 'reports')
    };

    res.json({
        user: req.user,
        permissions: availableActions,
        role: req.user.role
    });
});

// =============================================
// PERMIT MANAGEMENT (Role-based access)
// =============================================

// Get permits (all users can read permits they have access to)
app.get('/api/permits', 
    authenticateJWT,
    rbac.requirePermission('permits:read'),
    async (req, res) => {
        try {
            let permits = await db.getAllPermits();
            
            // Contractors can only see their own permits
            if (req.user.role === 'CONTRACTOR') {
                permits = permits.filter(permit => 
                    permit.applicantInfo?.createdBy === req.user.id
                );
            }
            
            res.json({ success: true, data: permits });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// Create permit (contractors and clerks)
app.post('/api/permits', 
    authenticateJWT,
    rbac.requirePermission('permits:create'),
    async (req, res) => {
        try {
            const permitData = {
                id: 'PERMIT_' + Date.now(),
                ...req.body,
                createdBy: req.user.id,
                createdAt: new Date().toISOString(),
                status: 'SUBMITTED'
            };
            
            const permit = await db.createPermit(permitData);
            
            await auditLogger.logAction('CREATE_PERMIT', {
                permitId: permit.id,
                permitType: permitData.projectDetails?.type,
                applicant: permitData.applicantInfo?.name
            }, req.user, {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            res.status(201).json({ success: true, data: permit });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// Update permit status (Fire Marshals and Clerks only)
app.put('/api/permits/:id/status', 
    authenticateJWT,
    rbac.requirePermission('permits:update_status'),
    async (req, res) => {
        try {
            const { status, comments } = req.body;
            const permitId = req.params.id;
            
            const permit = await db.getPermit(permitId);
            if (!permit) {
                return res.status(404).json({ error: 'Permit not found' });
            }
            
            const oldStatus = permit.status;
            const updatedPermit = await db.updatePermit(permitId, { 
                status, 
                comments,
                lastModifiedBy: req.user.id 
            });
            
            await auditLogger.logAction('UPDATE_PERMIT_STATUS', {
                permitId,
                oldStatus,
                newStatus: status,
                comments
            }, req.user, {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            res.json({ success: true, data: updatedPermit });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// =============================================
// INSPECTION MANAGEMENT
// =============================================

// Create inspection (Inspectors and Fire Marshals)
app.post('/api/inspections', 
    authenticateJWT,
    rbac.requirePermission('inspections:create'),
    async (req, res) => {
        try {
            const inspectionData = {
                id: 'INSP_' + Date.now(),
                ...req.body,
                inspector: req.user.id,
                createdAt: new Date().toISOString(),
                status: 'SCHEDULED'
            };
            
            // Store inspection (mock)
            console.log('Creating inspection:', inspectionData);
            
            await auditLogger.logAction('CREATE_INSPECTION', {
                inspectionId: inspectionData.id,
                permitId: inspectionData.permitId,
                inspectionType: inspectionData.type
            }, req.user, {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            res.status(201).json({ success: true, data: inspectionData });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// =============================================
// ADMIN ROUTES (Admins only)
// =============================================

// Get audit logs
app.get('/api/admin/audit-logs', 
    authenticateJWT,
    rbac.requirePermission('*'), // Admin only
    async (req, res) => {
        try {
            const filters = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                userId: req.query.userId,
                action: req.query.action
            };
            
            const logs = await auditLogger.getAuditLogs(filters);
            res.json({ success: true, data: logs });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// Generate audit report
app.get('/api/admin/audit-report', 
    authenticateJWT,
    rbac.requirePermission('*'), // Admin only
    async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            const report = await auditLogger.generateAuditReport(startDate, endDate);
            
            res.json({ success: true, data: report });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// Get system statistics
app.get('/api/admin/stats', 
    authenticateJWT,
    rbac.requirePermission('*'), // Admin only
    async (req, res) => {
        try {
            const permits = await db.getAllPermits();
            const logs = await auditLogger.getAuditLogs();
            
            const stats = {
                totalPermits: permits.length,
                permitsByStatus: permits.reduce((acc, permit) => {
                    acc[permit.status] = (acc[permit.status] || 0) + 1;
                    return acc;
                }, {}),
                totalAuditEvents: logs.length,
                activeUsers: [...new Set(logs.map(log => log.userId))].length,
                systemHealth: 'HEALTHY'
            };
            
            res.json({ success: true, data: stats });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// Error handling
app.use((error, req, res, next) => {
    console.error('API Error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        requestId: req.id 
    });
});

// Start server
async function startServer() {
    try {
        // Seed demo data
        await db.seedDemoData();
        
        app.listen(PORT, () => {
            console.log('🏛️ ==========================================');
            console.log('🏛️  NFPA Essential Security System');
            console.log('🏛️ ==========================================');
            console.log(`🚀 Server: http://localhost:${PORT}`);
            console.log(`📊 Health: http://localhost:${PORT}/health`);
            console.log('');
            console.log('✅ Essential Features Active:');
            console.log('  🔐 Role-Based Access Control (RBAC)');
            console.log('  📋 Comprehensive Audit Logging');
            console.log('  🛡️ JWT Authentication');
            console.log('');
            console.log('👥 Demo Users:');
            console.log('  admin/password123 (ADMIN)');
            console.log('  marshal/password123 (FIRE_MARSHAL)');
            console.log('  inspector/password123 (INSPECTOR)');
            console.log('  contractor/password123 (CONTRACTOR)');
            console.log('🏛️ ==========================================');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
