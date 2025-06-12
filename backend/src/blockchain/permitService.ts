import { connect, Contract, Gateway, Identity } from '@hyperledger/fabric-gateway';
import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../config/logger';
import { PermitStatus, PermitType } from '../models/ERRCSPermit';

export class BlockchainPermitService {
    private static instance: BlockchainPermitService;
    private gateway!: Gateway;
    private connectionProfile: any;

    private constructor() {
        this.loadConnectionProfile();
    }

    public static getInstance(): BlockchainPermitService {
        if (!BlockchainPermitService.instance) {
            BlockchainPermitService.instance = new BlockchainPermitService();
        }
        return BlockchainPermitService.instance;
    }

    private loadConnectionProfile() {
        const ccpPath = path.resolve(__dirname, '../../connection-profile.json');
        const fileExists = fs.existsSync(ccpPath);
        if (!fileExists) {
            throw new Error(`Connection profile not found at ${ccpPath}`);
        }
        const contents = fs.readFileSync(ccpPath, 'utf8');
        this.connectionProfile = JSON.parse(contents);
    }

    private async getContract(): Promise<Contract> {
        try {
            const client = await this.newGrpcConnection();
            const identity = await this.newIdentity();
            const signer = await this.newSigner();

            this.gateway = connect({
                client: client as any,
                identity,
                signer,
                evaluateOptions: () => {
                    return { deadline: Date.now() + 5000 }; // 5 seconds
                },
                endorseOptions: () => {
                    return { deadline: Date.now() + 15000 }; // 15 seconds
                },
                submitOptions: () => {
                    return { deadline: Date.now() + 5000 }; // 5 seconds
                },
                commitStatusOptions: () => {
                    return { deadline: Date.now() + 60000 }; // 1 minute
                },
            });

            const network = this.gateway.getNetwork('permitchannel');
            return network.getContract('permitcontract');
        } catch (error) {
            logger.error('Failed to connect to the blockchain network:', error);
            throw error;
        }
    }

    private async newGrpcConnection(): Promise<grpc.Client> {
        const tlsRootCert = await fs.promises.readFile(path.resolve(__dirname, '../../crypto/ca.crt'));
        const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
        return new grpc.Client('peer0.city.permit.com:7051', tlsCredentials, {
            'grpc.ssl_target_name_override': 'peer0.city.permit.com',
        });
    }

    private async newIdentity(): Promise<Identity> {
        const credentials = await fs.promises.readFile(path.resolve(__dirname, '../../crypto/admin.crt'));
        return { mspId: 'CityMSP', credentials };
    }

    private async newSigner(): Promise<any> {
        const privateKeyPem = await fs.promises.readFile(path.resolve(__dirname, '../../crypto/admin.key'));
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        return {
            sign: async (digest: Uint8Array): Promise<Uint8Array> => {
                const signature = crypto.sign(undefined, digest, privateKey);
                return Uint8Array.from(signature);
            }
        };
    }

    public async createPermit(permitData: any): Promise<any> {
        const contract = await this.getContract();
        try {
            const permitId = `PERMIT_${Date.now()}`;
            const result = await contract.submit(
                'createPermit',
                {
                    arguments: [permitId, JSON.stringify(permitData)]
                }
            );
            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to create permit on blockchain:', error);
            throw error;
        } finally {
            this.gateway?.close();
        }
    }

    public async getPermit(permitId: string): Promise<any> {
        const contract = await this.getContract();
        try {
            const result = await contract.evaluate(
                'queryPermit',
                {
                    arguments: [permitId]
                }
            );
            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to query permit from blockchain:', error);
            throw error;
        } finally {
            this.gateway?.close();
        }
    }

    public async updatePermitStatus(permitId: string, newStatus: PermitStatus): Promise<any> {
        const contract = await this.getContract();
        try {
            const result = await contract.submit(
                'updatePermitStatus',
                {
                    arguments: [permitId, newStatus]
                }
            );
            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to update permit status on blockchain:', error);
            throw error;
        } finally {
            this.gateway?.close();
        }
    }

    public async queryPermitsByStatus(status: PermitStatus): Promise<any[]> {
        const contract = await this.getContract();
        try {
            const result = await contract.evaluate(
                'queryPermitsByStatus',
                {
                    arguments: [status]
                }
            );
            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to query permits by status from blockchain:', error);
            throw error;
        } finally {
            this.gateway?.close();
        }
    }

    public async getAllPermits(): Promise<any[]> {
        const contract = await this.getContract();
        try {
            const result = await contract.evaluate(
                'queryPermitsByStatus',
                {
                    arguments: ['']
                }
            );
            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to query all permits from blockchain:', error);
            throw error;
        } finally {
            this.gateway?.close();
        }
    }

    public async getPermitHistory(permitId: string): Promise<any[]> {
        const contract = await this.getContract();
        try {
            const result = await contract.evaluate(
                'getPermitHistory',
                {
                    arguments: [permitId]
                }
            );
            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to get permit history from blockchain:', error);
            throw error;
        } finally {
            this.gateway?.close();
        }
    }

    public async addInspection(permitId: string, inspectionData: any): Promise<any> {
        const contract = await this.getContract();
        try {
            const result = await contract.submit(
                'addInspection',
                {
                    arguments: [permitId, JSON.stringify(inspectionData)]
                }
            );
            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to add inspection to permit on blockchain:', error);
            throw error;
        } finally {
            this.gateway?.close();
        }
    }

    public async queryPermitsByType(type: PermitType): Promise<any[]> {
        const contract = await this.getContract();
        try {
            const result = await contract.evaluate(
                'queryPermitsByType',
                {
                    arguments: [type]
                }
            );
            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to query permits by type from blockchain:', error);
            throw error;
        } finally {
            this.gateway?.close();
        }
    }

    public async addDocument(permitId: string, documentData: any): Promise<any> {
        const contract = await this.getContract();
        try {
            // First, calculate document hash
            const documentHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(documentData))
                .digest('hex');
            
            documentData.docHash = documentHash;
            
            const result = await contract.submit(
                'createPermit', // We're using createPermit with a special type to handle document updates
                {
                    arguments: [
                        permitId,
                        JSON.stringify({
                            type: 'DOCUMENT_ADDED',
                            documentData,
                            timestamp: new Date().toISOString()
                        })
                    ]
                }
            );
            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to add document to permit on blockchain:', error);
            throw error;
        } finally {
            this.gateway?.close();
        }
    }

    public async updateDocument(permitId: string, documentId: string, status: 'APPROVED' | 'REJECTED', comments?: string): Promise<any> {
        const contract = await this.getContract();
        try {
            const result = await contract.submit(
                'createPermit', // We're using createPermit with a special type to handle document updates
                {
                    arguments: [
                        permitId,
                        JSON.stringify({
                            type: 'DOCUMENT_UPDATED',
                            documentId,
                            status,
                            comments,
                            timestamp: new Date().toISOString()
                        })
                    ]
                }
            );
            return JSON.parse(result.toString());
        } catch (error) {
            logger.error('Failed to update document status on blockchain:', error);
            throw error;
        } finally {
            this.gateway?.close();
        }
    }

    public async getDashboardStats(): Promise<any> {
        const contract = await this.getContract();
        try {
            const [
                totalPermits,
                pendingPermits,
                approvedPermits,
                rejectedPermits
            ] = await Promise.all([
                this.getAllPermits(),
                this.queryPermitsByStatus(PermitStatus.UNDER_REVIEW),
                this.queryPermitsByStatus(PermitStatus.APPROVED),
                this.queryPermitsByStatus(PermitStatus.REJECTED)
            ]);

            const permitsByType: Record<PermitType, any[]> = {} as Record<PermitType, any[]>;
            for (const type of Object.values(PermitType)) {
                permitsByType[type] = await this.queryPermitsByType(type);
            }

            return {
                totalPermits: totalPermits.length,
                pendingPermits: pendingPermits.length,
                approvedPermits: approvedPermits.length,
                rejectedPermits: rejectedPermits.length,
                permitsByType: Object.entries(permitsByType).reduce<Record<string, number>>((acc, [type, permits]) => {
                    acc[type] = permits.length;
                    return acc;
                }, {})
            };
        } catch (error) {
            logger.error('Failed to get dashboard stats from blockchain:', error);
            throw error;
        } finally {
            this.gateway?.close();
        }
    }
} 