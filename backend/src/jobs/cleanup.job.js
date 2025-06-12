const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Document = require('../models/document.model');
const AuditService = require('../services/audit.service');

class CleanupJob {
    constructor() {
        this.uploadDir = path.join(__dirname, '../../uploads');
        this.retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    }

    // Initialize cleanup jobs
    init() {
        // Run cleanup every day at 2 AM
        cron.schedule('0 2 * * *', async () => {
            try {
                await this.cleanupOldFiles();
                await this.verifyFileHashes();
            } catch (error) {
                await AuditService.logError(error, {
                    context: 'CLEANUP_JOB',
                    job: 'daily_cleanup'
                });
            }
        });

        // Run hash verification every 6 hours
        cron.schedule('0 */6 * * *', async () => {
            try {
                await this.verifyFileHashes();
            } catch (error) {
                await AuditService.logError(error, {
                    context: 'CLEANUP_JOB',
                    job: 'hash_verification'
                });
            }
        });
    }

    // Clean up old files
    async cleanupOldFiles() {
        try {
            const cutoffDate = new Date(Date.now() - this.retentionPeriod);
            
            // Find documents older than retention period
            const oldDocuments = await Document.find({
                uploadedAt: { $lt: cutoffDate },
                isArchived: true
            });

            for (const doc of oldDocuments) {
                try {
                    const filePath = path.join(this.uploadDir, doc.fileName);
                    
                    // Check if file exists
                    try {
                        await fs.access(filePath);
                    } catch {
                        continue; // Skip if file doesn't exist
                    }

                    // Delete file
                    await fs.unlink(filePath);

                    // Update document status
                    doc.isDeleted = true;
                    doc.deletedAt = new Date();
                    await doc.save();

                    // Log deletion
                    await AuditService.logSystemEvent('FILE_CLEANUP', {
                        documentId: doc.id,
                        permitId: doc.permitId,
                        fileName: doc.fileName,
                        reason: 'Retention period exceeded'
                    });
                } catch (error) {
                    await AuditService.logError(error, {
                        context: 'FILE_CLEANUP',
                        documentId: doc.id
                    });
                }
            }
        } catch (error) {
            throw new Error(`Failed to cleanup old files: ${error.message}`);
        }
    }

    // Verify file hashes
    async verifyFileHashes() {
        try {
            const documents = await Document.find({
                isDeleted: false,
                isArchived: false
            });

            for (const doc of documents) {
                try {
                    const filePath = path.join(this.uploadDir, doc.fileName);
                    
                    // Check if file exists
                    try {
                        await fs.access(filePath);
                    } catch {
                        await this.handleMissingFile(doc);
                        continue;
                    }

                    // Calculate current hash
                    const currentHash = await this.calculateFileHash(filePath);

                    // Compare hashes
                    if (currentHash !== doc.fileHash) {
                        await this.handleHashMismatch(doc, currentHash);
                    }
                } catch (error) {
                    await AuditService.logError(error, {
                        context: 'HASH_VERIFICATION',
                        documentId: doc.id
                    });
                }
            }
        } catch (error) {
            throw new Error(`Failed to verify file hashes: ${error.message}`);
        }
    }

    // Calculate file hash
    async calculateFileHash(filePath) {
        const fileBuffer = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }

    // Handle missing file
    async handleMissingFile(doc) {
        doc.integrityStatus = 'MISSING';
        doc.lastVerifiedAt = new Date();
        await doc.save();

        await AuditService.logSystemEvent('FILE_MISSING', {
            documentId: doc.id,
            permitId: doc.permitId,
            fileName: doc.fileName
        });
    }

    // Handle hash mismatch
    async handleHashMismatch(doc, currentHash) {
        doc.integrityStatus = 'COMPROMISED';
        doc.lastVerifiedAt = new Date();
        doc.integrityIssues = [
            ...(doc.integrityIssues || []),
            {
                detectedAt: new Date(),
                originalHash: doc.fileHash,
                currentHash: currentHash
            }
        ];
        await doc.save();

        await AuditService.logSystemEvent('FILE_INTEGRITY_COMPROMISED', {
            documentId: doc.id,
            permitId: doc.permitId,
            fileName: doc.fileName,
            originalHash: doc.fileHash,
            currentHash: currentHash
        });
    }
}

// Create and export singleton instance
const cleanupJob = new CleanupJob();
module.exports = cleanupJob; 