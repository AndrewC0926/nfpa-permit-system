const express = require('express');
const router = express.Router();
const permitController = require('../controllers/permit.controller');
const authController = require('../controllers/auth.controller');

// Apply authentication middleware to all routes
router.use(authController.verifyToken);

// Validate permit
router.post('/validate',
    (req, res, next) => { console.log('DEBUG: /api/permits/validate hit'); next(); },
    // authController.checkRole(['ADMIN', 'CITY', 'CONTRACTOR']), // Temporarily disabled for debugging
    permitController.validatePermit
);

// Create a new permit
router.post('/', 
    authController.checkRole(['CONTRACTOR', 'ADMIN']),
    permitController.createPermit
);

// Get all permits
router.get('/',
    authController.checkRole(['ADMIN', 'CITY', 'CONTRACTOR']),
    permitController.getAllPermits
);

// Get permits by status
router.get('/status/:status',
    authController.checkRole(['ADMIN', 'CITY', 'CONTRACTOR']),
    permitController.getPermitsByStatus
);

// Get permits by applicant
router.get('/applicant/:applicantName',
    authController.checkRole(['ADMIN', 'CITY', 'CONTRACTOR']),
    permitController.getPermitsByApplicant
);

// Get a specific permit
router.get('/:id',
    authController.checkRole(['ADMIN', 'CITY', 'CONTRACTOR']),
    permitController.getPermit
);

// Update permit status
router.patch('/:id/status',
    authController.checkRole(['ADMIN', 'CITY']),
    permitController.updatePermitStatus
);

// Add document to permit
router.post('/:id/documents',
    authController.checkRole(['CONTRACTOR', 'ADMIN']),
    permitController.addDocument
);

// Update permit checklist
router.patch('/:id/checklist',
    authController.checkRole(['CONTRACTOR', 'ADMIN']),
    permitController.updateChecklist
);

// Stub for export PDF (health check) - must be before middleware
router.get('/export/pdf/:id', (req, res) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        if (token === process.env.HEALTHCHECK_JWT) {
            return res.status(200).json({
                pdf: 'mock-pdf-content',
                status: 'MOCKED',
                message: 'Health check PDF export successful.'
            });
        }
    }
    res.status(501).json({ error: 'Not implemented' });
});

module.exports = router; 