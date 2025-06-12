import { Permit, PermitStatus, Document, AIReview } from '../types/permit';
import { BlockchainGateway } from '../blockchain/gateway';
import { AIService } from './aiService';
import { StorageService } from './storageService';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { ExtractionService } from './extractionService';
import { ERRCSPermit, IDocument } from '../models/ERRCSPermit';
import { ValidationService } from './validationService';
import { logger } from '../config/logger';

export class PermitService {
    private validationService: ValidationService;

    constructor(
        private blockchainGateway: BlockchainGateway,
        private aiService: AIService,
        private storageService: StorageService
    ) {
        this.validationService = new ValidationService();
    }

    async createPermit(permitData: any): Promise<ERRCSPermit> {
        try {
            const permit = new ERRCSPermit(permitData);
            await permit.save();

            // Run validation
            const validationResults = await this.validationService.validatePermit(permit);
            
            // Update permit with validation results
            permit.complianceCheck = {
                status: validationResults.every(r => r.passed) ? 'COMPLIANT' : 'NON_COMPLIANT',
                score: validationResults.filter(r => r.passed).length / validationResults.length,
                findings: validationResults.map(r => ({
                    type: r.requirement.code,
                    description: r.details,
                    severity: r.severity
                }))
            };

            await permit.save();

            // Store in blockchain
            await this.blockchainGateway.storePermit(permit);

            return permit;
        } catch (error) {
            logger.error('Error creating permit:', error);
            throw error;
        }
    }

    async uploadDocument(permitId: string, file: Express.Multer.File): Promise<IDocument> {
        try {
            const permit = await ERRCSPermit.findById(permitId);
            if (!permit) {
                throw new Error('Permit not found');
            }

            // Upload to S3 and get URL and hash
            const { url, hash } = await this.storageService.uploadDocument(file);

            // Create document record
            const document: IDocument = {
                name: file.originalname,
                type: file.mimetype,
                url,
                hash,
                status: 'PENDING',
                uploadedAt: new Date().toISOString()
            };

            permit.documents.push(document);
            await permit.save();

            // Store document metadata in blockchain
            await this.blockchainGateway.storeDocument(permitId, document);

            return document;
        } catch (error) {
            logger.error('Error uploading document:', error);
            throw error;
        }
    }

    async runAIComplianceCheck(permitId: string): Promise<any> {
        try {
            const permit = await ERRCSPermit.findById(permitId);
            if (!permit) {
                throw new Error('Permit not found');
            }

            // Run validation
            const validationResults = await this.validationService.validatePermit(permit);
            
            // Update permit with validation results
            permit.complianceCheck = {
                status: validationResults.every(r => r.passed) ? 'COMPLIANT' : 'NON_COMPLIANT',
                score: validationResults.filter(r => r.passed).length / validationResults.length,
                findings: validationResults.map(r => ({
                    type: r.requirement.code,
                    description: r.details,
                    severity: r.severity
                }))
            };

            await permit.save();

            // Store updated compliance check in blockchain
            await this.blockchainGateway.updateComplianceCheck(permitId, permit.complianceCheck);

            return permit.complianceCheck;
        } catch (error) {
            logger.error('Error running compliance check:', error);
            throw error;
        }
    }

    async getPermit(permitId: string): Promise<Permit | null> {
        try {
            const result = await this.blockchainGateway.evaluateTransaction('getPermit', permitId);
            return result ? JSON.parse(result.toString()) : null;
        } catch (error) {
            console.error('Error getting permit:', error);
            throw new Error('Failed to get permit');
        }
    }

    async updatePermitStatus(permitId: string, status: PermitStatus): Promise<void> {
        try {
            await this.blockchainGateway.submitTransaction(
                'updatePermitStatus',
                permitId,
                status
            );
        } catch (error) {
            console.error('Error updating permit status:', error);
            throw new Error('Failed to update permit status');
        }
    }

    async getPermitHistory(permitId: string): Promise<any[]> {
        try {
            const result = await this.blockchainGateway.evaluateTransaction('getPermitHistory', permitId);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Error getting permit history:', error);
            throw new Error('Failed to get permit history');
        }
    }

    private async calculateDocumentHash(document: Document): Promise<string> {
        // In a real implementation, this would calculate a hash of the actual file content
        const hash = createHash('sha256');
        hash.update(document.name + document.type + Date.now());
        return '0x' + hash.digest('hex');
    }
} 