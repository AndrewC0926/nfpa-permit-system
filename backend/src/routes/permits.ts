import { Router, Request, Response } from 'express';
import { PermitController } from '../controllers/permitController';
import { AuthMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';
import { PermitStatus, PermitType } from '../models/ERRCSPermit';
import asyncHandler from 'express-async-handler';

const router = Router();
const permitController = PermitController.getInstance();

// Initialize permit system
router.post(
    '/init-permit-system',
    AuthMiddleware.verifyToken,
    AuthMiddleware.hasPermission('admin'),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        await permitController.initPermitSystem(req, res);
    })
);

// Get permit types
router.get(
    '/permit-types',
    AuthMiddleware.verifyToken,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        await permitController.getPermitTypes(req, res);
    })
);

// Create permit
router.post(
    '/permits',
    AuthMiddleware.verifyToken,
    AuthMiddleware.hasPermission('permits:create'),
    [
        body('type').isIn(Object.values(PermitType)).withMessage('Invalid permit type'),
        body('projectDetails.name').notEmpty().withMessage('Project name is required'),
        body('projectDetails.description').notEmpty().withMessage('Project description is required'),
        body('projectDetails.location.address').notEmpty().withMessage('Address is required'),
        body('projectDetails.location.city').notEmpty().withMessage('City is required'),
        body('projectDetails.location.state').notEmpty().withMessage('State is required'),
        body('projectDetails.location.zipCode').notEmpty().withMessage('ZIP code is required'),
        body('projectDetails.buildingType').notEmpty().withMessage('Building type is required'),
        body('projectDetails.occupancyType').notEmpty().withMessage('Occupancy type is required'),
        body('projectDetails.floorArea').isNumeric().withMessage('Floor area must be a number'),
        body('projectDetails.constructionType').notEmpty().withMessage('Construction type is required')
    ],
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        await permitController.createPermit(req, res);
    })
);

// Get all permits
router.get(
    '/permits',
    AuthMiddleware.verifyToken,
    AuthMiddleware.hasPermission('permits:read'),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        await permitController.getAllPermits(req, res);
    })
);

// Get permit by ID
router.get(
    '/permits/:id',
    AuthMiddleware.verifyToken,
    AuthMiddleware.hasPermission('permits:read'),
    [
        param('id').isMongoId().withMessage('Invalid permit ID')
    ],
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        await permitController.getPermitById(req, res);
    })
);

// Update permit status
router.patch(
    '/permits/:id/status',
    AuthMiddleware.verifyToken,
    AuthMiddleware.hasPermission('permits:update'),
    [
        param('id').isMongoId().withMessage('Invalid permit ID'),
        body('status').isIn(Object.values(PermitStatus)).withMessage('Invalid permit status')
    ],
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        await permitController.updatePermitStatus(req, res);
    })
);

// Add inspection
router.post(
    '/permits/:id/inspections',
    AuthMiddleware.verifyToken,
    AuthMiddleware.hasPermission('permits:update'),
    [
        param('id').isMongoId().withMessage('Invalid permit ID'),
        body('scheduledDate').isISO8601().withMessage('Invalid scheduled date'),
        body('inspector').isMongoId().withMessage('Invalid inspector ID'),
        body('status').isIn(['SCHEDULED', 'COMPLETED', 'FAILED', 'CANCELLED']).withMessage('Invalid inspection status')
    ],
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        await permitController.addInspection(req, res);
    })
);

// Get permit history
router.get(
    '/permits/:id/history',
    AuthMiddleware.verifyToken,
    AuthMiddleware.hasPermission('permits:read'),
    [
        param('id').isMongoId().withMessage('Invalid permit ID')
    ],
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        await permitController.getPermitHistory(req, res);
    })
);

// Get dashboard stats
router.get(
    '/dashboard/stats',
    AuthMiddleware.verifyToken,
    AuthMiddleware.hasPermission('dashboard:read'),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        await permitController.getDashboardStats(req, res);
    })
);

// Update payment
router.patch(
    '/permits/:id/payment',
    AuthMiddleware.verifyToken,
    AuthMiddleware.hasPermission('permits:update'),
    [
        param('id').isMongoId().withMessage('Invalid permit ID'),
        body('transactionId').notEmpty().withMessage('Transaction ID is required')
    ],
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        await permitController.updatePayment(req, res);
    })
);

// Upload document
router.post(
    '/permits/:id/documents',
    AuthMiddleware.verifyToken,
    AuthMiddleware.hasPermission('permits:update'),
    [
        param('id').isMongoId().withMessage('Invalid permit ID'),
        body('name').notEmpty().withMessage('Document name is required'),
        body('fileUrl').notEmpty().withMessage('File URL is required'),
        body('fileType').notEmpty().withMessage('File type is required'),
        body('uploadedBy').isMongoId().withMessage('Invalid uploader ID')
    ],
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        await permitController.uploadDocument(req, res);
    })
);

export default router; 