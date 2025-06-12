import { Context, Contract } from 'fabric-contract-api';
import { NFPAPermitContract } from './permitContract';

export class PermitContract extends Contract {
    public async initLedger(ctx: Context) {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    public async createPermit(ctx: Context, permitId: string, permitType: string, applicantId: string, status: string) {
        console.info('============= START : Create Permit ===========');

        const permit = {
            permitId,
            permitType,
            applicantId,
            status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await ctx.stub.putState(permitId, Buffer.from(JSON.stringify(permit)));
        console.info('============= END : Create Permit ===========');
    }

    public async queryPermit(ctx: Context, permitId: string) {
        console.info('============= START : Query Permit ===========');
        const permitAsBytes = await ctx.stub.getState(permitId);
        if (!permitAsBytes || permitAsBytes.length === 0) {
            throw new Error(`Permit ${permitId} does not exist`);
        }
        console.info('============= END : Query Permit ===========');
        return permitAsBytes.toString();
    }

    public async updatePermitStatus(ctx: Context, permitId: string, newStatus: string) {
        console.info('============= START : Update Permit Status ===========');
        const permitAsBytes = await ctx.stub.getState(permitId);
        if (!permitAsBytes || permitAsBytes.length === 0) {
            throw new Error(`Permit ${permitId} does not exist`);
        }
        const permit = JSON.parse(permitAsBytes.toString());
        permit.status = newStatus;
        permit.updatedAt = new Date().toISOString();
        await ctx.stub.putState(permitId, Buffer.from(JSON.stringify(permit)));
        console.info('============= END : Update Permit Status ===========');
    }
}

export default PermitContract;

export { NFPAPermitContract } from './permitContract';

// Export the contract for Fabric
export const contracts: any[] = [NFPAPermitContract]; 