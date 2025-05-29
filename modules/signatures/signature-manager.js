/**
 * NFPA Permit System - Digital Signature Management Module
 * Handles e-signatures, verification, and compliance for permit closeout
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class SignatureManager {
    constructor() {
        this.signatureTypes = {
            INSPECTOR: 'inspector_signature',
            CONTRACTOR: 'contractor_signature', 
            ENGINEER: 'engineer_signature',
            APPLICANT: 'applicant_signature',
            AHJ_OFFICIAL: 'ahj_official_signature'
        };
        
        this.signatureStatuses = {
            PENDING: 'pending',
            SIGNED: 'signed',
            VERIFIED: 'verified',
            REJECTED: 'rejected',
            EXPIRED: 'expired'
        };
        
        this.initializeSignatureStorage();
    }

    async initializeSignatureStorage() {
        try {
            await fs.mkdir('./storage/signatures', { recursive: true });
            await fs.mkdir('./storage/certificates', { recursive: true });
            console.log('✅ Signature storage initialized');
        } catch (error) {
            console.error('❌ Error initializing signature storage:', error.message);
        }
    }

    // Create signature request for permit closeout
    async createSignatureRequest(permitId, documentId, signerInfo, signatureType = 'INSPECTOR') {
        try {
            const signatureId = this.generateSignatureId(permitId, documentId, signatureType);
            
            const signatureRequest = {
                id: signatureId,
                permitId: permitId,
                documentId: documentId,
                signatureType: this.signatureTypes[signatureType],
                signer: {
                    name: signerInfo.name,
                    email: signerInfo.email,
                    title: signerInfo.title,
                    organization: signerInfo.organization,
                    licenseNumber: signerInfo.licenseNumber || null,
                    certifications: signerInfo.certifications || []
                },
                status: this.signatureStatuses.PENDING,
                createdAt: new Date().toISOString(),
                expiresAt: this.calculateExpirationDate(),
                requirements: this.getSignatureRequirements(signatureType),
                metadata: {
                    ipAddress: signerInfo.ipAddress || null,
                    userAgent: signerInfo.userAgent || null,
                    sessionId: signerInfo.sessionId || null
                }
            };

            console.log(`📝 Signature request created: ${signatureId} for ${signerInfo.name}`);
            return signatureRequest;

        } catch (error) {
            console.error('❌ Error creating signature request:', error.message);
            throw error;
        }
    }

    // Process digital signature
    async processSignature(signatureId, signatureData, signerCredentials) {
        try {
            console.log(`✍️ Processing signature: ${signatureId}`);

            // Validate signature request exists and is pending
            const signatureRequest = await this.getSignatureRequest(signatureId);
            if (!signatureRequest) {
                throw new Error('Signature request not found');
            }

            if (signatureRequest.status !== this.signatureStatuses.PENDING) {
                throw new Error(`Invalid signature status: ${signatureRequest.status}`);
            }

            // Verify signer credentials
            const credentialVerification = await this.verifySignerCredentials(
                signatureRequest.signer,
                signerCredentials
            );

            if (!credentialVerification.valid) {
                throw new Error(`Credential verification failed: ${credentialVerification.errors.join(', ')}`);
            }

            // Process the signature
            const processedSignature = await this.createDigitalSignature(
                signatureRequest,
                signatureData,
                credentialVerification.certificate
            );

            // Update signature request status
            signatureRequest.status = this.signatureStatuses.SIGNED;
            signatureRequest.signedAt = new Date().toISOString();
            signatureRequest.signature = processedSignature;

            // Verify signature integrity
            const verification = await this.verifySignature(processedSignature);
            if (verification.valid) {
                signatureRequest.status = this.signatureStatuses.VERIFIED;
                signatureRequest.verifiedAt = new Date().toISOString();
            }

            console.log(`✅ Signature processed successfully: ${signatureId}`);
            return signatureRequest;

        } catch (error) {
            console.error('❌ Error processing signature:', error.message);
            // Update status to rejected
            await this.updateSignatureStatus(signatureId, this.signatureStatuses.REJECTED, error.message);
            throw error;
        }
    }

    // Verify signer credentials
    async verifySignerCredentials(signerInfo, credentials) {
        try {
            const verification = {
                valid: true,
                errors: [],
                certificate: null,
                verifiedAttributes: []
            };

            // Verify identity
            if (credentials.email !== signerInfo.email) {
                verification.errors.push('Email mismatch');
                verification.valid = false;
            }

            // Verify professional credentials for inspector signatures
            if (signerInfo.licenseNumber) {
                const licenseVerification = await this.verifyProfessionalLicense(
                    signerInfo.licenseNumber,
                    signerInfo.organization
                );
                
                if (!licenseVerification.valid) {
                    verification.errors.push('Invalid professional license');
                    verification.valid = false;
                } else {
                    verification.verifiedAttributes.push('professional_license');
                }
            }

            // Verify certifications
            if (signerInfo.certifications && signerInfo.certifications.length > 0) {
                const certVerification = await this.verifyCertifications(signerInfo.certifications);
                if (certVerification.valid) {
                    verification.verifiedAttributes.push('certifications');
                }
            }

            // Create or retrieve digital certificate
            if (verification.valid) {
                verification.certificate = await this.getOrCreateDigitalCertificate(signerInfo);
            }

            return verification;

        } catch (error) {
            return {
                valid: false,
                errors: [`Credential verification error: ${error.message}`],
                certificate: null,
                verifiedAttributes: []
            };
        }
    }

    // Create digital signature
    async createDigitalSignature(signatureRequest, signatureData, certificate) {
        try {
            const signaturePayload = {
                permitId: signatureRequest.permitId,
                documentId: signatureRequest.documentId,
                signerId: signatureRequest.signer.email,
                signerName: signatureRequest.signer.name,
                signatureType: signatureRequest.signatureType,
                timestamp: new Date().toISOString(),
                signatureData: signatureData // This could be biometric data, drawn signature, etc.
            };

            // Create digital signature hash
            const signatureHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(signaturePayload))
                .digest('hex');

            // Sign with certificate (simplified - in production use proper PKI)
            const digitalSignature = {
                id: this.generateSignatureHash(),
                hash: signatureHash,
                certificate: certificate,
                algorithm: 'SHA256withRSA',
                timestamp: new Date().toISOString(),
                payload: signaturePayload,
                integrity: {
                    checksum: this.calculateChecksum(signaturePayload),
                    version: '1.0'
                }
            };

            // Store signature
            await this.storeSignature(digitalSignature);

            console.log(`🔒 Digital signature created: ${digitalSignature.id}`);
            return digitalSignature;

        } catch (error) {
            console.error('Error creating digital signature:', error.message);
            throw error;
        }
    }

    // Verify signature integrity
    async verifySignature(signature) {
        try {
            console.log(`🔍 Verifying signature integrity: ${signature.id}`);

            const verification = {
                valid: true,
                errors: [],
                verifiedAt: new Date().toISOString()
            };

            // Verify hash integrity
            const expectedHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(signature.payload))
                .digest('hex');

            if (expectedHash !== signature.hash) {
                verification.errors.push('Signature hash mismatch - document may have been tampered with');
                verification.valid = false;
            }

            // Verify checksum
            const expectedChecksum = this.calculateChecksum(signature.payload);
            if (expectedChecksum !== signature.integrity.checksum) {
                verification.errors.push('Integrity checksum failed');
                verification.valid = false;
            }

            // Verify certificate validity
            const certVerification = await this.verifyCertificate(signature.certificate);
            if (!certVerification.valid) {
                verification.errors.push('Certificate verification failed');
                verification.valid = false;
            }

            // Verify timestamp is within acceptable range
            const signatureTime = new Date(signature.timestamp);
            const now = new Date();
            const timeDiff = Math.abs(now - signatureTime);
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours

            if (timeDiff > maxAge) {
                verification.errors.push('Signature timestamp outside acceptable range');
                verification.valid = false;
            }

            console.log(`${verification.valid ? '✅' : '❌'} Signature verification: ${verification.valid ? 'VALID' : 'INVALID'}`);
            return verification;

        } catch (error) {
            console.error('Signature verification error:', error.message);
            return {
                valid: false,
                errors: [`Verification error: ${error.message}`],
                verifiedAt: new Date().toISOString()
            };
        }
    }

    // Get signature requirements based on type
    getSignatureRequirements(signatureType) {
        const requirements = {
            INSPECTOR: {
                requiredCredentials: ['professional_license', 'fire_inspector_certification'],
                documentTypes: ['inspection_report', 'acceptance_card'],
                authority: 'AHJ',
                legal_weight: 'high'
            },
            CONTRACTOR: {
                requiredCredentials: ['contractor_license', 'insurance_certificate'],
                documentTypes: ['as_built_drawings', 'completion_certificate'],
                authority: 'contractor',
                legal_weight: 'medium'
            },
            ENGINEER: {
                requiredCredentials: ['pe_license', 'fire_protection_specialty'],
                documentTypes: ['design_drawings', 'calculation_sheets'],
                authority: 'professional',
                legal_weight: 'high'
            },
            APPLICANT: {
                requiredCredentials: ['identity_verification'],
                documentTypes: ['application', 'submittal_documents'],
                authority: 'applicant',
                legal_weight: 'low'
            },
            AHJ_OFFICIAL: {
                requiredCredentials: ['official_position', 'jurisdiction_authority'],
                documentTypes: ['permit', 'final_approval'],
                authority: 'government',
                legal_weight: 'highest'
            }
        };

        return requirements[signatureType] || requirements.APPLICANT;
    }

    // Verify professional license
    async verifyProfessionalLicense(licenseNumber, organization) {
        try {
            console.log(`🏛️ Verifying professional license: ${licenseNumber}`);

            // In production, this would integrate with state licensing boards
            // For demo, simulate verification
            const licenseDatabase = {
                'FI-12345': { valid: true, type: 'Fire Inspector', expires: '2026-12-31' },
                'PE-67890': { valid: true, type: 'Professional Engineer', expires: '2025-06-30' },
                'CL-54321': { valid: true, type: 'Contractor License', expires: '2025-12-31' }
            };

            const license = licenseDatabase[licenseNumber];
            
            if (!license) {
                return { valid: false, error: 'License not found' };
            }

            if (new Date(license.expires) < new Date()) {
                return { valid: false, error: 'License expired' };
            }

            return {
                valid: true,
                type: license.type,
                expires: license.expires,
                verifiedAt: new Date().toISOString()
            };

        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Verify certifications
    async verifyCertifications(certifications) {
        try {
            console.log(`📜 Verifying certifications:`, certifications);

            // In production, integrate with certification bodies
            const validCertifications = [
                'CFI', 'CFEI', 'CFPS', 'CFAA', 'NFPA_Certified',
                'ICC_Certified', 'Fire_Inspector_I', 'Fire_Inspector_II'
            ];

            const verified = certifications.every(cert => 
                validCertifications.includes(cert)
            );

            return {
                valid: verified,
                verifiedCertifications: verified ? certifications : [],
                verifiedAt: new Date().toISOString()
            };

        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Get or create digital certificate
    async getOrCreateDigitalCertificate(signerInfo) {
        try {
            const certificateId = crypto
                .createHash('md5')
                .update(`${signerInfo.email}_${signerInfo.organization}`)
                .digest('hex');

            // In production, this would integrate with proper PKI
            const certificate = {
                id: certificateId,
                subject: {
                    commonName: signerInfo.name,
                    email: signerInfo.email,
                    organization: signerInfo.organization,
                    title: signerInfo.title
                },
                issuer: 'NFPA Permit System CA',
                serialNumber: certificateId,
                validFrom: new Date().toISOString(),
                validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
                keyUsage: ['digitalSignature', 'nonRepudiation'],
                publicKey: this.generatePublicKey(),
                fingerprint: this.generateFingerprint()
            };

            return certificate;

        } catch (error) {
            console.error('Error creating digital certificate:', error.message);
            throw error;
        }
    }

    // Verify certificate
    async verifyCertificate(certificate) {
        try {
            const verification = {
                valid: true,
                errors: []
            };

            // Check expiration
            if (new Date(certificate.validTo) < new Date()) {
                verification.errors.push('Certificate expired');
                verification.valid = false;
            }

            // Check issuer (in production, verify against trusted CA)
            if (certificate.issuer !== 'NFPA Permit System CA') {
                verification.errors.push('Untrusted certificate issuer');
                verification.valid = false;
            }

            return verification;

        } catch (error) {
            return {
                valid: false,
                errors: [`Certificate verification error: ${error.message}`]
            };
        }
    }

    // Helper methods
    generateSignatureId(permitId, documentId, signatureType) {
        return `SIG_${permitId}_${documentId}_${signatureType}_${Date.now()}`;
    }

    generateSignatureHash() {
        return crypto.randomBytes(32).toString('hex');
    }

    calculateExpirationDate() {
        // Signature requests expire in 7 days
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    calculateChecksum(data) {
        return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    }

    generatePublicKey() {
        // In production, generate real RSA public key
        return crypto.randomBytes(256).toString('base64');
    }

    generateFingerprint() {
        return crypto.randomBytes(20).toString('hex');
    }

    async storeSignature(signature) {
        try {
            const filePath = `./storage/signatures/${signature.id}.json`;
            await fs.writeFile(filePath, JSON.stringify(signature, null, 2));
            console.log(`💾 Signature stored: ${filePath}`);
        } catch (error) {
            console.error('Error storing signature:', error.message);
        }
    }

    async getSignatureRequest(signatureId) {
        // In production, retrieve from database
        return {
            id: signatureId,
            status: this.signatureStatuses.PENDING,
            signer: { email: 'inspector@city.gov', name: 'Fire Inspector' }
        };
    }

    async updateSignatureStatus(signatureId, status, reason = null) {
        console.log(`📝 Updating signature ${signatureId} status to: ${status}${reason ? ` (${reason})` : ''}`);
        // In production, update database record
    }

    // Get all signatures for a permit
    async getPermitSignatures(permitId) {
        console.log(`📋 Retrieving signatures for permit: ${permitId}`);
        // In production, query database
        return [];
    }

    // Check if all required signatures are complete
    async areAllSignaturesComplete(permitId, documentType) {
        try {
            const signatures = await this.getPermitSignatures(permitId);
            const requiredSignatureTypes = this.getRequiredSignatures(documentType);
            
            const completedTypes = signatures
                .filter(sig => sig.status === this.signatureStatuses.VERIFIED)
                .map(sig => sig.signatureType);

            const missing = requiredSignatureTypes.filter(type => 
                !completedTypes.includes(this.signatureTypes[type])
            );

            return {
                complete: missing.length === 0,
                completed: completedTypes,
                missing: missing,
                total: requiredSignatureTypes.length
            };

        } catch (error) {
            console.error('Error checking signature completeness:', error.message);
            return { complete: false, error: error.message };
        }
    }

    getRequiredSignatures(documentType) {
        const requirements = {
            'acceptance_card': ['INSPECTOR', 'CONTRACTOR'],
            'as_built': ['ENGINEER', 'CONTRACTOR'],
            'final_approval': ['AHJ_OFFICIAL', 'INSPECTOR']
        };

        return requirements[documentType] || ['INSPECTOR'];
    }
}

module.exports = { SignatureManager };
