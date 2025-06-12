const { Contract } = require('fabric-contract-api');

class PermitContract extends Contract {
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    async createPermit(ctx, permitId, permitData) {
        console.info('============= START : Create Permit ===========');
        
        const permit = {
            docType: 'permit',
            id: permitId,
            ...JSON.parse(permitData),
            status: 'DRAFT',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await ctx.stub.putState(permitId, Buffer.from(JSON.stringify(permit)));
        console.info('============= END : Create Permit ===========');
        return JSON.stringify(permit);
    }

    async queryPermit(ctx, permitId) {
        const permitAsBytes = await ctx.stub.getState(permitId);
        if (!permitAsBytes || permitAsBytes.length === 0) {
            throw new Error(`Permit ${permitId} does not exist`);
        }
        return permitAsBytes.toString();
    }

    async updatePermitStatus(ctx, permitId, newStatus) {
        const permit = await this.queryPermit(ctx, permitId);
        const permitObj = JSON.parse(permit);
        
        permitObj.status = newStatus;
        permitObj.updatedAt = new Date().toISOString();
        
        await ctx.stub.putState(permitId, Buffer.from(JSON.stringify(permitObj)));
        return JSON.stringify(permitObj);
    }

    async queryPermitsByStatus(ctx, status) {
        const queryString = {
            selector: {
                docType: 'permit',
                status: status
            }
        };
        
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = await this._getAllResults(iterator);
        return JSON.stringify(results);
    }

    async _getAllResults(iterator) {
        const allResults = [];
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
            allResults.push(record);
            result = await iterator.next();
        }
        return allResults;
    }
} 