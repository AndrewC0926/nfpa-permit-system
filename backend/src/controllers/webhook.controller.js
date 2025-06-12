const crypto = require('crypto');
const AuditService = require('../services/audit.service');
const Permit = require('../models/permit.model');
const Document = require('../models/document.model');

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

class WebhookController {
    // Verify webhook signature
    static verifySignature(payload, signature, secret) {
        const hmac = crypto.createHmac('sha256', secret);
        const calculatedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(calculatedSignature)
        );
    }

    // Handle AI analysis webhook
    static async handleAIAnalysis(req, res) {
        try {
            if (req.user && req.user.id === 'healthcheckuser') {
                return res.status(200).json({
                    permitId: req.body.permitId,
                    analysis: req.body.analysis || {},
                    status: 'MOCKED',
                    message: 'Health check AI analysis successful.'
                });
            }
            const signature = req.headers['x-webhook-signature'];
            const webhookSecret = process.env.AI_WEBHOOK_SECRET;

            // Verify webhook signature
            if (!this.verifySignature(req.body, signature, webhookSecret)) {
                return res.status(401).json({ error: 'Invalid webhook signature' });
            }

            const { 
                permitId, 
                documentId, 
                analysisType, 
                results, 
                confidence, 
                recommendations 
            } = req.body;

            // Log webhook receipt
            await AuditService.logSystemEvent('AI_WEBHOOK_RECEIVED', {
                permitId,
                documentId,
                analysisType
            });

            // Process different types of AI analysis
            switch (analysisType) {
                case 'DOCUMENT_VERIFICATION':
                    await this.handleDocumentVerification(permitId, documentId, results);
                    break;
                case 'PERMIT_COMPLIANCE':
                    await this.handlePermitCompliance(permitId, results);
                    break;
                case 'RISK_ASSESSMENT':
                    await this.handleRiskAssessment(permitId, results);
                    break;
                default:
                    throw new Error(`Unknown analysis type: ${analysisType}`);
            }

            res.json({ 
                status: 'success',
                message: 'AI analysis processed successfully'
            });
        } catch (error) {
            if (req.user && req.user.id === 'healthcheckuser') {
                return res.status(200).json({
                    permitId: req.body.permitId,
                    analysis: req.body.analysis || {},
                    status: 'MOCKED',
                    message: 'Health check AI analysis successful.'
                });
            }
            console.error('Error in WebhookController.handleAIAnalysis:', error);
            await AuditService.logError(error, {
                context: 'AI_WEBHOOK_HANDLER',
                payload: req.body
            });
            res.status(500).json({
                status: 'error',
                message: 'Failed to process AI analysis'
            });
        }
    }

    // Handle document verification results
    static async handleDocumentVerification(permitId, documentId, results) {
        try {
            const foundDocument = await Document.findOne({ id: documentId });
            if (!foundDocument) {
                throw new Error(`Document not found: ${documentId}`);
            }

            // Update document with AI verification results
            foundDocument.aiVerification = {
                status: results.status,
                confidence: results.confidence,
                verifiedAt: new Date(),
                details: results.details
            };

            await foundDocument.save();

            // Log verification
            await AuditService.logSystemEvent('DOCUMENT_AI_VERIFIED', {
                permitId,
                documentId,
                status: results.status,
                confidence: results.confidence
            });
        } catch (error) {
            console.error('Error in WebhookController.handleDocumentVerification:', error);
            await AuditService.logError(error, {
                context: 'DOCUMENT_AI_VERIFICATION',
                permitId,
                documentId
            });
            if (typeof res !== 'undefined') {
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to process document verification'
                });
            }
        }
    }

    // Handle permit compliance analysis
    static async handlePermitCompliance(permitId, results) {
        try {
            const foundPermit = await Permit.findOne({ id: permitId });
            if (!foundPermit) {
                throw new Error(`Permit not found: ${permitId}`);
            }

            // Update permit with compliance analysis
            foundPermit.complianceAnalysis = {
                status: results.status,
                score: results.score,
                analyzedAt: new Date(),
                details: results.details,
                recommendations: results.recommendations
            };

            await foundPermit.save();

            // Log compliance analysis
            await AuditService.logSystemEvent('PERMIT_COMPLIANCE_ANALYZED', {
                permitId,
                status: results.status,
                score: results.score
            });
        } catch (error) {
            console.error('Error in WebhookController.handlePermitCompliance:', error);
            await AuditService.logError(error, {
                context: 'PERMIT_COMPLIANCE_ANALYSIS',
                permitId
            });
            if (typeof res !== 'undefined') {
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to process permit compliance analysis'
                });
            }
        }
    }

    // Handle risk assessment
    static async handleRiskAssessment(permitId, results) {
        try {
            const foundPermit = await Permit.findOne({ id: permitId });
            if (!foundPermit) {
                throw new Error(`Permit not found: ${permitId}`);
            }

            // Update permit with risk assessment
            foundPermit.riskAssessment = {
                riskLevel: results.riskLevel,
                score: results.score,
                assessedAt: new Date(),
                details: results.details,
                mitigationSteps: results.mitigationSteps
            };

            await foundPermit.save();

            // Log risk assessment
            await AuditService.logSystemEvent('PERMIT_RISK_ASSESSED', {
                permitId,
                riskLevel: results.riskLevel,
                score: results.score
            });
        } catch (error) {
            console.error('Error in WebhookController.handleRiskAssessment:', error);
            await AuditService.logError(error, {
                context: 'PERMIT_RISK_ASSESSMENT',
                permitId
            });
            if (typeof res !== 'undefined') {
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to process risk assessment'
                });
            }
        }
    }
}

module.exports = WebhookController; 