const { Wallets, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');

class BlockchainService {
    constructor() {
        this.connectionProfile = JSON.parse(fs.readFileSync(
            path.resolve(__dirname, '../../connection-profile.json'),
            'utf8'
        ));
        this.walletPath = path.resolve(__dirname, '../../wallet');
    }

    async connectToNetwork(userId, org) {
        try {
            // Create a new file system based wallet for managing identities
            const wallet = await Wallets.newFileSystemWallet(this.walletPath);
            console.log(`Wallet path: ${this.walletPath}`);

            // Check to see if we've already enrolled the user
            const identity = await wallet.get(userId);
            if (!identity) {
                console.log(`An identity for the user ${userId} does not exist in the wallet`);
                throw new Error(`An identity for the user ${userId} does not exist in the wallet`);
            }

            // Create a new gateway for connecting to our peer node
            const gateway = new Gateway();
            await gateway.connect(this.connectionProfile, {
                wallet,
                identity: userId,
                discovery: { enabled: true, asLocalhost: true }
            });

            // Get the network (channel) our contract is deployed to
            const network = await gateway.getNetwork('permitchannel');

            // Get the contract from the network
            const contract = network.getContract('permitcontract');

            return { gateway, contract };
        } catch (error) {
            console.error(`Failed to connect to network: ${error}`);
            throw error;
        }
    }

    async createPermit(userId, org, permitData) {
        try {
            const { gateway, contract } = await this.connectToNetwork(userId, org);

            // Submit the transaction
            const result = await contract.submitTransaction(
                'CreatePermit',
                permitData.id,
                permitData.applicantName,
                permitData.projectAddress,
                permitData.permitType
            );

            // Disconnect from the gateway
            gateway.disconnect();

            return JSON.parse(result.toString());
        } catch (error) {
            console.error(`Failed to create permit: ${error}`);
            throw error;
        }
    }

    async getPermit(userId, org, permitId) {
        try {
            const { gateway, contract } = await this.connectToNetwork(userId, org);

            // Evaluate the transaction
            const result = await contract.evaluateTransaction('GetPermit', permitId);

            // Disconnect from the gateway
            gateway.disconnect();

            return JSON.parse(result.toString());
        } catch (error) {
            console.error(`Failed to get permit: ${error}`);
            throw error;
        }
    }

    async updatePermitStatus(userId, org, permitId, status) {
        try {
            const { gateway, contract } = await this.connectToNetwork(userId, org);

            // Submit the transaction
            const result = await contract.submitTransaction(
                'UpdatePermitStatus',
                permitId,
                status
            );

            // Disconnect from the gateway
            gateway.disconnect();

            return JSON.parse(result.toString());
        } catch (error) {
            console.error(`Failed to update permit status: ${error}`);
            throw error;
        }
    }

    async addDocument(userId, org, permitId, documentHash) {
        try {
            const { gateway, contract } = await this.connectToNetwork(userId, org);

            // Submit the transaction
            const result = await contract.submitTransaction(
                'AddDocument',
                permitId,
                documentHash
            );

            // Disconnect from the gateway
            gateway.disconnect();

            return JSON.parse(result.toString());
        } catch (error) {
            console.error(`Failed to add document: ${error}`);
            throw error;
        }
    }

    async updateChecklist(userId, org, permitId, checklist) {
        try {
            const { gateway, contract } = await this.connectToNetwork(userId, org);

            // Submit the transaction
            const result = await contract.submitTransaction(
                'UpdateChecklist',
                permitId,
                JSON.stringify(checklist)
            );

            // Disconnect from the gateway
            gateway.disconnect();

            return JSON.parse(result.toString());
        } catch (error) {
            console.error(`Failed to update checklist: ${error}`);
            throw error;
        }
    }

    async getAllPermits(userId, org) {
        try {
            const { gateway, contract } = await this.connectToNetwork(userId, org);

            // Evaluate the transaction
            const result = await contract.evaluateTransaction('GetAllPermits');

            // Disconnect from the gateway
            gateway.disconnect();

            return JSON.parse(result.toString());
        } catch (error) {
            console.error(`Failed to get all permits: ${error}`);
            throw error;
        }
    }

    async getPermitsByStatus(userId, org, status) {
        try {
            const { gateway, contract } = await this.connectToNetwork(userId, org);

            // Evaluate the transaction
            const result = await contract.evaluateTransaction('GetPermitsByStatus', status);

            // Disconnect from the gateway
            gateway.disconnect();

            return JSON.parse(result.toString());
        } catch (error) {
            console.error(`Failed to get permits by status: ${error}`);
            throw error;
        }
    }

    async getPermitsByApplicant(userId, org, applicantName) {
        try {
            const { gateway, contract } = await this.connectToNetwork(userId, org);

            // Evaluate the transaction
            const result = await contract.evaluateTransaction('GetPermitsByApplicant', applicantName);

            // Disconnect from the gateway
            gateway.disconnect();

            return JSON.parse(result.toString());
        } catch (error) {
            console.error(`Failed to get permits by applicant: ${error}`);
            throw error;
        }
    }

    async checkConnection() {
        try {
            // Create a new file system based wallet for managing identities
            const wallet = await Wallets.newFileSystemWallet(this.walletPath);
            
            // Check if we have any identities in the wallet
            const identities = await wallet.list();
            if (identities.length === 0) {
                console.log('No identities found in wallet');
                return false;
            }

            // Try to connect with the first identity
            const userId = identities[0];
            const { gateway } = await this.connectToNetwork(userId, 'org1');
            
            // Disconnect from the gateway
            gateway.disconnect();
            
            return true;
        } catch (error) {
            console.error(`Failed to check blockchain connection: ${error}`);
            return false;
        }
    }
}

module.exports = new BlockchainService(); 