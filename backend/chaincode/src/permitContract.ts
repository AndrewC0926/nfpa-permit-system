import { Context, Contract } from 'fabric-contract-api';
import { Permit, PermitStatus, Document, AIReview } from '../../src/types/permit';

export class PermitContract extends Contract {
    constructor() {
        super('PermitContract');
    }

    // Initialize the chaincode
    async initLedger(ctx: Context): Promise<void> {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    // Create a new permit
    async createPermit(ctx: Context, permitData: string): Promise<string> {
        console.info('============= START : Create Permit ===========');
        
        const permit: Permit = JSON.parse(permitData);
        
        // Basic validation
        if (!permit.id || !permit.type || !permit.property) {
            throw new Error('Invalid permit data');
        }

        // Check if permit already exists
        const exists = await this.permitExists(ctx, permit.id);
        if (exists) {
            throw new Error(`Permit ${permit.id} already exists`);
        }

        // Add timestamps
        permit.createdAt = new Date().toISOString();
        permit.updatedAt = permit.createdAt;

        // Store permit in state
        await ctx.stub.putState(permit.id, Buffer.from(JSON.stringify(permit)));

        // Emit event
        await ctx.stub.setEvent('PermitCreated', Buffer.from(JSON.stringify(permit)));

        console.info('============= END : Create Permit ===========');
        return ctx.stub.getTxID();
    }

    // Add document to permit
    async addDocument(ctx: Context, permitId: string, documentData: string): Promise<void> {
        console.info('============= START : Add Document ===========');

        // Get permit
        const permit = await this.getPermit(ctx, permitId);
        if (!permit) {
            throw new Error(`Permit ${permitId} does not exist`);
        }

        // Parse and validate document
        const document: Document = JSON.parse(documentData);
        if (!document.id || !document.hash) {
            throw new Error('Invalid document data');
        }

        // Add document to permit
        permit.documents = permit.documents || [];
        permit.documents.push(document);
        permit.updatedAt = new Date().toISOString();

        // Update state
        await ctx.stub.putState(permitId, Buffer.from(JSON.stringify(permit)));

        // Emit event
        await ctx.stub.setEvent('DocumentAdded', Buffer.from(JSON.stringify({ permitId, document })));

        console.info('============= END : Add Document ===========');
    }

    // Record AI review results
    async recordAIReview(ctx: Context, permitId: string, reviewData: string): Promise<void> {
        console.info('============= START : Record AI Review ===========');

        // Get permit
        const permit = await this.getPermit(ctx, permitId);
        if (!permit) {
            throw new Error(`Permit ${permitId} does not exist`);
        }

        // Parse and validate review
        const review: AIReview = JSON.parse(reviewData);
        if (!review.status || !review.findings) {
            throw new Error('Invalid AI review data');
        }

        // Update permit with review
        permit.aiReview = review;
        permit.updatedAt = new Date().toISOString();
        permit.reviewedAt = new Date().toISOString();

        // Update state
        await ctx.stub.putState(permitId, Buffer.from(JSON.stringify(permit)));

        // Emit event
        await ctx.stub.setEvent('AIReviewRecorded', Buffer.from(JSON.stringify({ permitId, review })));

        console.info('============= END : Record AI Review ===========');
    }

    // Update permit status
    async updatePermitStatus(ctx: Context, permitId: string, status: PermitStatus): Promise<void> {
        console.info('============= START : Update Permit Status ===========');

        // Get permit
        const permit = await this.getPermit(ctx, permitId);
        if (!permit) {
            throw new Error(`Permit ${permitId} does not exist`);
        }

        // Update status
        permit.status = status;
        permit.updatedAt = new Date().toISOString();

        if (status === PermitStatus.UNDER_REVIEW) {
            permit.submittedAt = new Date().toISOString();
        }

        // Update state
        await ctx.stub.putState(permitId, Buffer.from(JSON.stringify(permit)));

        // Emit event
        await ctx.stub.setEvent('StatusUpdated', Buffer.from(JSON.stringify({ permitId, status })));

        console.info('============= END : Update Permit Status ===========');
    }

    // Get permit by ID
    async getPermit(ctx: Context, permitId: string): Promise<Permit | null> {
        const permitBytes = await ctx.stub.getState(permitId);
        if (!permitBytes || permitBytes.length === 0) {
            return null;
        }
        return JSON.parse(permitBytes.toString());
    }

    // Check if permit exists
    async permitExists(ctx: Context, permitId: string): Promise<boolean> {
        const permitBytes = await ctx.stub.getState(permitId);
        return permitBytes && permitBytes.length > 0;
    }

    // Get permit history
    async getPermitHistory(ctx: Context, permitId: string): Promise<any[]> {
        console.info('============= START : Get Permit History ===========');

        const iterator = await ctx.stub.getHistoryForKey(permitId);
        const history = [];

        while (true) {
            const result = await iterator.next();
            if (result.done) {
                break;
            }

            const record = {
                txId: result.value.txId,
                timestamp: new Date(result.value.timestamp.seconds.low * 1000).toISOString(),
                value: JSON.parse(result.value.value.toString()),
                isDelete: result.value.isDelete
            };
            history.push(record);
        }

        await iterator.close();
        console.info('============= END : Get Permit History ===========');
        return history;
    }

    // Query permits by criteria
    async queryPermits(ctx: Context, queryString: string): Promise<Permit[]> {
        console.info('============= START : Query Permits ===========');

        const iterator = await ctx.stub.getQueryResult(queryString);
        const permits = [];

        while (true) {
            const result = await iterator.next();
            if (result.done) {
                break;
            }
            permits.push(JSON.parse(result.value.value.toString()));
        }

        await iterator.close();
        console.info('============= END : Query Permits ===========');
        return permits;
    }
} 