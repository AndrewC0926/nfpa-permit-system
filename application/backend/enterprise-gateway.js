// Enterprise Integration Gateway for NFPA Permit System
// Connects with existing city/state systems

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

class EnterpriseGateway {
    constructor() {
        this.app = express();
        this.integrations = new Map();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(express.json());
        
        // Auth middleware
        this.app.use('/api/auth', (req, res, next) => {
            // Simple auth middleware
            req.user = { id: 'admin', role: 'admin' };
            next();
        });
        
        // Audit middleware  
        this.app.use('/api/audit', (req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Basic health check for enterprise gateway
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                service: 'Enterprise Integration Gateway',
                integrations: Array.from(this.integrations.keys()),
                timestamp: new Date().toISOString()
            });
        });

        // List available integrations
        this.app.get('/integrations', (req, res) => {
            res.json({
                available: Array.from(this.integrations.keys()),
                total: this.integrations.size
            });
        });
    }

    // Integration with existing city systems
    async connectToMunicipusSystem(cityConfig) {
        const integration = {
            name: 'Municipus',
            endpoint: cityConfig.endpoint,
            apiKey: cityConfig.apiKey,
            features: ['property_lookup', 'billing_integration', 'citizen_portal']
        };

        this.integrations.set('municipus', integration);
        
        // Proxy permits to existing citizen portal
        this.app.use('/integration/municipus',
            createProxyMiddleware({
                target: cityConfig.endpoint,
                changeOrigin: true,
                pathRewrite: { '^/integration/municipus': '' },
                onProxyReq: (proxyReq, req, res) => {
                    proxyReq.setHeader('X-API-Key', cityConfig.apiKey);
                    proxyReq.setHeader('X-NFPA-Source', 'blockchain-permits');
                }
            })
        );
    }

    // Integration with Tyler Technologies (common in government)
    async connectToTylerTech(config) {
        const integration = {
            name: 'Tyler Technologies',
            endpoint: config.endpoint,
            credentials: config.credentials,
            modules: ['EnerGov', 'iasWorld', 'CUBS']
        };

        this.integrations.set('tyler', integration);

        // EnerGov permit sync
        this.app.post('/integration/tyler/energov/permits', async (req, res) => {
            try {
                const permitData = req.body;
                
                // Transform NFPA permit to EnerGov format
                const energovPermit = this.transformToEnerGov(permitData);
                
                // Send to Tyler system (mock for now)
                const response = { permitId: 'TY_' + Date.now() };
                
                // Update blockchain with external reference (mock)
                console.log('Syncing permit to Tyler:', permitData.id);

                res.json({ success: true, externalId: response.permitId });
            } catch (error) {
                console.error('Tyler integration error:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    // Integration with Accela (another major government software)
    async connectToAccela(config) {
        this.integrations.set('accela', {
            name: 'Accela Civic Platform',
            endpoint: config.endpoint
        });

        this.app.use('/integration/accela', (req, res) => {
            // Accela Civic Platform integration (mock)
            res.json({
                success: true,
                message: 'Accela integration ready',
                data: req.body
            });
        });
    }

    // GIS Integration (ArcGIS, QGIS)
    async setupGISIntegration(gisConfig) {
        this.integrations.set('gis', {
            name: 'GIS Integration',
            provider: gisConfig.provider || 'ArcGIS'
        });

        this.app.get('/integration/gis/properties/:address', async (req, res) => {
            try {
                const { address } = req.params;
                
                // Mock GIS data for demo
                const propertyData = {
                    address: address,
                    parcelId: 'P' + Math.random().toString(36).substr(2, 9),
                    zoning: 'Commercial',
                    occupancyType: 'Business',
                    squareFootage: 5000,
                    riskFactors: ['high_occupancy', 'flammable_materials'],
                    nearbyHydrants: 3,
                    accessRoutes: ['Main St', 'Oak Ave']
                };
                
                res.json(propertyData);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    // Financial System Integration (QuickBooks, SAP, Oracle)
    async setupFinancialIntegration(financeConfig) {
        this.integrations.set('finance', {
            name: 'Financial Integration',
            system: financeConfig.system || 'QuickBooks'
        });

        this.app.post('/integration/finance/payments', async (req, res) => {
            const { permitId, amount, paymentMethod } = req.body;
            
            try {
                // Mock payment processing
                const payment = {
                    id: 'PAY_' + Date.now(),
                    permitId: permitId,
                    amount: amount,
                    status: 'completed',
                    transactionDate: new Date().toISOString()
                };

                console.log('Payment processed:', payment);

                res.json({ success: true, transactionId: payment.id });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    // Emergency Services Integration (911 dispatch systems)
    async setupEmergencyIntegration(emergencyConfig) {
        this.integrations.set('emergency', {
            name: '911 Emergency Integration',
            system: emergencyConfig.system || 'CAD'
        });

        this.app.get('/integration/emergency/permits/:address', async (req, res) => {
            // Mock emergency data
            const permits = [
                {
                    id: 'PERMIT_123',
                    type: 'Fire Alarm System',
                    status: 'Active',
                    hazardLevel: 'Medium'
                }
            ];
            
            res.json({
                activePermits: permits,
                fireHazards: ['Electrical systems under construction'],
                accessNotes: 'Use rear entrance during construction',
                contactInfo: {
                    contractor: '555-0123',
                    fireContact: '555-0456'
                }
            });
        });
    }

    // State Reporting Integration
    async setupStateReporting(stateConfig) {
        this.integrations.set('state_reporting', {
            name: 'State Reporting',
            state: stateConfig.state || 'Illinois'
        });

        this.app.get('/integration/state/reports/:reportType', async (req, res) => {
            const { reportType } = req.params;
            const { startDate, endDate } = req.query;

            // Mock state report
            const report = {
                reportType: reportType,
                period: { startDate, endDate },
                summary: {
                    totalPermits: 156,
                    approvedPermits: 142,
                    rejectedPermits: 14,
                    revenue: 23400,
                    averageProcessingDays: 3.2
                },
                generatedAt: new Date().toISOString()
            };

            res.json(report);
        });
    }

    // Multi-Tenant Architecture
    setupMultiTenant() {
        this.app.use('/tenant/:tenantId/*', (req, res, next) => {
            req.tenant = {
                id: req.params.tenantId,
                name: `City of ${req.params.tenantId}`,
                config: {}
            };
            next();
        });
    }

    // Real-time Dashboard for City Officials
    setupExecutiveDashboard() {
        this.app.get('/dashboard/executive/:cityId', async (req, res) => {
            // Mock city stats
            const cityStats = {
                total: 450,
                revenue: 67500,
                avgProcessing: 2.8,
                compliance: 94.2,
                backlog: 12,
                risk: 'Low'
            };
            
            res.json({
                totalPermits: cityStats.total,
                revenue: cityStats.revenue,
                averageProcessingTime: cityStats.avgProcessing,
                complianceRate: cityStats.compliance,
                inspectionBacklog: cityStats.backlog,
                riskAssessment: cityStats.risk
            });
        });
    }

    // Helper methods (mock implementations)
    transformToEnerGov(permitData) {
        return {
            permitNumber: permitData.id,
            projectName: permitData.projectDetails?.description || 'NFPA Permit',
            applicant: permitData.applicantInfo?.name || 'Unknown'
        };
    }

    start(port = 4000) {
        // Setup all integrations
        this.setupMultiTenant();
        this.setupGISIntegration({ provider: 'ArcGIS' });
        this.setupFinancialIntegration({ system: 'QuickBooks' });
        this.setupEmergencyIntegration({ system: 'CAD' });
        this.setupStateReporting({ state: 'Illinois' });
        this.setupExecutiveDashboard();

        this.app.listen(port, () => {
            console.log(`🏛️ Enterprise Gateway running on port ${port}`);
            console.log(`🔗 Ready for city/state integrations`);
            console.log(`📊 Health check: http://localhost:${port}/health`);
            console.log(`🏢 Integrations: ${this.integrations.size} systems connected`);
        });
    }
}

// Export the class
module.exports = EnterpriseGateway;
