const express = require('express');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static('public'));

// API endpoint to run the POC demo
app.get('/api/run-demo', (req, res) => {
    console.log('🚀 Running NFPA POC Demo via API...');
    
    exec('node nfpa-poc-demo.js', (error, stdout, stderr) => {
        if (error) {
            console.error('Demo execution error:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message,
                output: stderr 
            });
            return;
        }
        
        console.log('✅ Demo completed successfully');
        res.json({ 
            success: true, 
            output: stdout 
        });
    });
});

// API endpoint to get system status
app.get('/api/status', (req, res) => {
    res.json({
        system: 'NFPA Permit Management System',
        version: '2.0.0',
        status: 'operational',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        features: {
            blockchain: 'connected',
            ai_engine: 'active',
            nfpa_database: '44 requirements loaded',
            multi_jurisdiction: 'enabled'
        },
        metrics: {
            active_permits: Math.floor(Math.random() * 3) + 5,
            compliance_avg: 87.3,
            processing_time: 12.3,
            revenue_q1: 2847500
        }
    });
});

// API endpoint to get permit data
app.get('/api/permits', (req, res) => {
    const permits = [
        {
            id: 'DEMO_001',
            name: 'Downtown Office Complex Fire Safety Upgrade',
            applicant: 'Metro Fire Protection Systems Inc.',
            nfpa_codes: ['NFPA 1', 'NFPA 13', 'NFPA 72', 'NFPA 80', 'NFPA 90A', 'NFPA 92', 'NFPA 101'],
            compliance: 76.8,
            status: 'CONDITIONAL',
            cost: 1250000,
            processing_days: 12
        },
        {
            id: 'DEMO_002',
            name: 'Chemical Processing Facility Fire Suppression',
            applicant: 'Advanced Chemical Solutions LLC',
            nfpa_codes: ['NFPA 1', 'NFPA 11', 'NFPA 12', 'NFPA 15', 'NFPA 17', 'NFPA 30', 'NFPA 70'],
            compliance: 94.2,
            status: 'APPROVED',
            cost: 2100000,
            processing_days: 18
        },
        {
            id: 'DEMO_003',
            name: 'Hospital Emergency Power & Life Safety Systems',
            applicant: 'Healthcare Systems Engineering Corp',
            nfpa_codes: ['NFPA 1', 'NFPA 72', 'NFPA 99', 'NFPA 101', 'NFPA 110', 'NFPA 111'],
            compliance: 68.5,
            status: 'UNDER_REVIEW',
            cost: 3200000,
            processing_days: 15
        },
        {
            id: 'DEMO_004',
            name: 'Shopping Mall Food Court Fire Protection Upgrade',
            applicant: 'Retail Fire Safety Solutions',
            nfpa_codes: ['NFPA 1', 'NFPA 13', 'NFPA 17A', 'NFPA 72', 'NFPA 90A', 'NFPA 96', 'NFPA 101'],
            compliance: 82.1,
            status: 'APPROVED',
            cost: 875000,
            processing_days: 8
        },
        {
            id: 'DEMO_005',
            name: 'Data Center Critical Infrastructure Protection',
            applicant: 'TechSafe Critical Systems Inc.',
            nfpa_codes: ['NFPA 1', 'NFPA 70', 'NFPA 72', 'NFPA 75', 'NFPA 76', 'NFPA 110', 'NFPA 2001'],
            compliance: 91.7,
            status: 'APPROVED',
            cost: 1650000,
            processing_days: 14
        },
        {
            id: 'DEMO_006',
            name: 'Airport Terminal Fire & Life Safety Modernization',
            applicant: 'Aviation Safety Systems International',
            nfpa_codes: ['NFPA 1', 'NFPA 13', 'NFPA 72', 'NFPA 92', 'NFPA 101', 'NFPA 130', 'NFPA 409'],
            compliance: 73.4,
            status: 'CONDITIONAL',
            cost: 4500000,
            processing_days: 22
        }
    ];
    
    res.json({ success: true, data: permits });
});

// API endpoint to get NFPA analysis
app.get('/api/analysis/nfpa', (req, res) => {
    const analysis = {
        overall_compliance: 87.3,
        codes: {
            'NFPA 1': { compliance: 42, projects: 6, issues: 15 },
            'NFPA 13': { compliance: 91, projects: 4, issues: 3 },
            'NFPA 72': { compliance: 89, projects: 5, issues: 7 },
            'NFPA 101': { compliance: 85, projects: 6, issues: 8 },
            'NFPA 30': { compliance: 95, projects: 2, issues: 1 },
            'NFPA 110': { compliance: 92, projects: 3, issues: 2 },
            'NFPA 96': { compliance: 88, projects: 1, issues: 2 },
            'NFPA 80': { compliance: 94, projects: 2, issues: 1 }
        },
        trends: {
            most_common_gap: 'NFPA 101 egress requirements',
            improvement_areas: ['NFPA 1 fire code compliance', 'Emergency lighting coverage'],
            success_stories: ['NFPA 30 hazmat storage', 'NFPA 110 emergency power']
        }
    };
    
    res.json({ success: true, data: analysis });
});

// API endpoint to get blockchain status
app.get('/api/blockchain', (req, res) => {
    const blockchain = {
        network_status: 'healthy',
        connected_peers: 4,
        block_height: Math.floor(Date.now() / 1000) % 10000 + 1000,
        last_block_time: new Date(Date.now() - Math.random() * 300000).toISOString(),
        recent_transactions: [
            {
                id: `PERMIT_${Date.now() - 300000}`,
                type: 'permit_creation',
                status: 'confirmed',
                timestamp: new Date(Date.now() - 300000).toISOString()
            },
            {
                id: `INSPECTION_${Date.now() - 720000}`,
                type: 'inspection_record',
                status: 'confirmed',
                timestamp: new Date(Date.now() - 720000).toISOString()
            },
            {
                id: `APPROVAL_${Date.now() - 1080000}`,
                type: 'permit_approval',
                status: 'confirmed',
                timestamp: new Date(Date.now() - 1080000).toISOString()
            }
        ],
        endorsements: {
            'City Fire Department': 'approved',
            'State Fire Marshal': 'approved',
            'Building Department': 'approved',
            'Environmental Agency': 'approved'
        }
    };
    
    res.json({ success: true, data: blockchain });
});

// API endpoint to get AI insights
app.get('/api/ai-insights', (req, res) => {
    const insights = {
        predictions: [
            '94% probability of approval for DEMO_001 with minor revisions',
            'DEMO_002 requires specialized hazmat inspector (recommended: INS_002)',
            'Weather impact: Construction delays likely for Q4 projects'
        ],
        optimizations: [
            'Cost Optimization: Integrated fire alarm/security systems could save 15%',
            'Process Improvement: Pre-submission consultations reduce revisions by 40%',
            'Resource Allocation: Focus inspectors on NFPA 101 compliance gaps'
        ],
        performance: {
            processing_time: { value: '12.3 days', trend: '↓ 30%' },
            inspector_efficiency: { value: '89%', trend: '↑ 5%' },
            customer_satisfaction: { value: '4.7/5.0', trend: '↑ 0.3' }
        },
        recent_activities: [
            {
                time: 'Just now',
                type: 'warning',
                message: 'High number of critical issues detected in DEMO_001 - recommend pre-submission consultation'
            },
            {
                time: '2 mins ago',
                type: 'info', 
                message: 'DEMO_002: Consider phased implementation to spread costs over multiple fiscal years'
            },
            {
                time: '5 mins ago',
                type: 'success',
                message: 'Processing time improved by 15% this quarter compared to last quarter'
            }
        ]
    };
    
    res.json({ success: true, data: insights });
});

// Default route serves the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <h1>404 - Page Not Found</h1>
        <p>The requested page was not found.</p>
        <a href="/">Return to NFPA Dashboard</a>
    `);
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log('🏛️ ==========================================');
    console.log('🏛️  NFPA PERMIT SYSTEM - DASHBOARD SERVER');
    console.log('🏛️  Government Edition v2.0');
    console.log('🏛️ ==========================================');
    console.log(`🚀 Dashboard: http://localhost:${PORT}`);
    console.log(`📊 API Status: http://localhost:${PORT}/api/status`);
    console.log(`🔧 Run Demo: http://localhost:${PORT}/api/run-demo`);
    console.log('✅ Ready for government demonstration');
    console.log('🏛️ ==========================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down NFPA Dashboard Server...');
    process.exit(0);
});

module.exports = app;
