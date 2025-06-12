import { Request, Response } from 'express';
import { ERRCSPermit, PermitStatus, PermitType } from '../models/ERRCSPermit';
import { BlockchainPermitService } from '../blockchain/permitService';
import { logger } from '../config/logger';

export class PermitController {
    private static instance: PermitController;
    private blockchainService: BlockchainPermitService;

    private constructor() {
        this.blockchainService = BlockchainPermitService.getInstance();
    }

    public static getInstance(): PermitController {
        if (!PermitController.instance) {
            PermitController.instance = new PermitController();
        }
        return PermitController.instance;
    }

    public async initPermitSystem(req: Request, res: Response): Promise<void> {
        try {
            // Initialize the blockchain network
            await this.blockchainService.createPermit({
                type: 'SYSTEM_INIT',
                status: 'COMPLETED',
                timestamp: Date.now()
            });

            res.status(200).json({
                success: true,
                message: 'Permit system initialized successfully'
            });
        } catch (error) {
            logger.error('Failed to initialize permit system:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to initialize permit system'
            });
        }
    }

    public async getPermitTypes(req: Request, res: Response): Promise<void> {
        try {
            res.status(200).json({
                success: true,
                data: Object.values(PermitType)
            });
        } catch (error) {
            logger.error('Failed to get permit types:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get permit types'
            });
        }
    }

    public async createPermit(req: Request, res: Response): Promise<void> {
        try {
            const permitData = {
                ...req.body,
                status: PermitStatus.DRAFT,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Save to MongoDB
            const permit = new ERRCSPermit(permitData);
            await permit.save();

            // Save to blockchain
            await this.blockchainService.createPermit(permitData);

            res.status(201).json({
                success: true,
                data: permit
            });
        } catch (error) {
            logger.error('Failed to create permit:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create permit'
            });
        }
    }

    public async getAllPermits(req: Request, res: Response): Promise<void> {
        try {
            const { page = 1, limit = 10, status, type } = req.query;
            const query: any = {};

            if (status) query.status = status;
            if (type) query.type = type;

            const permits = await ERRCSPermit.find(query)
                .sort({ createdAt: -1 })
                .skip((Number(page) - 1) * Number(limit))
                .limit(Number(limit))
                .populate('applicant', 'firstName lastName email')
                .populate('organization', 'name');

            const total = await ERRCSPermit.countDocuments(query);

            res.status(200).json({
                success: true,
                data: {
                    permits,
                    pagination: {
                        total,
                        page: Number(page),
                        pages: Math.ceil(total / Number(limit))
                    }
                }
            });
        } catch (error) {
            logger.error('Failed to get permits:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get permits'
            });
        }
    }

    public async getPermitById(req: Request, res: Response): Promise<void> {
        try {
            const permit = await ERRCSPermit.findById(req.params.id)
                .populate('applicant', 'firstName lastName email')
                .populate('organization', 'name')
                .populate('documents.uploadedBy', 'firstName lastName')
                .populate('inspections.inspector', 'firstName lastName');

            if (!permit) {
                res.status(404).json({
                    success: false,
                    message: 'Permit not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: permit
            });
        } catch (error) {
            logger.error('Failed to get permit:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get permit'
            });
        }
    }

    public async updatePermitStatus(req: Request, res: Response): Promise<void> {
        try {
            const { status } = req.body;
            const permit = await ERRCSPermit.findById(req.params.id);

            if (!permit) {
                res.status(404).json({
                    success: false,
                    message: 'Permit not found'
                });
                return;
            }

            permit.status = status;
            permit.lastModified = new Date();
            await permit.save();

            // Update blockchain
            await this.blockchainService.updatePermitStatus(permit.permitNumber, status);

            res.status(200).json({
                success: true,
                data: permit
            });
        } catch (error) {
            logger.error('Failed to update permit status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update permit status'
            });
        }
    }

    public async addInspection(req: Request, res: Response): Promise<void> {
        try {
            const permit = await ERRCSPermit.findById(req.params.id);

            if (!permit) {
                res.status(404).json({
                    success: false,
                    message: 'Permit not found'
                });
                return;
            }

            permit.inspections.push(req.body);
            permit.lastModified = new Date();
            await permit.save();

            // Update blockchain
            await this.blockchainService.createPermit({
                ...permit.toObject(),
                type: 'INSPECTION_ADDED',
                inspectionData: req.body
            });

            res.status(200).json({
                success: true,
                data: permit
            });
        } catch (error) {
            logger.error('Failed to add inspection:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add inspection'
            });
        }
    }

    public async getPermitHistory(req: Request, res: Response): Promise<void> {
        try {
            const permit = await ERRCSPermit.findById(req.params.id);

            if (!permit) {
                res.status(404).json({
                    success: false,
                    message: 'Permit not found'
                });
                return;
            }

            const history = await this.blockchainService.getPermitHistory(permit.permitNumber);

            res.status(200).json({
                success: true,
                data: history
            });
        } catch (error) {
            logger.error('Failed to get permit history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get permit history'
            });
        }
    }

    public async getDashboardStats(req: Request, res: Response): Promise<void> {
        try {
            const [
                totalPermits,
                pendingPermits,
                approvedPermits,
                rejectedPermits,
                expiringPermits
            ] = await Promise.all([
                ERRCSPermit.countDocuments(),
                ERRCSPermit.countDocuments({ status: PermitStatus.UNDER_REVIEW }),
                ERRCSPermit.countDocuments({ status: PermitStatus.APPROVED }),
                ERRCSPermit.countDocuments({ status: PermitStatus.REJECTED }),
                ERRCSPermit.countDocuments({
                    status: PermitStatus.APPROVED,
                    expirationDate: {
                        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                    }
                })
            ]);

            const permitsByType = await ERRCSPermit.aggregate([
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const permitsByStatus = await ERRCSPermit.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            res.status(200).json({
                success: true,
                data: {
                    totalPermits,
                    pendingPermits,
                    approvedPermits,
                    rejectedPermits,
                    expiringPermits,
                    permitsByType,
                    permitsByStatus
                }
            });
        } catch (error) {
            logger.error('Failed to get dashboard stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get dashboard stats'
            });
        }
    }

    public async updatePayment(req: Request, res: Response): Promise<void> {
        try {
            const { transactionId } = req.body;
            const permit = await ERRCSPermit.findById(req.params.id);

            if (!permit) {
                res.status(404).json({
                    success: false,
                    message: 'Permit not found'
                });
                return;
            }

            permit.fees.status = 'PAID';
            permit.fees.transactionId = transactionId;
            permit.fees.paidAt = new Date();
            permit.lastModified = new Date();
            await permit.save();

            // Update blockchain
            await this.blockchainService.createPermit({
                ...permit.toObject(),
                type: 'PAYMENT_UPDATED',
                paymentData: {
                    transactionId,
                    status: 'PAID',
                    paidAt: new Date()
                }
            });

            res.status(200).json({
                success: true,
                data: permit
            });
        } catch (error) {
            logger.error('Failed to update payment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update payment'
            });
        }
    }

    public async uploadDocument(req: Request, res: Response): Promise<void> {
        try {
            const permit = await ERRCSPermit.findById(req.params.id);

            if (!permit) {
                res.status(404).json({
                    success: false,
                    message: 'Permit not found'
                });
                return;
            }

            const document = {
                ...req.body,
                uploadedAt: new Date(),
                status: 'PENDING'
            };

            permit.documents.push(document);
            permit.lastModified = new Date();
            await permit.save();

            // Update blockchain
            await this.blockchainService.createPermit({
                ...permit.toObject(),
                type: 'DOCUMENT_UPLOADED',
                documentData: document
            });

            res.status(200).json({
                success: true,
                data: permit
            });
        } catch (error) {
            logger.error('Failed to upload document:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload document'
            });
        }
    }
} 