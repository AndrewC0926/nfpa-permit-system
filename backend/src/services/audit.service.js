const winston = require('winston');
const { createLogger, format, transports } = winston;
const path = require('path');
const fs = require('fs');

// Fail fast if run as root or with sudo
if (typeof process.getuid === 'function' && process.getuid() === 0) {
  // eslint-disable-next-line no-console
  console.error('❌ Do not run the backend as root or with sudo. Exiting.');
  process.exit(1);
}
if (process.env.SUDO_USER) {
  // eslint-disable-next-line no-console
  console.error('❌ Do not run the backend with sudo. Exiting.');
  process.exit(1);
}

// Ensure audit log directory exists and is owned by the current user
const auditLogDir = path.join(__dirname, '../../logs/audit');
if (!fs.existsSync(auditLogDir)) {
    fs.mkdirSync(auditLogDir, { recursive: true });
}
try {
  if (typeof process.getuid === 'function' && typeof process.getgid === 'function') {
    fs.chownSync(auditLogDir, process.getuid(), process.getgid());
  }
} catch (e) {
  // Ignore if not permitted, but warn
  // eslint-disable-next-line no-console
  console.warn('Warning: Could not set ownership of audit log directory.');
}

// Create audit logger
const auditLogger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    defaultMeta: { service: 'audit-service' },
    transports: [
        new transports.File({
            filename: path.join(auditLogDir, 'audit.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        })
    ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    auditLogger.add(new transports.Console({
        format: format.simple()
    }));
}

class AuditService {
    // Log permit status change
    static async logPermitStatusChange(permitId, oldStatus, newStatus, userId, organization) {
        auditLogger.info('Permit status change', {
            event: 'PERMIT_STATUS_CHANGE',
            permitId,
            oldStatus,
            newStatus,
            userId,
            organization,
            timestamp: new Date().toISOString()
        });
    }

    // Log document upload
    static async logDocumentUpload(documentId, permitId, userId, organization, fileInfo) {
        auditLogger.info('Document upload', {
            event: 'DOCUMENT_UPLOAD',
            documentId,
            permitId,
            userId,
            organization,
            fileInfo,
            timestamp: new Date().toISOString()
        });
    }

    // Log blockchain transaction
    static async logBlockchainTransaction(txId, action, userId, organization, details) {
        auditLogger.info('Blockchain transaction', {
            event: 'BLOCKCHAIN_TRANSACTION',
            txId,
            action,
            userId,
            organization,
            details,
            timestamp: new Date().toISOString()
        });
    }

    // Log user authentication
    static async logAuthentication(userId, action, success, ipAddress) {
        auditLogger.info('Authentication event', {
            event: 'AUTHENTICATION',
            userId,
            action,
            success,
            ipAddress,
            timestamp: new Date().toISOString()
        });
    }

    // Log system event
    static async logSystemEvent(event, details) {
        auditLogger.info('System event', {
            event: 'SYSTEM_EVENT',
            ...details,
            timestamp: new Date().toISOString()
        });
    }

    // Log error
    static async logError(error, context) {
        auditLogger.error('Error occurred', {
            event: 'ERROR',
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            context,
            timestamp: new Date().toISOString()
        });
    }

    // Get audit logs with filtering
    static async getAuditLogs(filters = {}, page = 1, limit = 50) {
        const logFile = path.join(auditLogDir, 'audit.log');
        const logs = [];

        try {
            const fileContent = await fs.promises.readFile(logFile, 'utf8');
            const lines = fileContent.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const log = JSON.parse(line);
                    if (this.matchesFilters(log, filters)) {
                        logs.push(log);
                    }
                } catch (e) {
                    continue;
                }
            }

            // Sort logs by timestamp in descending order
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Apply pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedLogs = logs.slice(startIndex, endIndex);

            return {
                logs: paginatedLogs,
                total: logs.length,
                page,
                limit,
                totalPages: Math.ceil(logs.length / limit)
            };
        } catch (error) {
            throw new Error('Failed to read audit logs');
        }
    }

    // Helper method to check if log matches filters
    static matchesFilters(log, filters) {
        return Object.entries(filters).every(([key, value]) => {
            if (Array.isArray(value)) {
                return value.includes(log[key]);
            }
            return log[key] === value;
        });
    }
}

module.exports = AuditService; 