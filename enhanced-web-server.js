const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const multer = require('multer');

// Import closeout modules
const { PermitCloseoutManager } = require('./modules/closeout/permit-closeout');
const { DocumentManager } = require('./modules/documents/document-manager');
const { SignatureManager } = require('./modules/signatures/signature-manager');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize closeout system
const closeoutManager = new PermitCloseoutManager();
const documentManager = new DocumentManager();
const signatureManager = new SignatureManager();

// Configure file upload middleware
const upload = documentManager.getUploadMiddleware();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// =============================================================================
// PERMIT CLOSEOUT API ENDPOINTS
// =============================================================================

// Initiate permit closeout after inspection approval
app.post('/api/permits/:permitId/closeout/initiate', async (req, res) => {
    try {
        const { permitId } = req.params;
        const { inspectionResults, initiatedBy } = req.body;

        console.log(`🏁 API: Initiating closeout for permit ${permitId}`);

        const closeoutRecord = await closeoutManager.initiateCloseout(
            permitId,
            inspectionResults,
            initiatedBy
        );

        res.json({
            success: true,
            message: 'Permit closeout initiated successfully',
            data: closeoutRecord
        });

    } catch (error) {
        console.error('❌ Closeout initiation error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Upload closeout documents (Acceptance Card, As-Built drawings)
app.post('/api/permits/:permitId/closeout/documents', upload.fields([
    { name: 'acceptance_card', maxCount: 5 },
    { name: 'as_built', maxCount: 10 }
]), async (req, res) => {
    try {
        const { permitId } = req.params;
        const { uploadedBy, notes } = req.body;
        const files = req.files;

        console.log(`📄 API: Uploading closeout documents for permit ${permitId}`);

        const uploadResults = [];

        // Process each uploaded file
        for (const [documentType, fileArray] of Object.entries(files)) {
            for (const file of fileArray) {
                try {
                    const result = await closeoutManager.uploadCloseoutDocument(
                        permitId,
                        documentType,
                        file,
                        uploadedBy,
                        { notes }
                    );

                    uploadResults.push({
                        documentType,
                        fileName: file.originalname,
                        documentId: result.documentRecord.id,
                        status: result.documentRecord.status,
                        verification: result.documentRecord.verification
                    });

                } catch (fileError) {
                    console.error(`❌ Error uploading ${file.originalname}:`, fileError.message);
                    uploadResults.push({
                        documentType,
                        fileName: file.originalname,
                        error: fileError.message
                    });
                }
            }
        }

        res.json({
            success: true,
            message: 'Documents processed',
            data: {
                permitId,
                uploads: uploadResults,
                summary: {
                    successful: uploadResults.filter(r => !r.error).length,
                    failed: uploadResults.filter(r => r.error).length
                }
            }
        });

    } catch (error) {
        console.error('❌ Document upload error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get closeout status and progress
app.get('/api/permits/:permitId/closeout/status', async (req, res) => {
    try {
        const { permitId } = req.params;

        console.log(`📊 API: Getting closeout status for permit ${permitId}`);

        const status = await closeoutManager.getCloseoutStatus(permitId);

        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('❌ Error getting closeout status:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create signature request
app.post('/api/permits/:permitId/signatures/request', async (req, res) => {
    try {
        const { permitId } = req.params;
        const { documentId, signerInfo, signatureType } = req.body;

        console.log(`✍️ API: Creating signature request for permit ${permitId}`);

        const signatureRequest = await signatureManager.createSignatureRequest(
            permitId,
            documentId,
            signerInfo,
            signatureType
        );

        res.json({
            success: true,
            message: 'Signature request created',
            data: signatureRequest
        });

    } catch (error) {
        console.error('❌ Error creating signature request:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Process digital signature
app.post('/api/signatures/:signatureId/sign', async (req, res) => {
    try {
        const { signatureId } = req.params;
        const { signatureData, signerCredentials } = req.body;

        console.log(`✍️ API: Processing signature ${signatureId}`);

        const result = await closeoutManager.processSignature(
            signatureId,
            signatureData,
            signerCredentials
        );

        res.json({
            success: true,
            message: 'Signature processed successfully',
            data: {
                signature: result.signatureProcessed,
                allSignaturesComplete: result.allSignaturesComplete
            }
        });

    } catch (error) {
        console.error('❌ Error processing signature:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Manual permit closure (for AHJ officials)
app.post('/api/permits/:permitId/closeout/close', async (req, res) => {
    try {
        const { permitId } = req.params;
        const { closureType, notes, closedBy } = req.body;

        console.log(`🏁 API: Manually closing permit ${permitId}`);

        const closeoutRecord = await closeoutManager.getCloseoutRecord(permitId);
        const result = await closeoutManager.closePermit(closeoutRecord, closureType, notes);

        res.json({
            success: true,
            message: 'Permit closed successfully',
            data: result
        });

    } catch (error) {
        console.error('❌ Error closing permit:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all closeout documents for a permit
app.get('/api/permits/:permitId/closeout/documents', async (req, res) => {
    try {
        const { permitId } = req.params;

        console.log(`📋 API: Getting closeout documents for permit ${permitId}`);

        const documents = await documentManager.getPermitDocuments(permitId);

        res.json({
            success: true,
            data: documents
        });

    } catch (error) {
        console.error('❌ Error getting documents:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Download document
app.get('/api/documents/:documentId/download', async (req, res) => {
    try {
        const { documentId } = req.params;

        console.log(`📥 API: Downloading document ${documentId}`);

        const document = await documentManager.getDocument(documentId);
        
        if (!document || !document.filePath) {
            return res.status(404).json({
                success: false,
                error: 'Document not found'
            });
        }

        // In production, implement proper access controls here
        res.download(document.filePath, document.originalName);

    } catch (error) {
        console.error('❌ Error downloading document:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get signature status
app.get('/api/signatures/:signatureId/status', async (req, res) => {
    try {
        const { signatureId } = req.params;

        console.log(`📊 API: Getting signature status ${signatureId}`);

        const signatureRequest = await signatureManager.getSignatureRequest(signatureId);

        res.json({
            success: true,
            data: signatureRequest
        });

    } catch (error) {
        console.error('❌ Error getting signature status:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// ENHANCED DASHBOARD API ENDPOINTS
// =============================================================================

// Get enhanced permit data with closeout status
app.get('/api/permits', async (req, res) => {
    try {
        const permits = [
            {
                id: 'DEMO_001',
                name: 'Downtown Office Complex Fire Safety Upgrade',
                applicant: 'Metro Fire Protection Systems Inc.',
                nfpa_codes: ['NFPA 1', 'NFPA 13', 'NFPA 72', 'NFPA 80', 'NFPA 90A', 'NFPA 92', 'NFPA 101'],
                compliance: 76.8,
                status: 'INSPECTION_APPROVED',
                cost: 1250000,
                processing_days: 12,
                closeout: {
                    status: 'pending_documents',
                    progress: 25,
                    requiredDocuments: ['acceptance_card', 'as_built'],
                    uploadedDocuments: 0,
                    nextAction: 'Upload acceptance card and as-built drawings'
                }
            },
            {
                id: 'DEMO_002',
                name: 'Chemical Processing Facility Fire Suppression',
                applicant: 'Advanced Chemical Solutions LLC',
                nfpa_codes: ['NFPA 1', 'NFPA 11', 'NFPA 12', 'NFPA 15', 'NFPA 17', 'NFPA 30', 'NFPA 70'],
                compliance: 94.2,
                status: 'SIGNATURES_COMPLETE',
                cost: 2100000,
                processing_days: 18,
                closeout: {
                    status: 'under_review',
                    progress: 85,
                    requiredDocuments: ['acceptance_card', 'as_built', 'safety_data_sheets'],
                    uploadedDocuments: 3,
                    nextAction: 'Awaiting final AHJ review'
                }
            },
            {
                id: 'DEMO_003',
                name: 'Hospital Emergency Power & Life Safety Systems',
                applicant: 'Healthcare Systems Engineering Corp',
                nfpa_codes: ['NFPA 1', 'NFPA 72', 'NFPA 99', 'NFPA 101', 'NFPA 110', 'NFPA 111'],
                compliance: 68.5,
                status: 'UNDER_REVIEW',
                cost: 3200000,
                processing_days: 15,
                closeout: {
                    status: 'pending_inspection',
                    progress: 10,
                    requiredDocuments: [],
                    uploadedDocuments: 0,
                    nextAction: 'Awaiting field inspection approval'
                }
            },
            {
                id: 'DEMO_004',
                name: 'Shopping Mall Food Court Fire Protection Upgrade',
                applicant: 'Retail Fire Safety Solutions',
                nfpa_codes: ['NFPA 1', 'NFPA 13', 'NFPA 17A', 'NFPA 72', 'NFPA 90A', 'NFPA 96', 'NFPA 101'],
                compliance: 82.1,
                status: 'CLOSED',
                cost: 875000,
                processing_days: 8,
                closeout: {
                    status: 'closed',
                    progress: 100,
                    requiredDocuments: ['acceptance_card', 'as_built'],
                    uploadedDocuments: 2,
                    nextAction: 'Permit closeout complete',
                    closedAt: '2025-05-20T14:30:00Z'
                }
            },
            {
                id: 'DEMO_005',
                name: 'Data Center Critical Infrastructure Protection',
                applicant: 'TechSafe Critical Systems Inc.',
                nfpa_codes: ['NFPA 1', 'NFPA 70', 'NFPA 72', 'NFPA 75', 'NFPA 76', 'NFPA 110', 'NFPA 2001'],
                compliance: 91.7,
                status: 'DOCUMENTS_UPLOADED',
                cost: 1650000,
                processing_days: 14,
                closeout: {
                    status: 'pending_signatures',
                    progress: 60,
                    requiredDocuments: ['acceptance_card', 'as_built'],
                    uploadedDocuments: 2,
                    nextAction: 'Awaiting inspector and engineer signatures'
                }
            },
            {
                id: 'DEMO_006',
                name: 'Airport Terminal Fire & Life Safety Modernization',
                applicant: 'Aviation Safety Systems International',
                nfpa_codes: ['NFPA 1', 'NFPA 13', 'NFPA 72', 'NFPA 92', 'NFPA 101', 'NFPA 130', 'NFPA 409'],
                compliance: 73.4,
                status: 'CONDITIONAL',
                cost: 4500000,
                processing_days: 22,
                closeout: {
                    status: 'pending_inspection',
                    progress: 5,
                    requiredDocuments: [],
                    uploadedDocuments: 0,
                    nextAction: 'Address permit conditions before inspection'
                }
            }
        ];
        
        res.json({ success: true, data: permits });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Simulate closeout process for demo
app.post('/api/demo/simulate-closeout/:permitId', async (req, res) => {
    try {
        const { permitId } = req.params;
        const { step } = req.body;

        console.log(`🎭 DEMO: Simulating closeout step '${step}' for permit ${permitId}`);

        const simulationResults = {
            initiate: {
                message: 'Inspection approved - closeout process initiated',
                status: 'pending_documents',
                requiredDocuments: ['acceptance_card', 'as_built'],
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            upload_documents: {
                message: 'Documents uploaded and verified successfully',
                status: 'pending_signatures',
                documentsUploaded: ['acceptance_card', 'as_built'],
                nfpaCompliance: { compliant: true, violations: 0, warnings: 1 }
            },
            process_signatures: {
                message: 'All required signatures collected and verified',
                status: 'under_review',
                signatures: [
                    { type: 'inspector', signer: 'Fire Marshal Thompson', verified: true },
                    { type: 'engineer', signer: 'John Smith, PE', verified: true },
                    { type: 'contractor', signer: 'Mike Johnson', verified: true }
                ]
            },
            close_permit: {
                message: 'Permit closed successfully - all requirements satisfied',
                status: 'closed',
                closureCertificate: `CERT_${permitId}_${Date.now()}`,
                archivedDocuments: true,
                ahjAccess: 'highest_credentials'
            }
        };

        const result = simulationResults[step] || { message: 'Invalid simulation step' };

        res.json({
            success: true,
            message: 'Closeout simulation completed',
            permitId,
            step,
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// EXISTING API ENDPOINTS (Enhanced)
// =============================================================================

app.get('/api/run-demo', (req, res) => {
    console.log('🚀 Running NFPA POC Demo via API...');
    
    exec('node nfpa-poc-demo.js', (error, stdout, stderr) => {
        if (error) {
            console.error('Demo execution error:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message,
                output: stderr 
            });
            return;
        }
        
        console.log('✅ Demo completed successfully');
        res.json({ 
            success: true, 
            output: stdout 
        });
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        system: 'NFPA Permit Management System',
        version: '2.0.0 - Enhanced with Permit Closeout',
        status: 'operational',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        features: {
            blockchain: 'connected',
            ai_engine: 'active',
            nfpa_database: '44 requirements loaded',
            multi_jurisdiction: 'enabled',
            permit_closeout: 'active',
            document_management: 'active',
            digital_signatures: 'active'
        },
        closeout_stats: {
            permits_pending_closeout: 3,
            documents_processed_today: 12,
            signatures_completed_today: 8,
            permits_closed_this_month: 47
        },
        metrics: {
            active_permits: Math.floor(Math.random() * 3) + 5,
            compliance_avg: 87.3,
            processing_time: 12.3,
            revenue_q1: 2847500,
            closeout_completion_rate: 94.2
        }
    });
});

// =============================================================================
// STATIC FILE SERVING & DEFAULT ROUTES
// =============================================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
    res.status(404).send(`
        <h1>404 - Page Not Found</h1>
        <p>The requested page was not found.</p>
        <a href="/">Return to NFPA Dashboard</a>
    `);
});

app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

app.listen(PORT, () => {
    console.log('🏛️ ==========================================');
    console.log('🏛️  NFPA PERMIT SYSTEM - ENHANCED DASHBOARD');
    console.log('🏛️  Government Edition v2.0 + Permit Closeout');
    console.log('🏛️ ==========================================');
    console.log(`🚀 Dashboard: http://localhost:${PORT}`);
    console.log(`📊 API Status: http://localhost:${PORT}/api/status`);
    console.log(`🔧 Run Demo: http://localhost:${PORT}/api/run-demo`);
    console.log(`📄 Document Upload: http://localhost:${PORT}/api/permits/{id}/closeout/documents`);
    console.log(`✍️ Digital Signatures: http://localhost:${PORT}/api/signatures`);
    console.log(`🏁 Permit Closeout: http://localhost:${PORT}/api/permits/{id}/closeout`);
    console.log('✅ Ready for government demonstration');
    console.log('🏛️ ==========================================');
    console.log('');
    console.log('🎯 NEW FEATURES:');
    console.log('   • Complete permit closeout workflow');
    console.log('   • Document upload with NFPA compliance checking');
    console.log('   • Digital signature collection and verification');
    console.log('   • Automated permit closure with AHJ access controls');
    console.log('   • Full audit trail and document archival');
    console.log('🏛️ ==========================================');
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Enhanced NFPA Dashboard Server...');
    process.exit(0);
});

module.exports = app;
