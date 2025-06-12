import { PermitService } from '../permitService';
import { FabricGateway } from '../../blockchain/gateway';
import { AIService } from '../aiService';
import { StorageService } from '../storageService';
import { Permit, PermitType, PermitStatus, Document, AIReview } from '../../types/permit';
import { UploadedFile } from 'express-fileupload';

// Mock dependencies
jest.mock('../../blockchain/gateway');
jest.mock('../aiService');
jest.mock('../storageService');

describe('PermitService', () => {
    let permitService: PermitService;
    let mockGateway: jest.Mocked<FabricGateway>;
    let mockAIService: jest.Mocked<AIService>;
    let mockStorageService: jest.Mocked<StorageService>;

    const mockPermit: Permit = {
        id: 'permit123',
        status: PermitStatus.DRAFT,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        blockchainHash: '1234567890abcdef',
        property: {
            address: '123 Test St',
            type: 'Commercial',
            constructionType: 'Type I-A',
            floorsAboveGrade: 5,
            floorsBelowGrade: 1,
            squareFootage: 50000
        },
        applicant: {
            name: 'John Doe',
            company: 'Test Corp',
            license: 'PE12345',
            contact: {
                email: 'john@example.com',
                phone: '555-0123',
                address: '123 Main St'
            }
        },
        documents: []
    };

    beforeEach(() => {
        mockGateway = {
            submitTransaction: jest.fn(),
            evaluateTransaction: jest.fn(),
            connect: jest.fn(),
            disconnect: jest.fn()
        } as unknown as jest.Mocked<FabricGateway>;

        mockAIService = {
            analyzeDocuments: jest.fn()
        } as unknown as jest.Mocked<AIService>;

        mockStorageService = {
            uploadDocument: jest.fn()
        } as unknown as jest.Mocked<StorageService>;

        permitService = new PermitService(mockGateway, mockAIService, mockStorageService);
    });

    describe('createPermit', () => {
        it('should create a permit and return with blockchain hash', async () => {
            const blockchainHash = Buffer.from('1234567890abcdef', 'hex');
            mockGateway.submitTransaction.mockResolvedValue(blockchainHash);

            const result = await permitService.createPermit(mockPermit);

            expect(result.blockchainHash).toBe('1234567890abcdef');
            expect(mockGateway.submitTransaction).toHaveBeenCalledWith(
                'createPermit',
                JSON.stringify(mockPermit)
            );
        });

        it('should handle blockchain error', async () => {
            mockGateway.submitTransaction.mockRejectedValue(new Error('Blockchain error'));

            await expect(permitService.createPermit(mockPermit)).rejects.toThrow(
                'Failed to create permit'
            );
        });
    });

    describe('uploadDocument', () => {
        const mockDocument: Document = {
            id: 'doc123',
            name: 'test.pdf',
            type: 'application/pdf',
            hash: '1234567890abcdef',
            status: 'PENDING',
            url: '',
            uploadedAt: '2024-01-01T00:00:00Z',
            file: {
                name: 'test.pdf',
                data: Buffer.from('test'),
                size: 4,
                encoding: '7bit',
                tempFilePath: '',
                truncated: false,
                mimetype: 'application/pdf',
                md5: '',
                mv: jest.fn()
            } as UploadedFile
        };

        it('should upload document and return with blockchain hash', async () => {
            const blockchainHash = Buffer.from('1234567890abcdef', 'hex');
            mockStorageService.uploadDocument.mockResolvedValue({ url: 'https://example.com/doc123', hash: 'abc123' });
            mockGateway.submitTransaction.mockResolvedValue(blockchainHash);

            const result = await permitService.uploadDocument('permit123', mockDocument);

            expect(result.blockchainHash).toBe('1234567890abcdef');
            expect(result.url).toBe('https://example.com/doc123');
        });

        it('should handle storage error', async () => {
            mockStorageService.uploadDocument.mockRejectedValue(new Error('Storage error'));

            await expect(permitService.uploadDocument('permit123', mockDocument)).rejects.toThrow(
                'Failed to upload document'
            );
        });
    });

    describe('runAIComplianceCheck', () => {
        const mockAIReview: AIReview = {
            status: 'COMPLIANT',
            score: 0.95,
            findings: [
                {
                    type: 'NFPA72',
                    description: 'Battery backup requirements met',
                    severity: 'Pass'
                }
            ]
        };

        it('should run AI check and return with blockchain hash', async () => {
            const blockchainHash = Buffer.from('1234567890abcdef', 'hex');
            mockAIService.analyzeDocuments.mockResolvedValue(mockAIReview);
            mockGateway.submitTransaction.mockResolvedValue(blockchainHash);

            const result = await permitService.runAIComplianceCheck('permit123', []);

            expect(result.blockchainHash).toBe('1234567890abcdef');
            expect(mockGateway.submitTransaction).toHaveBeenCalledWith(
                'addAIReview',
                'permit123',
                JSON.stringify(mockAIReview)
            );
        });

        it('should handle AI error', async () => {
            mockAIService.analyzeDocuments.mockRejectedValue(new Error('AI error'));

            await expect(permitService.runAIComplianceCheck('permit123', [])).rejects.toThrow(
                'Failed to run AI compliance check'
            );
        });
    });

    describe('getPermit', () => {
        it('should return permit data', async () => {
            mockGateway.evaluateTransaction.mockResolvedValue(Buffer.from(JSON.stringify(mockPermit)));

            const result = await permitService.getPermit('permit123');

            expect(result).toEqual(mockPermit);
            expect(mockGateway.evaluateTransaction).toHaveBeenCalledWith(
                'getPermit',
                'permit123'
            );
        });

        it('should return null for non-existent permit', async () => {
            mockGateway.evaluateTransaction.mockResolvedValue(Buffer.from('null'));

            const result = await permitService.getPermit('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('updatePermitStatus', () => {
        it('should update permit status', async () => {
            mockGateway.submitTransaction.mockResolvedValue(Buffer.from(''));

            await permitService.updatePermitStatus('permit123', PermitStatus.APPROVED);

            expect(mockGateway.submitTransaction).toHaveBeenCalledWith(
                'updatePermitStatus',
                'permit123',
                PermitStatus.APPROVED
            );
        });

        it('should handle blockchain error', async () => {
            mockGateway.submitTransaction.mockRejectedValue(new Error('Blockchain error'));

            await expect(
                permitService.updatePermitStatus('permit123', PermitStatus.APPROVED)
            ).rejects.toThrow('Failed to update permit status');
        });
    });
}); 