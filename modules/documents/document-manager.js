/**
 * NFPA Permit System - Document Management Module
 * Handles document upload, validation, and storage for permit closeout
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { PDFDocument } = require('pdf-lib');

class DocumentManager {
    constructor() {
        this.allowedFileTypes = {
            'acceptance_card': ['.pdf', '.jpg', '.jpeg', '.png', '.tiff'],
            'as_built': ['.pdf', '.dwg', '.dxf', '.jpg', '.jpeg', '.png', '.tiff']
        };
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.storageBasePath = './storage';
        this.initializeStorage();
    }

    async initializeStorage() {
        const directories = [
            `${this.storageBasePath}/uploads`,
            `${this.storageBasePath}/as-builts`,
            `${this.storageBasePath}/acceptance-cards`,
            `${this.storageBasePath}/temp`
        ];

        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`✅ Storage directory created: ${dir}`);
            } catch (error) {
                console.error(`❌ Error creating directory ${dir}:`, error.message);
            }
        }
    }

    // Configure multer for file uploads
    getUploadMiddleware() {
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadPath = `${this.storageBasePath}/temp`;
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const fileExtension = path.extname(file.originalname);
                cb(null, `${file.fieldname}-${uniqueSuffix}${fileExtension}`);
            }
        });

        const fileFilter = (req, file, cb) => {
            const documentType = req.body.documentType || file.fieldname;
            const allowedTypes = this.allowedFileTypes[documentType] || [];
            const fileExtension = path.extname(file.originalname).toLowerCase();

            if (allowedTypes.includes(fileExtension)) {
                cb(null, true);
            } else {
                cb(new Error(`Invalid file type. Allowed types for ${documentType}: ${allowedTypes.join(', ')}`), false);
            }
        };

        return multer({
            storage: storage,
            limits: {
                fileSize: this.maxFileSize,
                files: 10 // Maximum 10 files per upload
            },
            fileFilter: fileFilter
        });
    }

    // Upload and process documents for permit closeout
    async uploadPermitDocument(permitId, documentType, file, metadata = {}) {
        try {
            console.log(`📄 Processing ${documentType} upload for permit ${permitId}`);

            // Validate document type
            if (!this.allowedFileTypes[documentType]) {
                throw new Error(`Invalid document type: ${documentType}`);
            }

            // Generate document ID
            const documentId = this.generateDocumentId(permitId, documentType);

            // Validate file
            const validationResult = await this.validateDocument(file, documentType);
            if (!validationResult.valid) {
                throw new Error(`Document validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Generate file hash for integrity
            const fileHash = await this.generateFileHash(file.path);

            // Move file to permanent storage
            const permanentPath = await this.moveToPermamentStorage(file, permitId, documentType, documentId);

            // Extract document metadata
            const extractedMetadata = await this.extractDocumentMetadata(permanentPath, documentType);

            // Create document record
            const documentRecord = {
                id: documentId,
                permitId: permitId,
                type: documentType,
                originalName: file.originalname,
                fileName: path.basename(permanentPath),
                filePath: permanentPath,
                fileSize: file.size,
                mimeType: file.mimetype,
                hash: fileHash,
                uploadedAt: new Date().toISOString(),
                uploadedBy: metadata.uploadedBy || 'system',
                status: 'pending_verification',
                metadata: {
                    ...metadata,
                    ...extractedMetadata
                },
                verification: {
                    integrity: true,
                    compliance: await this.checkNFPACompliance(permanentPath, documentType),
                    completeness: await this.checkDocumentCompleteness(permanentPath, documentType)
                }
            };

            console.log(`✅ Document uploaded successfully: ${documentId}`);
            return documentRecord;

        } catch (error) {
            console.error(`❌ Document upload failed:`, error.message);
            // Clean up temp file
            if (file && file.path) {
                try {
                    await fs.unlink(file.path);
                } catch (cleanupError) {
                    console.error('Error cleaning up temp file:', cleanupError.message);
                }
            }
            throw error;
        }
    }

    // Validate uploaded document
    async validateDocument(file, documentType) {
        const errors = [];
        
        try {
            // Check file size
            if (file.size > this.maxFileSize) {
                errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${this.maxFileSize / 1024 / 1024}MB`);
            }

            // Check file extension
            const fileExtension = path.extname(file.originalname).toLowerCase();
            const allowedTypes = this.allowedFileTypes[documentType];
            if (!allowedTypes.includes(fileExtension)) {
                errors.push(`Invalid file type ${fileExtension}. Allowed: ${allowedTypes.join(', ')}`);
            }

            // Check if file exists and is readable
            try {
                await fs.access(file.path);
            } catch (accessError) {
                errors.push('File is not accessible or corrupted');
            }

            // Additional validation for specific document types
            if (documentType === 'acceptance_card') {
                const cardValidation = await this.validateAcceptanceCard(file.path);
                if (!cardValidation.valid) {
                    errors.push(...cardValidation.errors);
                }
            }

            if (documentType === 'as_built') {
                const asBuiltValidation = await this.validateAsBuiltDrawing(file.path);
                if (!asBuiltValidation.valid) {
                    errors.push(...asBuiltValidation.errors);
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors
            };

        } catch (error) {
            console.error('Document validation error:', error.message);
            return {
                valid: false,
                errors: [`Validation error: ${error.message}`]
            };
        }
    }

    // Validate Acceptance Card requirements
    async validateAcceptanceCard(filePath) {
        const errors = [];
        
        try {
            const fileExtension = path.extname(filePath).toLowerCase();
            
            if (fileExtension === '.pdf') {
                // For PDF files, check for required elements
                const pdfValidation = await this.validatePDFAcceptanceCard(filePath);
                if (!pdfValidation.hasSignature) {
                    errors.push('Acceptance card must contain a valid signature');
                }
                if (!pdfValidation.hasDate) {
                    errors.push('Acceptance card must contain completion date');
                }
                if (!pdfValidation.hasPermitNumber) {
                    errors.push('Acceptance card must reference permit number');
                }
            } else {
                // For image files, check basic requirements
                const imageValidation = await this.validateImageQuality(filePath);
                if (!imageValidation.adequate) {
                    errors.push('Image quality insufficient for document verification');
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors
            };

        } catch (error) {
            return {
                valid: false,
                errors: [`Acceptance card validation error: ${error.message}`]
            };
        }
    }

    // Validate As-Built Drawing requirements
    async validateAsBuiltDrawing(filePath) {
        const errors = [];
        
        try {
            const fileExtension = path.extension(filePath).toLowerCase();
            
            // Check file type specific requirements
            if (['.dwg', '.dxf'].includes(fileExtension)) {
                // CAD file validation
                const cadValidation = await this.validateCADFile(filePath);
                if (!cadValidation.valid) {
                    errors.push(...cadValidation.errors);
                }
            } else if (fileExtension === '.pdf') {
                // PDF drawing validation
                const pdfValidation = await this.validatePDFDrawing(filePath);
                if (!pdfValidation.valid) {
                    errors.push(...pdfValidation.errors);
                }
            } else {
                // Image file validation
                const imageValidation = await this.validateImageQuality(filePath);
                if (!imageValidation.adequate) {
                    errors.push('Drawing image quality insufficient for review');
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors
            };

        } catch (error) {
            return {
                valid: false,
                errors: [`As-built validation error: ${error.message}`]
            };
        }
    }

    // Generate unique document ID
    generateDocumentId(permitId, documentType) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${permitId}_${documentType.toUpperCase()}_${timestamp}_${random}`;
    }

    // Generate file hash for integrity verification
    async generateFileHash(filePath) {
        try {
            const fileBuffer = await fs.readFile(filePath);
            return crypto.createHash('sha256').update(fileBuffer).digest('hex');
        } catch (error) {
            console.error('Error generating file hash:', error.message);
            return null;
        }
    }

    // Move file to permanent storage
    async moveToPermamentStorage(file, permitId, documentType, documentId) {
        try {
            const fileExtension = path.extname(file.originalname);
            const fileName = `${documentId}${fileExtension}`;
            const destinationDir = `${this.storageBasePath}/${documentType === 'acceptance_card' ? 'acceptance-cards' : 'as-builts'}/${permitId}`;
            const destinationPath = path.join(destinationDir, fileName);

            // Create directory if it doesn't exist
            await fs.mkdir(destinationDir, { recursive: true });

            // Move file
            await fs.rename(file.path, destinationPath);

            console.log(`📁 File moved to permanent storage: ${destinationPath}`);
            return destinationPath;

        } catch (error) {
            console.error('Error moving file to permanent storage:', error.message);
            throw error;
        }
    }

    // Extract document metadata
    async extractDocumentMetadata(filePath, documentType) {
        try {
            const stats = await fs.stat(filePath);
            const fileExtension = path.extname(filePath).toLowerCase();
            
            const metadata = {
                fileSize: stats.size,
                lastModified: stats.mtime.toISOString(),
                extension: fileExtension
            };

            // Extract additional metadata based on file type
            if (fileExtension === '.pdf') {
                const pdfMetadata = await this.extractPDFMetadata(filePath);
                metadata.pdf = pdfMetadata;
            }

            return metadata;

        } catch (error) {
            console.error('Error extracting metadata:', error.message);
            return {};
        }
    }

    // Check NFPA compliance of uploaded documents
    async checkNFPACompliance(filePath, documentType) {
        try {
            console.log(`🔍 Checking NFPA compliance for ${documentType}`);

            const compliance = {
                compliant: true,
                violations: [],
                warnings: [],
                checkedStandards: []
            };

            if (documentType === 'as_built') {
                // Check as-built drawings against NFPA standards
                compliance.checkedStandards = ['NFPA 13', 'NFPA 72', 'NFPA 101'];
                
                // Simulate AI-powered compliance checking
                const fileContent = await this.extractDrawingContent(filePath);
                
                // Check for required elements
                if (!fileContent.includes('fire protection') && !fileContent.includes('sprinkler')) {
                    compliance.warnings.push('Fire protection systems not clearly indicated');
                }
                
                if (!fileContent.includes('exit') && !fileContent.includes('egress')) {
                    compliance.warnings.push('Egress paths not clearly marked');
                }
            }

            if (documentType === 'acceptance_card') {
                // Check acceptance card for required signatures and dates
                compliance.checkedStandards = ['NFPA 25'];
                
                const cardContent = await this.extractDocumentText(filePath);
                
                if (!cardContent.includes('inspector') && !cardContent.includes('signature')) {
                    compliance.violations.push('Missing inspector signature or certification');
                }
            }

            compliance.compliant = compliance.violations.length === 0;
            
            console.log(`✅ NFPA compliance check completed: ${compliance.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
            return compliance;

        } catch (error) {
            console.error('NFPA compliance check error:', error.message);
            return {
                compliant: false,
                violations: [`Compliance check failed: ${error.message}`],
                warnings: [],
                checkedStandards: []
            };
        }
    }

    // Check document completeness
    async checkDocumentCompleteness(filePath, documentType) {
        try {
            const completeness = {
                complete: true,
                missingElements: [],
                score: 100
            };

            if (documentType === 'as_built') {
                // Check for required drawing elements
                const requiredElements = [
                    'title block',
                    'scale',
                    'revision date',
                    'engineer seal',
                    'fire protection systems'
                ];

                const content = await this.extractDrawingContent(filePath);
                
                for (const element of requiredElements) {
                    if (!content.toLowerCase().includes(element.toLowerCase())) {
                        completeness.missingElements.push(element);
                    }
                }
            }

            if (documentType === 'acceptance_card') {
                // Check for required card elements
                const requiredElements = [
                    'permit number',
                    'completion date',
                    'inspector signature',
                    'contractor information'
                ];

                const content = await this.extractDocumentText(filePath);
                
                for (const element of requiredElements) {
                    if (!content.toLowerCase().includes(element.replace(' ', '').toLowerCase())) {
                        completeness.missingElements.push(element);
                    }
                }
            }

            completeness.complete = completeness.missingElements.length === 0;
            completeness.score = Math.max(0, 100 - (completeness.missingElements.length * 20));

            return completeness;

        } catch (error) {
            console.error('Document completeness check error:', error.message);
            return {
                complete: false,
                missingElements: [`Completeness check failed: ${error.message}`],
                score: 0
            };
        }
    }

    // Helper methods for content extraction (simplified for demo)
    async extractDrawingContent(filePath) {
        // In production, this would use CAD parsing libraries or OCR
        return `title block scale revision date engineer seal fire protection systems sprinkler layout exit routes`;
    }

    async extractDocumentText(filePath) {
        // In production, this would use OCR or PDF text extraction
        return `permit number 12345 completion date inspector signature contractor information`;
    }

    async extractPDFMetadata(filePath) {
        try {
            // In production, use pdf-lib or similar to extract real metadata
            return {
                pages: 1,
                author: 'Fire Safety Engineer',
                created: new Date().toISOString(),
                title: 'NFPA Compliance Document'
            };
        } catch (error) {
            return {};
        }
    }

    async validatePDFAcceptanceCard(filePath) {
        // Simplified validation - in production would parse PDF content
        return {
            hasSignature: true,
            hasDate: true,
            hasPermitNumber: true
        };
    }

    async validateImageQuality(filePath) {
        // Simplified validation - in production would analyze image quality
        return {
            adequate: true,
            resolution: '300dpi',
            clarity: 'good'
        };
    }

    async validateCADFile(filePath) {
        // Simplified validation - in production would use CAD libraries
        return {
            valid: true,
            errors: []
        };
    }

    async validatePDFDrawing(filePath) {
        // Simplified validation - in production would parse PDF content
        return {
            valid: true,
            errors: []
        };
    }

    // Get document by ID
    async getDocument(documentId) {
        // In production, this would query the database
        console.log(`📄 Retrieving document: ${documentId}`);
        return {
            id: documentId,
            status: 'verified',
            // ... other document properties
        };
    }

    // List documents for a permit
    async getPermitDocuments(permitId, documentType = null) {
        console.log(`📋 Retrieving documents for permit: ${permitId}${documentType ? ` (type: ${documentType})` : ''}`);
        
        // In production, this would query the database
        return [
            {
                id: `${permitId}_ACCEPTANCE_CARD_${Date.now()}`,
                type: 'acceptance_card',
                status: 'verified',
                uploadedAt: new Date().toISOString()
            },
            {
                id: `${permitId}_AS_BUILT_${Date.now()}`,
                type: 'as_built',
                status: 'verified', 
                uploadedAt: new Date().toISOString()
            }
        ];
    }

    // Delete document
    async deleteDocument(documentId) {
        console.log(`🗑️ Deleting document: ${documentId}`);
        // In production, this would remove file and database record
        return { success: true };
    }
}

module.exports = { DocumentManager };
