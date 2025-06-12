const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'NFPA Permit System API',
            version: '1.0.0',
            description: 'API documentation for the NFPA Permit System',
            contact: {
                name: 'API Support',
                email: 'support@nfpa-permit.com'
            }
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:3000',
                description: 'API Server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                Permit: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        applicantName: { type: 'string' },
                        projectAddress: { type: 'string' },
                        permitType: { 
                            type: 'string',
                            enum: ['ERRCS', 'FIRE_ALARM', 'SPRINKLER', 'OTHER']
                        },
                        status: {
                            type: 'string',
                            enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']
                        },
                        submissionDate: { type: 'string', format: 'date-time' },
                        approvalDate: { type: 'string', format: 'date-time' },
                        documents: { 
                            type: 'array',
                            items: { type: 'string' }
                        },
                        checklist: {
                            type: 'object',
                            properties: {
                                cutSheetsSubmitted: { type: 'boolean' },
                                bdaPhotosSubmitted: { type: 'boolean' },
                                rfSurveySubmitted: { type: 'boolean' },
                                redlinesSubmitted: { type: 'boolean' },
                                allRequirementsMet: { type: 'boolean' }
                            }
                        }
                    }
                },
                Document: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        permitId: { type: 'string' },
                        documentType: {
                            type: 'string',
                            enum: ['CUT_SHEET', 'BDA_PHOTO', 'RF_SURVEY', 'REDLINE', 'OTHER']
                        },
                        fileName: { type: 'string' },
                        fileHash: { type: 'string' },
                        mimeType: { type: 'string' },
                        size: { type: 'number' },
                        uploadedBy: { type: 'string' },
                        uploadedAt: { type: 'string', format: 'date-time' },
                        status: {
                            type: 'string',
                            enum: ['PENDING', 'VERIFIED', 'REJECTED']
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        email: { type: 'string' },
                        role: {
                            type: 'string',
                            enum: ['ADMIN', 'CITY', 'CONTRACTOR']
                        },
                        organization: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    },
    apis: ['./src/routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs; 