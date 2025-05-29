// Simple in-memory database for development
class InMemoryDB {
    constructor() {
        this.permits = new Map();
        this.auditLog = [];
    }

    async createPermit(permitData) {
        this.permits.set(permitData.id, permitData);
        this.auditLog.push({
            action: 'CREATE',
            permitId: permitData.id,
            timestamp: new Date().toISOString()
        });
        return permitData;
    }

    async getPermit(permitId) {
        return this.permits.get(permitId) || null;
    }

    async getAllPermits() {
        return Array.from(this.permits.values());
    }

    async updatePermit(permitId, updates) {
        const existing = this.permits.get(permitId);
        if (!existing) {
            throw new Error('Permit not found');
        }
        
        const updated = { ...existing, ...updates };
        this.permits.set(permitId, updated);
        
        this.auditLog.push({
            action: 'UPDATE',
            permitId: permitId,
            timestamp: new Date().toISOString()
        });
        
        return updated;
    }

    async seedDemoData() {
        const demoPermits = [
            {
                id: 'PERMIT_DEMO_001',
                applicantInfo: {
                    name: 'ABC Fire Protection',
                    email: 'contact@abcfire.com',
                    phone: '555-0123'
                },
                projectDetails: {
                    type: 'NFPA72_COMMERCIAL',
                    address: '123 Main St, Springfield',
                    description: 'Fire alarm system installation'
                },
                status: 'APPROVED',
                createdAt: new Date().toISOString()
            },
            {
                id: 'PERMIT_DEMO_002',
                applicantInfo: {
                    name: 'XYZ Sprinkler Co',
                    email: 'info@xyzsprinkler.com',
                    phone: '555-0456'
                },
                projectDetails: {
                    type: 'NFPA13_SPRINKLER',
                    address: '456 Business Ave, Springfield',
                    description: 'Sprinkler system upgrade'
                },
                status: 'UNDER_REVIEW',
                createdAt: new Date().toISOString()
            }
        ];

        for (const permit of demoPermits) {
            await this.createPermit(permit);
        }

        console.log('✅ Demo data seeded - 2 sample permits created');
    }
}

module.exports = InMemoryDB;
