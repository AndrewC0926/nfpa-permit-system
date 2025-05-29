// Essential Audit Logging for NFPA System
const crypto = require('crypto');

class EssentialAuditLogger {
    constructor() {
        this.auditLogs = []; // In production, this would be a database
    }

    // Log important actions
    async logAction(action, details, user, context = {}) {
        const auditEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            action: action,
            
            // User information
            userId: user?.id,
            userRole: user?.role,
            userName: user?.username,
            
            // Action details
            details: details,
            
            // Context
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            sessionId: context.sessionId,
            
            // For compliance
            success: context.success !== false,
            errorMessage: context.errorMessage || null
        };

        // Store audit log
        this.auditLogs.push(auditEntry);
        
        // Also log to console for development
        console.log('📋 AUDIT:', JSON.stringify(auditEntry, null, 2));
        
        return auditEntry.id;
    }

    // Middleware to automatically log API actions
    auditMiddleware() {
        return async (req, res, next) => {
            // Capture response
            const originalSend = res.send;
            let responseBody;
            
            res.send = function(body) {
                responseBody = body;
                originalSend.call(this, body);
            };

            // Wait for request to complete
            res.on('finish', async () => {
                // Only audit important actions
                const auditableActions = [
                    'POST /api/permits',
                    'PUT /api/permits',
                    'DELETE /api/permits',
                    'POST /api/auth/login',
                    'POST /api/inspections',
                    'PUT /api/permits/*/status'
                ];

                const route = `${req.method} ${req.route?.path || req.path}`;
                const shouldAudit = auditableActions.some(pattern => 
                    route.match(pattern.replace('*', '.*'))
                );

                if (shouldAudit) {
                    const action = this.getActionName(req.method, req.path);
                    const details = this.getActionDetails(req, res);
                    
                    await this.logAction(action, details, req.user, {
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        sessionId: req.sessionID,
                        success: res.statusCode < 400
                    });
                }
            });

            next();
        };
    }

    // Get human-readable action name
    getActionName(method, path) {
        const actionMap = {
            'POST /api/permits': 'CREATE_PERMIT',
            'PUT /api/permits': 'UPDATE_PERMIT',
            'DELETE /api/permits': 'DELETE_PERMIT',
            'POST /api/auth/login': 'USER_LOGIN',
            'POST /api/inspections': 'CREATE_INSPECTION',
            'PUT /api/permits/*/status': 'UPDATE_PERMIT_STATUS'
        };

        const key = `${method} ${path}`.replace(/\/\d+/g, '/*');
        return actionMap[key] || `${method}_${path.replace(/\//g, '_')}`;
    }

    // Extract relevant details for audit
    getActionDetails(req, res) {
        const details = {};

        // For permit actions
        if (req.path.includes('/permits')) {
            details.permitId = req.params.id || req.body.id;
            details.permitType = req.body.projectDetails?.type;
            details.applicant = req.body.applicantInfo?.name;
        }

        // For inspection actions
        if (req.path.includes('/inspections')) {
            details.inspectionId = req.params.id || req.body.id;
            details.permitId = req.body.permitId;
            details.inspectionType = req.body.type;
        }

        // For status changes
        if (req.path.includes('/status')) {
            details.oldStatus = req.body.oldStatus;
            details.newStatus = req.body.status;
            details.comments = req.body.comments;
        }

        return details;
    }

    // Query audit logs (for compliance reports)
    async getAuditLogs(filters = {}) {
        let logs = [...this.auditLogs];

        // Filter by user
        if (filters.userId) {
            logs = logs.filter(log => log.userId === filters.userId);
        }

        // Filter by action
        if (filters.action) {
            logs = logs.filter(log => log.action === filters.action);
        }

        // Filter by date range
        if (filters.startDate) {
            logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
        }
        
        if (filters.endDate) {
            logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
        }

        // Sort by newest first
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return logs;
    }

    // Generate audit report for compliance
    async generateAuditReport(startDate, endDate) {
        const logs = await this.getAuditLogs({ startDate, endDate });
        
        const report = {
            period: { startDate, endDate },
            generatedAt: new Date().toISOString(),
            totalActions: logs.length,
            summary: {
                userLogins: logs.filter(l => l.action === 'USER_LOGIN').length,
                permitsCreated: logs.filter(l => l.action === 'CREATE_PERMIT').length,
                permitsUpdated: logs.filter(l => l.action === 'UPDATE_PERMIT').length,
                inspections: logs.filter(l => l.action === 'CREATE_INSPECTION').length,
                failedActions: logs.filter(l => !l.success).length
            },
            topUsers: this.getTopUsers(logs),
            detailedLogs: logs
        };

        return report;
    }

    getTopUsers(logs) {
        const userCounts = {};
        logs.forEach(log => {
            if (log.userId) {
                userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
            }
        });

        return Object.entries(userCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([userId, count]) => ({ userId, actionCount: count }));
    }
}

module.exports = EssentialAuditLogger;
