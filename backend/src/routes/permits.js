const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

/**
 * @swagger
 * /api/permits:
 *   post:
 *     summary: Create a new permit application
 *     tags: [Permits]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - applicantInfo
 *               - projectDetails
 *             properties:
 *               applicantInfo:
 *                 type: object
 *               projectDetails:
 *                 type: object
 *     responses:
 *       201:
 *         description: Permit created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', [
  body('applicantInfo.name').notEmpty().withMessage('Applicant name is required'),
  body('applicantInfo.email').isEmail().withMessage('Valid email is required'),
  body('projectDetails.type').isIn(['NFPA72_COMMERCIAL', 'NFPA72_RESIDENTIAL', 'NFPA13_SPRINKLER', 'NFPA25_INSPECTION']).withMessage('Invalid permit type'),
  body('projectDetails.address').notEmpty().withMessage('Project address is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { applicantInfo, projectDetails } = req.body;
  
  const permitId = 'PERMIT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const fees = {
    'NFPA72_COMMERCIAL': 150.00,
    'NFPA72_RESIDENTIAL': 75.00,
    'NFPA13_SPRINKLER': 200.00,
    'NFPA25_INSPECTION': 100.00
  };
  
  const permit = {
    id: permitId,
    applicantInfo,
    projectDetails,
    status: 'SUBMITTED',
    submissionDate: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    fee: fees[projectDetails.type] || 100.00,
    paymentStatus: 'PENDING',
    inspections: [],
    documents: [],
    comments: [],
    history: [{
      action: 'CREATED',
      timestamp: new Date().toISOString(),
      performedBy: 'system',
      details: 'Permit application created'
    }]
  };
  
  console.log(`📋 Created permit: ${permitId} for ${applicantInfo.name}`);
  
  res.status(201).json({
    success: true,
    data: permit,
    message: 'Permit application created successfully'
  });
});

/**
 * @swagger
 * /api/permits:
 *   get:
 *     summary: Get all permits
 *     tags: [Permits]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by permit status
 *     responses:
 *       200:
 *         description: List of permits
 */
router.get('/', (req, res) => {
  const { status } = req.query;
  
  // Sample permits for demo
  let permits = [
    {
      id: 'PERMIT_DEMO_001',
      applicantInfo: {
        name: 'ABC Fire Protection',
        email: 'contact@abcfire.com',
        phone: '555-0123'
      },
      projectDetails: {
        type: 'NFPA72_COMMERCIAL',
        address: '123 Business Plaza, Suite 100',
        description: 'Commercial fire alarm system installation'
      },
      status: 'APPROVED',
      submissionDate: '2025-06-01T10:00:00Z',
      fee: 150.00,
      paymentStatus: 'PAID'
    },
    {
      id: 'PERMIT_DEMO_002',
      applicantInfo: {
        name: 'XYZ Sprinkler Systems',
        email: 'info@xyzsprinkler.com',
        phone: '555-0456'
      },
      projectDetails: {
        type: 'NFPA13_SPRINKLER',
        address: '789 Industrial Ave',
        description: 'New sprinkler system installation'
      },
      status: 'UNDER_REVIEW',
      submissionDate: '2025-06-08T14:30:00Z',
      fee: 200.00,
      paymentStatus: 'PENDING'
    }
  ];
  
  if (status) {
    permits = permits.filter(permit => permit.status === status);
  }
  
  res.json({
    success: true,
    data: permits,
    count: permits.length,
    filters: { status: status || 'all' }
  });
});

/**
 * @swagger
 * /api/permits/{id}:
 *   get:
 *     summary: Get permit by ID
 *     tags: [Permits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permit details
 *       404:
 *         description: Permit not found
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  // Demo permit
  const permit = {
    id: id,
    applicantInfo: {
      name: 'Demo Applicant',
      email: 'demo@example.com'
    },
    projectDetails: {
      type: 'NFPA72_COMMERCIAL',
      address: 'Demo Address'
    },
    status: 'SUBMITTED',
    submissionDate: new Date().toISOString(),
    fee: 150.00,
    paymentStatus: 'PENDING'
  };
  
  res.json({
    success: true,
    data: permit
  });
});

module.exports = router;
