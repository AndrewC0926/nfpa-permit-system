import { Context } from 'fabric-contract-api';
import { ChaincodeStub, ClientIdentity } from 'fabric-shim';
import { PermitContract } from '../permitContract';
import { Permit, PermitType, PermitStatus } from '../../../src/types/permit';

describe('PermitContract', () => {
    let contract: PermitContract;
    let ctx: Context;
    let stub: jest.Mocked<ChaincodeStub>;
    let clientIdentity: jest.Mocked<ClientIdentity>;

    const mockPermit: Permit = {
        id: 'permit123',
        type: PermitType.ERRCS,
        status: PermitStatus.DRAFT,
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
            },
            certifications: [
                {
                    type: 'NICET III',
                    number: 'NICET-123',
                    expiryDate: '2025-12-31'
                }
            ]
        },
        nfpaData: {
            code: 'NFPA 72',
            version: '2019',
            requirements: [],
            specifications: {
                bdaModel: 'BDA-2000',
                bdaManufacturer: 'TechCorp',
                bdaFccId: 'TECH-BDA2000',
                frequencyRanges: '700-800MHz',
                donorSiteLocation: 'Rooftop',
                donorAntennaSpecs: {
                    type: 'Directional',
                    gain: 14,
                    height: 30
                },
                powerCalculations: '100W',
                batteryBackupTime: '24',
                groundingDetails: 'NFPA 780 compliant',
                surgeProtection: 'Type 1 SPD',
                autoDialerConfig: 'Configured'
            }
        },
        documents: []
    };

    beforeEach(() => {
        contract = new PermitContract();
        stub = {
            getState: jest.fn(),
            putState: jest.fn(),
            setEvent: jest.fn(),
            getTxID: jest.fn(),
            getHistoryForKey: jest.fn(),
            getQueryResult: jest.fn()
        } as unknown as jest.Mocked<ChaincodeStub>;

        clientIdentity = {
            getID: jest.fn(),
            getMSPID: jest.fn(),
            getAttributeValue: jest.fn()
        } as unknown as jest.Mocked<ClientIdentity>;

        ctx = {
            stub,
            clientIdentity
        } as unknown as Context;
    });

    describe('createPermit', () => {
        it('should create a new permit', async () => {
            stub.getState.mockResolvedValue(Buffer.from(''));
            stub.getTxID.mockReturnValue('tx123');

            const result = await contract.createPermit(ctx, JSON.stringify(mockPermit));

            expect(result).toBe('tx123');
            expect(stub.putState).toHaveBeenCalledWith(
                mockPermit.id,
                expect.any(Buffer)
            );
            expect(stub.setEvent).toHaveBeenCalledWith(
                'PermitCreated',
                expect.any(Buffer)
            );
        });

        it('should reject if permit already exists', async () => {
            stub.getState.mockResolvedValue(Buffer.from(JSON.stringify(mockPermit)));

            await expect(contract.createPermit(ctx, JSON.stringify(mockPermit)))
                .rejects.toThrow(`Permit ${mockPermit.id} already exists`);
        });

        it('should reject invalid permit data', async () => {
            const invalidPermit = { ...mockPermit, id: undefined };

            await expect(contract.createPermit(ctx, JSON.stringify(invalidPermit)))
                .rejects.toThrow('Invalid permit data');
        });
    });

    describe('addDocument', () => {
        const mockDocument = {
            id: 'doc123',
            name: 'test.pdf',
            type: 'application/pdf',
            hash: '0x1234567890abcdef',
            status: 'PENDING',
            url: 'https://example.com/test.pdf',
            uploadedAt: new Date().toISOString()
        };

        it('should add a document to a permit', async () => {
            stub.getState.mockResolvedValue(Buffer.from(JSON.stringify(mockPermit)));

            await contract.addDocument(ctx, mockPermit.id, JSON.stringify(mockDocument));

            expect(stub.putState).toHaveBeenCalledWith(
                mockPermit.id,
                expect.any(Buffer)
            );
            expect(stub.setEvent).toHaveBeenCalledWith(
                'DocumentAdded',
                expect.any(Buffer)
            );
        });

        it('should reject if permit does not exist', async () => {
            stub.getState.mockResolvedValue(Buffer.from(''));

            await expect(contract.addDocument(ctx, mockPermit.id, JSON.stringify(mockDocument)))
                .rejects.toThrow(`Permit ${mockPermit.id} does not exist`);
        });

        it('should reject invalid document data', async () => {
            stub.getState.mockResolvedValue(Buffer.from(JSON.stringify(mockPermit)));
            const invalidDocument = { ...mockDocument, id: undefined, hash: undefined };

            await expect(contract.addDocument(ctx, mockPermit.id, JSON.stringify(invalidDocument)))
                .rejects.toThrow('Invalid document data');
        });
    });

    describe('recordAIReview', () => {
        const mockReview = {
            status: 'COMPLIANT' as const,
            score: 0.95,
            findings: [
                {
                    type: 'NFPA72',
                    description: 'Battery backup requirements met',
                    severity: 'Pass' as const
                }
            ]
        };

        it('should record AI review results', async () => {
            stub.getState.mockResolvedValue(Buffer.from(JSON.stringify(mockPermit)));

            await contract.recordAIReview(ctx, mockPermit.id, JSON.stringify(mockReview));

            expect(stub.putState).toHaveBeenCalledWith(
                mockPermit.id,
                expect.any(Buffer)
            );
            expect(stub.setEvent).toHaveBeenCalledWith(
                'AIReviewRecorded',
                expect.any(Buffer)
            );
        });

        it('should reject if permit does not exist', async () => {
            stub.getState.mockResolvedValue(Buffer.from(''));

            await expect(contract.recordAIReview(ctx, mockPermit.id, JSON.stringify(mockReview)))
                .rejects.toThrow(`Permit ${mockPermit.id} does not exist`);
        });

        it('should reject invalid review data', async () => {
            stub.getState.mockResolvedValue(Buffer.from(JSON.stringify(mockPermit)));
            const invalidReview = { ...mockReview, status: undefined, findings: undefined };

            await expect(contract.recordAIReview(ctx, mockPermit.id, JSON.stringify(invalidReview)))
                .rejects.toThrow('Invalid AI review data');
        });
    });

    describe('updatePermitStatus', () => {
        it('should update permit status', async () => {
            stub.getState.mockResolvedValue(Buffer.from(JSON.stringify(mockPermit)));

            await contract.updatePermitStatus(ctx, mockPermit.id, PermitStatus.UNDER_REVIEW);

            expect(stub.putState).toHaveBeenCalledWith(
                mockPermit.id,
                expect.any(Buffer)
            );
            expect(stub.setEvent).toHaveBeenCalledWith(
                'StatusUpdated',
                expect.any(Buffer)
            );
        });

        it('should reject if permit does not exist', async () => {
            stub.getState.mockResolvedValue(Buffer.from(''));

            await expect(contract.updatePermitStatus(ctx, mockPermit.id, PermitStatus.UNDER_REVIEW))
                .rejects.toThrow(`Permit ${mockPermit.id} does not exist`);
        });
    });

    describe('getPermit', () => {
        it('should return permit data', async () => {
            stub.getState.mockResolvedValue(Buffer.from(JSON.stringify(mockPermit)));

            const result = await contract.getPermit(ctx, mockPermit.id);

            expect(result).toEqual(mockPermit);
        });

        it('should return null for non-existent permit', async () => {
            stub.getState.mockResolvedValue(Buffer.from(''));

            const result = await contract.getPermit(ctx, 'nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('getPermitHistory', () => {
        const mockHistory = [
            {
                txId: 'tx1',
                timestamp: { seconds: { low: Date.now() / 1000 } },
                value: Buffer.from(JSON.stringify(mockPermit)),
                isDelete: false
            }
        ];

        it('should return permit history', async () => {
            const mockIterator = {
                next: jest.fn()
                    .mockResolvedValueOnce({ done: false, value: mockHistory[0] })
                    .mockResolvedValueOnce({ done: true }),
                close: jest.fn()
            };

            stub.getHistoryForKey.mockResolvedValue(mockIterator);

            const result = await contract.getPermitHistory(ctx, mockPermit.id);

            expect(result).toHaveLength(1);
            expect(result[0].txId).toBe('tx1');
            expect(result[0].value).toEqual(mockPermit);
            expect(mockIterator.close).toHaveBeenCalled();
        });
    });
}); 