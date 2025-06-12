import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { 
    Permit, PermitStatus, PermitType, Applicant, Property, 
    NFPAData, Documents, Reviewers, Fees, RedlineHistory, 
    ReviewerInfo, PaymentInfo, UpdaterInfo, StatusChange, AIReview 
} from './types';

@Info({ title: 'NFPAPermitContract', description: 'Smart contract for managing NFPA permits' })
export class NFPAPermitContract extends Contract {
    
    constructor() {
        super('NFPAPermitContract');
    }

    public async InitLedger(ctx: Context): Promise<void> {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    @Transaction()
    public async CreatePermit(
        ctx: Context,
        permitId: string,
        applicationId: string,
        permitType: string,
        applicant: string,
        property: string,
        nfpaData: string,
        documents: string
    ): Promise<void> {
        const exists = await this.PermitExists(ctx, permitId);
        if (exists) {
            throw new Error(`Permit ${permitId} already exists`);
        }

        const permit: Permit = {
            permitId,
            applicationId,
            permitType: permitType as PermitType,
            status: PermitStatus.DRAFT,
            applicant: JSON.parse(applicant),
            property: JSON.parse(property),
            nfpaData: JSON.parse(nfpaData),
            documents: JSON.parse(documents),
            reviewers: {
                fire: { 
                    status: 'Pending', 
                    reviewer: '', 
                    comments: '', 
                    timestamp: new Date().toISOString(),
                    priority: 'Medium'
                },
                building: { 
                    status: 'Pending', 
                    reviewer: '', 
                    comments: '', 
                    timestamp: new Date().toISOString(),
                    priority: 'Medium'
                },
                electrical: { 
                    status: 'Pending', 
                    reviewer: '', 
                    comments: '', 
                    timestamp: new Date().toISOString(),
                    priority: 'Medium'
                }
            },
            fees: {
                baseAmount: 0,
                additionalFees: [],
                totalAmount: 0,
                paid: false
            },
            submittedDate: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            expirationDate: this.calculateExpirationDate(),
            version: 1,
            isRedlined: false,
            redlineHistory: [],
            statusHistory: [{
                fromStatus: PermitStatus.DRAFT,
                toStatus: PermitStatus.DRAFT,
                timestamp: new Date().toISOString(),
                updatedBy: 'SYSTEM',
                reason: 'Initial permit creation',
                comments: 'Permit created in draft status',
                docHash: this.calculateDocHash(permitId)
            }],
            docType: 'permit'
        };

        await ctx.stub.putState(permitId, Buffer.from(JSON.stringify(permit)));
        await ctx.stub.setEvent('CreatePermit', Buffer.from(JSON.stringify({
            permitId,
            status: permit.status,
            timestamp: new Date().toISOString()
        })));
    }

    @Transaction(false)
    @Returns('boolean')
    public async PermitExists(ctx: Context, permitId: string): Promise<boolean> {
        const buffer = await ctx.stub.getState(permitId);
        return (!!buffer && buffer.length > 0);
    }

    @Transaction(false)
    @Returns('Permit')
    public async ReadPermit(ctx: Context, permitId: string): Promise<Permit> {
        const exists = await this.PermitExists(ctx, permitId);
        if (!exists) {
            throw new Error(`Permit ${permitId} does not exist`);
        }
        const buffer = await ctx.stub.getState(permitId);
        const permit = JSON.parse(buffer.toString()) as Permit;
        return permit;
    }

    @Transaction()
    public async UpdatePermitStatus(
        ctx: Context,
        permitId: string,
        newStatus: string,
        reviewerInfo: string
    ): Promise<void> {
        const permit = await this.ReadPermit(ctx, permitId);
        const reviewer = JSON.parse(reviewerInfo) as ReviewerInfo;

        if (!(newStatus in PermitStatus)) {
            throw new Error('Invalid status provided');
        }

        const oldStatus = permit.status;
        permit.status = newStatus as PermitStatus;
        permit.lastModified = new Date().toISOString();

        if (reviewer.department in permit.reviewers) {
            permit.reviewers[reviewer.department as keyof Reviewers] = {
                status: reviewer.status as any,
                reviewer: reviewer.name,
                comments: reviewer.comments,
                timestamp: new Date().toISOString(),
                priority: reviewer.priority as 'Low' | 'Medium' | 'High' | 'Critical',
                dueDate: reviewer.dueDate
            };
        }

        // Add status change to history
        permit.statusHistory.push({
            fromStatus: oldStatus,
            toStatus: permit.status,
            timestamp: new Date().toISOString(),
            updatedBy: reviewer.name,
            reason: reviewer.reason || 'Status update',
            comments: reviewer.comments,
            docHash: this.calculateDocHash(permitId)
        });

        await ctx.stub.putState(permitId, Buffer.from(JSON.stringify(permit)));
        await ctx.stub.setEvent('UpdatePermitStatus', Buffer.from(JSON.stringify({
            permitId,
            oldStatus,
            newStatus: permit.status,
            updatedBy: reviewer.name,
            timestamp: new Date().toISOString()
        })));
    }

    @Transaction()
    public async UpdateNFPAData(
        ctx: Context,
        permitId: string,
        newNFPAData: string,
        updaterInfo: string
    ): Promise<void> {
        const permit = await this.ReadPermit(ctx, permitId);
        const updater = JSON.parse(updaterInfo) as UpdaterInfo;
        const newData = JSON.parse(newNFPAData) as NFPAData;

        const changes = this.detectChanges(permit.nfpaData, newData);
        if (changes.length > 0) {
            permit.isRedlined = true;
            permit.redlineHistory.push({
                version: permit.version + 1,
                changes,
                timestamp: new Date().toISOString(),
                updatedBy: updater.name,
                reason: updater.reason || 'NFPA data update',
                approvedBy: updater.role === 'ADMIN' ? updater.name : undefined
            });
            permit.version++;
        }

        permit.nfpaData = newData;
        permit.lastModified = new Date().toISOString();

        await ctx.stub.putState(permitId, Buffer.from(JSON.stringify(permit)));
        await ctx.stub.setEvent('UpdateNFPAData', Buffer.from(JSON.stringify({
            permitId,
            version: permit.version,
            updatedBy: updater.name,
            timestamp: new Date().toISOString()
        })));
    }

    @Transaction()
    public async ProcessPayment(
        ctx: Context,
        permitId: string,
        paymentInfo: string
    ): Promise<void> {
        const permit = await this.ReadPermit(ctx, permitId);
        const payment = JSON.parse(paymentInfo) as PaymentInfo;

        if (permit.fees.paid) {
            throw new Error('Fees have already been paid');
        }

        permit.fees = {
            ...permit.fees,
            paid: true,
            paymentMethod: payment.method,
            transactionId: payment.transactionId,
            paidDate: new Date().toISOString()
        };

        permit.lastModified = new Date().toISOString();
        
        await ctx.stub.putState(permitId, Buffer.from(JSON.stringify(permit)));
        await ctx.stub.setEvent('ProcessPayment', Buffer.from(JSON.stringify({
            permitId,
            amount: payment.amount,
            transactionId: payment.transactionId,
            timestamp: new Date().toISOString()
        })));
    }

    @Transaction()
    public async PerformAIReview(
        ctx: Context,
        permitId: string
    ): Promise<void> {
        const permit = await this.ReadPermit(ctx, permitId);
        
        // Simulate AI review (in real implementation, this would call an AI service)
        const aiReview: AIReview = {
            score: Math.random() * 100,
            confidence: Math.random() * 100,
            findings: ['Sample finding 1', 'Sample finding 2'],
            recommendations: ['Sample recommendation 1', 'Sample recommendation 2'],
            timestamp: new Date().toISOString(),
            modelVersion: '1.0.0'
        };

        permit.aiReview = aiReview;
        permit.lastModified = new Date().toISOString();

        await ctx.stub.putState(permitId, Buffer.from(JSON.stringify(permit)));
        await ctx.stub.setEvent('PerformAIReview', Buffer.from(JSON.stringify({
            permitId,
            score: aiReview.score,
            timestamp: new Date().toISOString()
        })));
    }

    @Transaction(false)
    @Returns('Permit[]')
    public async QueryPermitsByStatus(ctx: Context, status: string): Promise<Permit[]> {
        const query = {
            selector: {
                docType: 'permit',
                status: status
            }
        };
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const results = [];
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            results.push(record);
            result = await iterator.next();
        }
        return results;
    }

    @Transaction(false)
    @Returns('string')
    public async GetPermitHistory(ctx: Context, permitId: string): Promise<string> {
        const iterator = await ctx.stub.getHistoryForKey(permitId);
        const results = [];
        let result = await iterator.next();
        while (!result.done) {
            const modification = {
                txId: result.value.txId,
                timestamp: new Date(result.value.timestamp.seconds.low * 1000).toISOString(),
                value: JSON.parse(result.value.value.toString()),
                isDelete: result.value.isDelete
            };
            results.push(modification);
            result = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(results);
    }

    private detectChanges(oldData: NFPAData, newData: NFPAData): any[] {
        const changes = [];
        for (const [key, value] of Object.entries(newData)) {
            if (oldData[key as keyof NFPAData] !== value) {
                changes.push({
                    field: key,
                    oldValue: oldData[key as keyof NFPAData],
                    newValue: value,
                    timestamp: new Date().toISOString(),
                    changeType: oldData[key as keyof NFPAData] === undefined ? 'Addition' : 'Modification',
                    priority: 'Medium',
                    impact: 'Requires review'
                });
            }
        }
        // Check for deletions
        for (const key of Object.keys(oldData)) {
            if (!(key in newData)) {
                changes.push({
                    field: key,
                    oldValue: oldData[key as keyof NFPAData],
                    newValue: undefined,
                    timestamp: new Date().toISOString(),
                    changeType: 'Deletion',
                    priority: 'High',
                    impact: 'Data removed'
                });
            }
        }
        return changes;
    }

    private calculateExpirationDate(): string {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1); // Permits expire after 1 year
        return date.toISOString();
    }

    private calculateDocHash(permitId: string): string {
        return `${permitId}-${new Date().getTime()}`; // In real implementation, use proper hashing
    }
} 