const { ForbiddenError } = require('../utils/errors');

// Field access configuration by role
const fieldAccessConfig = {
    ADMIN: {
        permit: ['*'], // All fields
        document: ['*'],
        user: ['*']
    },
    CITY: {
        permit: [
            'id',
            'applicantName',
            'projectAddress',
            'permitType',
            'status',
            'submissionDate',
            'approvalDate',
            'documents',
            'checklist',
            'transactionHash',
            'createdBy',
            'updatedBy',
            'tenantId'
        ],
        document: [
            'id',
            'name',
            'type',
            'hash',
            'path',
            'status',
            'uploadedBy',
            'uploadDate',
            'aiAnalysis',
            'tenantId'
        ],
        user: [
            'id',
            'username',
            'email',
            'role',
            'organization',
            'firstName',
            'lastName',
            'isActive',
            'tenantId'
        ]
    },
    CONTRACTOR: {
        permit: [
            'id',
            'applicantName',
            'projectAddress',
            'permitType',
            'status',
            'submissionDate',
            'documents',
            'checklist',
            'createdBy',
            'tenantId'
        ],
        document: [
            'id',
            'name',
            'type',
            'status',
            'uploadDate',
            'tenantId'
        ],
        user: [
            'id',
            'username',
            'firstName',
            'lastName',
            'organization',
            'tenantId'
        ]
    }
};

// Middleware to filter fields based on user role
const fieldAccessMiddleware = (modelType) => {
    return (req, res, next) => {
        const userRole = req.user.role;
        const allowedFields = fieldAccessConfig[userRole]?.[modelType];

        if (!allowedFields) {
            throw new ForbiddenError(`No field access configuration for role ${userRole} and model ${modelType}`);
        }

        // Filter request body for POST/PUT requests
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
            const filteredBody = {};
            for (const field of allowedFields) {
                if (field === '*') {
                    Object.assign(filteredBody, req.body);
                    break;
                }
                if (req.body[field] !== undefined) {
                    filteredBody[field] = req.body[field];
                }
            }
            req.body = filteredBody;
        }

        // Add field filter to response
        const originalJson = res.json;
        res.json = function(data) {
            if (Array.isArray(data)) {
                data = data.map(item => filterFields(item, allowedFields));
            } else if (data && typeof data === 'object') {
                data = filterFields(data, allowedFields);
            }
            return originalJson.call(this, data);
        };

        next();
    };
};

// Helper function to filter fields from an object
const filterFields = (obj, allowedFields) => {
    if (!obj || typeof obj !== 'object') return obj;

    if (allowedFields.includes('*')) return obj;

    const filtered = {};
    for (const field of allowedFields) {
        if (obj[field] !== undefined) {
            filtered[field] = obj[field];
        }
    }
    return filtered;
};

module.exports = {
    fieldAccessMiddleware,
    fieldAccessConfig
}; 