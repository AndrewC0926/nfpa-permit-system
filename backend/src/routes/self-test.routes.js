const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/auth.middleware');
const BlockchainService = require('../services/blockchain.service');
const Document = require('../models/document.model');
const Permit = require('../models/permit.model');
const AuditService = require('../services/audit.service');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Self-test endpoint
router.post('/test-system', verifyToken, checkRole(['ADMIN']), async (req, res) => {
    const testId = `test-${Date.now()}`;
    const testResults = {
        id: testId,
        timestamp: new Date(),
        steps: [],
        success: true
    };

    try {
        // Step 1: Create test document
        testResults.steps.push({ name: 'Create test document', status: 'pending' });
        const testDocPath = path.join(__dirname, '../../test-files/test-document.pdf');
        const testDocContent = 'Test document content';
        await fs.writeFile(testDocPath, testDocContent);
        const docHash = crypto.createHash('sha256').update(testDocContent).digest('hex');

        // Step 2: Upload document
        testResults.steps.push({ name: 'Upload document', status: 'pending' });
        const document = new Document({
            name: 'test-document.pdf',
            type: 'TEST',
            hash: docHash,
            path: testDocPath,
            uploadedBy: req.user.id,
            tenantId: req.tenantId
        });
        await document.save();

        // Step 3: Create test permit
        testResults.steps.push({ name: 'Create test permit', status: 'pending' });
        const permit = new Permit({
            id: testId,
            applicantName: 'Test Applicant',
            projectAddress: '123 Test St',
            permitType: 'TEST',
            status: 'SUBMITTED',
            documents: [document._id],
            createdBy: req.user.id,
            tenantId: req.tenantId
        });
        await permit.save();

        // Step 4: Submit to blockchain
        testResults.steps.push({ name: 'Submit to blockchain', status: 'pending' });
        const blockchainService = new BlockchainService();
        await blockchainService.connectToNetwork(req.user.id, req.user.organization);
        const txResult = await blockchainService.createPermit(permit.toObject());

        // Step 5: Verify blockchain transaction
        testResults.steps.push({ name: 'Verify blockchain transaction', status: 'pending' });
        const blockchainPermit = await blockchainService.getPermit(permit.id);
        if (!blockchainPermit) {
            throw new Error('Permit not found on blockchain');
        }

        // Step 6: Simulate AI analysis
        testResults.steps.push({ name: 'Simulate AI analysis', status: 'pending' });
        document.aiAnalysis = {
            status: 'COMPLETED',
            confidence: 0.95,
            findings: ['Document verified successfully']
        };
        await document.save();

        // Update all steps to success
        testResults.steps.forEach(step => {
            step.status = 'success';
            step.completedAt = new Date();
        });

        // Log successful test
        await AuditService.logSystemEvent('SYSTEM_TEST', {
            testId,
            userId: req.user.id,
            tenantId: req.tenantId,
            results: testResults
        });

        res.json({
            success: true,
            message: 'System test completed successfully',
            results: testResults
        });

    } catch (error) {
        // Update failed step
        const failedStep = testResults.steps.find(step => step.status === 'pending');
        if (failedStep) {
            failedStep.status = 'failed';
            failedStep.error = error.message;
            failedStep.completedAt = new Date();
        }
        testResults.success = false;

        // Log failed test
        await AuditService.logError('System test failed', error, {
            testId,
            userId: req.user.id,
            tenantId: req.tenantId,
            results: testResults
        });

        res.status(500).json({
            success: false,
            message: 'System test failed',
            error: error.message,
            results: testResults
        });
    } finally {
        // Cleanup test files
        try {
            const testDocPath = path.join(__dirname, '../../test-files/test-document.pdf');
            await fs.unlink(testDocPath);
        } catch (error) {
            console.error('Error cleaning up test files:', error);
        }
    }
});

module.exports = router; 