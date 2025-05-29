#!/usr/bin/env node

const axios = require('axios');

async function demoEnterpriseFeatures() {
    console.log('🏛️ Testing Enterprise Integration Gateway...\n');
    
    const baseURL = 'http://localhost:4000';
    
    try {
        // Test 1: City Property Lookup
        console.log('📍 Testing GIS Property Lookup...');
        const gisResponse = await axios.get(`${baseURL}/integration/gis/properties/123 Main St`);
        console.log('✅ Property data retrieved');
        
        // Test 2: Financial Integration
        console.log('💰 Testing Payment Processing...');
        const paymentResponse = await axios.post(`${baseURL}/integration/finance/payments`, {
            permitId: 'PERMIT_123',
            amount: 150.00,
            paymentMethod: 'credit_card'
        });
        console.log('✅ Payment processed');
        
        // Test 3: State Reporting
        console.log('📊 Testing State Reporting...');
        const reportResponse = await axios.get(`${baseURL}/integration/state/reports/monthly?startDate=2025-01-01&endDate=2025-01-31`);
        console.log('✅ State report generated');
        
        console.log('\n🎉 All enterprise integrations working!');
        
    } catch (error) {
        console.error('❌ Enterprise test failed:', error.message);
    }
}

demoEnterpriseFeatures();
