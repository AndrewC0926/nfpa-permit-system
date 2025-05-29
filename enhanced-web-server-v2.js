// enhanced-web-server-v2.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Import our enhanced modules
const EnhancedDocumentManager = require('./modules/documents/enhanced-document-manager');
const MobileSubmissionManager = require('./modules/mobile/mobile-submission');

// Simple fabric network class for this demo
class SimpleFabricNetwork {
    constructor() {
        this.permits = new Map(); // In-memory storage for demo
        this.permitCounter = 1000;
    }

    async submitPermit(permitData) {
        const permitId = `PERMIT_${this.permitCounter++}_${Date.now()}`;
        const permit = {
            id: permitId,
            ...permitData,
            status: 'SUBMITTED',
            submissionDate: new Date().toISOString(),
            documents: [],
            inspections: [],
            mobileSubmissions: [],
            violations: [],
            history: [{
                action: 'CREATED',
                timestamp: new Date().toISOString(),
                details: 'Permit application created with enhanced document processing'
            }]
        };
        
        this.permits.set(permitId, permit);
        return permit;
    }

    async getPermit(permitId) {
        return this.permits.get(permitId);
    }

    async getAllPermits() {
        return Array.from(this.permits.values());
    }

    async updatePermit(permitId, updates) {
        const permit = this.permits.get(permitId);
        if (permit) {
            Object.assign(permit, updates);
            permit.lastModified = new Date().toISOString();
            this.permits.set(permitId, permit);
        }
        return permit;
    }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize managers
const documentManager = new EnhancedDocumentManager();
const mobileManager = new MobileSubmissionManager();
const fabricNetwork = new SimpleFabricNetwork();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve static files
app.use('/uploads', express.static('./uploads'));
app.use('/processed', express.static('./processed'));
app.use('/qr-codes', express.static('./qr-codes'));

// Configure multer for multi-file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: 50 // Up to 50 files
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'NFPA Enhanced Permit System v2.0',
        features: [
            'OCR document processing',
            'AI-powered compliance analysis',
            'Mobile field submissions',
            'CAD file support',
            'Multi-format document handling',
            'QR code generation',
            'Progress tracking',
            'Violation reporting'
        ]
    });
});

// ================================
// DOCUMENT PROCESSING ENDPOINTS
// ================================

// Enhanced document upload with OCR and AI analysis
app.post('/api/permits/:permitId/documents', upload.array('documents', 20), async (req, res) => {
    try {
        const { permitId } = req.params;
        const { category = 'general' } = req.body;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded' });
        }

        console.log(`📄 Processing ${req.files.length} documents for permit ${permitId}`);
        
        const processedDocuments = [];
        
        // Process each uploaded file
        for (const file of req.files) {
            try {
                const processedDoc = await documentManager.processUpload(file, permitId, category);
                processedDocuments.push(processedDoc);
                
                // Update permit with new document
                const permit = await fabricNetwork.getPermit(permitId);
                if (permit) {
                    permit.documents = permit.documents || [];
                    permit.documents.push(processedDoc);
                    await fabricNetwork.updatePermit(permitId, permit);
                }
                
            } catch (error) {
                console.error(`❌ Error processing file ${file.originalname}:`, error);
                processedDocuments.push({
                    originalName: file.originalname,
                    error: error.message,
                    status: 'failed'
                });
            }
        }
        
        res.status(201).json({ 
            success: true, 
            message: `Processed ${processedDocuments.length} documents with OCR and AI analysis`,
            documents: processedDocuments,
            permitId: permitId
        });
        
    } catch (error) {
        console.error('❌ Document upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get document processing results
app.get('/api/permits/:permitId/documents/:documentId/analysis', async (req, res) => {
    try {
        const { permitId, documentId } = req.params;
        
        const permit = await fabricNetwork.getPermit(permitId);
        if (!permit) {
            return res.status(404).json({ success: false, error: 'Permit not found' });
        }
        
        const document = permit.documents?.find(doc => doc.id === documentId);
        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }
        
        res.json({ 
            success: true, 
            analysis: document.processing,
            metadata: document.metadata,
            nfpaReferences: document.processing.nfpaReferences,
            compliance: document.processing.compliance
        });
        
    } catch (error) {
        console.error('❌ Error getting document analysis:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ================================
// MOBILE SUBMISSION ENDPOINTS
// ================================

// Generate QR code for permit
app.post('/api/permits/:permitId/qr-code', async (req, res) => {
    try {
        const { permitId } = req.params;
        const permit = await fabricNetwork.getPermit(permitId);
        
        if (!permit) {
            return res.status(404).json({ success: false, error: 'Permit not found' });
        }
        
        const qrResult = await mobileManager.generatePermitQRCode(permitId, {
            address: permit.projectDetails?.address || 'Unknown',
            type: permit.projectDetails?.type || 'Unknown',
            status: permit.status
        });
        
        res.json({ 
            success: true, 
            qrCode: qrResult,
            message: 'QR code generated for mobile access'
        });
        
    } catch (error) {
        console.error('❌ QR code generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Field inspection submission
app.post('/api/permits/:permitId/field-inspection', mobileManager.upload.array('photos', 20), async (req, res) => {
    try {
        const { permitId } = req.params;
        const inspectionData = JSON.parse(req.body.inspectionData || '{}');
        
        const inspection = await mobileManager.processFieldInspection(permitId, inspectionData, req.files);
        
        // Update permit with new inspection
        const permit = await fabricNetwork.getPermit(permitId);
        if (permit) {
            permit.inspections = permit.inspections || [];
            permit.inspections.push(inspection);
            permit.history.push({
                action: 'FIELD_INSPECTION_ADDED',
                timestamp: new Date().toISOString(),
                details: `Mobile inspection submitted: ${inspection.inspectionType}`,
                inspectionId: inspection.id
            });
            await fabricNetwork.updatePermit(permitId, permit);
        }
        
        res.status(201).json({ 
            success: true, 
            message: 'Field inspection processed successfully',
            inspection: inspection
        });
        
    } catch (error) {
        console.error('❌ Field inspection error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Progress submission from contractors
app.post('/api/permits/:permitId/progress', mobileManager.upload.array('photos', 15), async (req, res) => {
    try {
        const { permitId } = req.params;
        const progressData = JSON.parse(req.body.progressData || '{}');
        
        const submission = await mobileManager.processProgressSubmission(permitId, progressData, req.files);
        
        // Update permit with progress
        const permit = await fabricNetwork.getPermit(permitId);
        if (permit) {
            permit.mobileSubmissions = permit.mobileSubmissions || [];
            permit.mobileSubmissions.push(submission);
            permit.history.push({
                action: 'PROGRESS_SUBMITTED',
                timestamp: new Date().toISOString(),
                details: `Progress update: ${submission.percentComplete}% complete`,
                submissionId: submission.id
            });
            await fabricNetwork.updatePermit(permitId, permit);
        }
        
        res.status(201).json({ 
            success: true, 
            message: 'Progress submission processed successfully',
            submission: submission
        });
        
    } catch (error) {
        console.error('❌ Progress submission error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Violation reporting
app.post('/api/permits/:permitId/violations', mobileManager.upload.array('photos', 10), async (req, res) => {
    try {
        const { permitId } = req.params;
        const violationData = JSON.parse(req.body.violationData || '{}');
        
        const violation = await mobileManager.processViolationReport(permitId, violationData, req.files);
        
        // Update permit with violation
        const permit = await fabricNetwork.getPermit(permitId);
        if (permit) {
            permit.violations = permit.violations || [];
            permit.violations.push(violation);
            permit.history.push({
                action: 'VIOLATION_REPORTED',
                timestamp: new Date().toISOString(),
                details: `Violation reported: ${violation.violationType}`,
                violationId: violation.id,
                severity: violation.severity
            });
            await fabricNetwork.updatePermit(permitId, permit);
        }
        
        res.status(201).json({ 
            success: true, 
            message: 'Violation report processed successfully',
            violation: violation
        });
        
    } catch (error) {
        console.error('❌ Violation reporting error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ================================
// STANDARD PERMIT ENDPOINTS
// ================================

// Create new permit with enhanced capabilities
app.post('/api/permits', async (req, res) => {
    try {
        const permitData = {
            applicantInfo: req.body.applicantInfo,
            projectDetails: req.body.projectDetails
        };
        
        const permit = await fabricNetwork.submitPermit(permitData);
        
        res.status(201).json({ 
            success: true, 
            data: permit,
            message: 'Permit created with enhanced document and mobile support',
            capabilities: [
                'OCR document processing',
                'AI compliance analysis',
                'Mobile field submissions',
                'QR code access',
                'Progress tracking'
            ]
        });
        
    } catch (error) {
        console.error('❌ Permit creation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all permits with enhanced data
app.get('/api/permits', async (req, res) => {
    try {
        const permits = await fabricNetwork.getAllPermits();
        
        // Add summary statistics for each permit
        const enhancedPermits = await Promise.all(permits.map(async permit => {
            const mobileStats = await mobileManager.getMobileSubmissionStats(permit.id);
            return {
                ...permit,
                stats: {
                    documents: permit.documents?.length || 0,
                    inspections: permit.inspections?.length || 0,
                    mobileSubmissions: permit.mobileSubmissions?.length || 0,
                    violations: permit.violations?.length || 0,
                    mobile: mobileStats
                }
            };
        }));
        
        res.json({ 
            success: true, 
            data: enhancedPermits,
            count: enhancedPermits.length,
            message: 'Retrieved permits with enhanced processing data'
        });
        
    } catch (error) {
        console.error('❌ Error fetching permits:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get specific permit with full details
app.get('/api/permits/:permitId', async (req, res) => {
    try {
        const { permitId } = req.params;
        const permit = await fabricNetwork.getPermit(permitId);
        
        if (!permit) {
            return res.status(404).json({ success: false, error: 'Permit not found' });
        }
        
        // Add mobile submission statistics
        const mobileStats = await mobileManager.getMobileSubmissionStats(permitId);
        permit.mobileStats = mobileStats;
        
        res.json({ 
            success: true, 
            data: permit,
            message: 'Permit retrieved with full processing details'
        });
        
    } catch (error) {
        console.error('❌ Error fetching permit:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ================================
// ANALYTICS AND REPORTING
// ================================

// Enhanced system analytics
app.get('/api/analytics/system', async (req, res) => {
    try {
        const permits = await fabricNetwork.getAllPermits();
        
        const analytics = {
            totalPermits: permits.length,
            totalDocuments: permits.reduce((sum, p) => sum + (p.documents?.length || 0), 0),
            totalMobileSubmissions: permits.reduce((sum, p) => sum + (p.mobileSubmissions?.length || 0), 0),
            totalViolations: permits.reduce((sum, p) => sum + (p.violations?.length || 0), 0),
            ocrProcessed: permits.reduce((sum, p) => {
                return sum + (p.documents?.filter(d => d.processing?.text) || []).length;
            }, 0),
            nfpaCompliant: permits.reduce((sum, p) => {
                return sum + (p.documents?.filter(d => d.processing?.compliance?.nfpaCompliant) || []).length;
            }, 0),
            recentActivity: permits
                .flatMap(p => p.history || [])
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10)
        };
        
        res.json({ 
            success: true, 
            analytics: analytics,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Document processing statistics
app.get('/api/analytics/documents', async (req, res) => {
    try {
        const permits = await fabricNetwork.getAllPermits();
        const allDocuments = permits.flatMap(p => p.documents || []);
        
        const documentAnalytics = {
            totalDocuments: allDocuments.length,
            byType: {},
            ocrSuccess: allDocuments.filter(d => d.processing?.text && d.processing?.text.length > 0).length,
            nfpaReferences: allDocuments.reduce((sum, d) => {
                return sum + (d.processing?.nfpaReferences?.length || 0);
            }, 0),
            commonNFPACodes: getCommonNFPACodes(allDocuments),
            processingStats: {
                withOCR: allDocuments.filter(d => d.processing?.text).length,
                withCompliance: allDocuments.filter(d => d.processing?.compliance).length,
                withThumbnails: allDocuments.filter(d => d.processing?.thumbnail).length
            }
        };
        
        // Count by file type
        allDocuments.forEach(doc => {
            const ext = doc.fileExtension || 'unknown';
            documentAnalytics.byType[ext] = (documentAnalytics.byType[ext] || 0) + 1;
        });
        
        res.json({ 
            success: true, 
            analytics: documentAnalytics
        });
        
    } catch (error) {
        console.error('❌ Document analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper function for NFPA code statistics
function getCommonNFPACodes(documents) {
    const codeCount = {};
    
    documents.forEach(doc => {
        if (doc.processing?.nfpaReferences) {
            doc.processing.nfpaReferences.forEach(ref => {
                if (ref.code) {
                    codeCount[ref.code] = (codeCount[ref.code] || 0) + 1;
                }
            });
        }
    });
    
    return Object.entries(codeCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([code, count]) => ({ code, count }));
}

// ================================
// ERROR HANDLING
// ================================

// Global error handler
app.use((error, req, res, next) => {
    console.error('💥 Unhandled error:', error);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Start server
app.listen(PORT, async () => {
    console.log('🚀 ==========================================');
    console.log('🚀  NFPA Enhanced Permit System v2.0');
    console.log('🚀  Complete Document & Mobile Solution');
    console.log('🚀 ==========================================');
    console.log(`🌐 Server: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`📄 Enhanced Features:`);
    console.log(`   • OCR document processing`);
    console.log(`   • AI compliance analysis`);
    console.log(`   • Mobile field submissions`);
    console.log(`   • QR code generation`);
    console.log(`   • Progress tracking`);
    console.log(`   • Violation reporting`);
    console.log(`   • CAD file support`);
    console.log(`   • Multi-format uploads`);
    console.log('🚀 ==========================================');
    
    try {
        console.log('✅ Document manager initialized');
        console.log('✅ Mobile submission manager initialized');
        console.log('🎯 System ready for all permit submission methods!');
    } catch (error) {
        console.log('⚠️ Some features may need configuration');
    }
});
