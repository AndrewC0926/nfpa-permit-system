const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const authController = require('../controllers/auth.controller');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        // Accept images, PDFs, and common document formats
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images, PDFs, and common document formats are allowed.'));
        }
    }
});

// Apply authentication middleware to all routes
router.use(authController.verifyToken);

// Upload document
router.post('/upload',
    authController.checkRole(['CONTRACTOR', 'ADMIN']),
    upload.single('document'),
    documentController.uploadDocument
);

// Get document by ID
router.get('/:id',
    authController.checkRole(['ADMIN', 'CITY', 'CONTRACTOR']),
    documentController.getDocument
);

// Get documents by permit ID
router.get('/permit/:permitId',
    authController.checkRole(['ADMIN', 'CITY', 'CONTRACTOR']),
    documentController.getDocumentsByPermit
);

// Delete document
router.delete('/:id',
    authController.checkRole(['ADMIN', 'CITY']),
    documentController.deleteDocument
);

// Verify document integrity
router.get('/:id/verify',
    authController.checkRole(['ADMIN', 'CITY']),
    documentController.verifyDocument
);

module.exports = router; 