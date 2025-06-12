const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

class BlockchainHelper {
    constructor() {
        this.channelName = 'permitchannel';
        this.chaincodeName = 'permitcontract';
        this.mspOrg = 'CityMSP';
        this.walletPath = path.join(process.cwd(), 'wallet');
        this.connectionProfilePath = path.join(process.cwd(), 'connection-profile.json');
    }

    async connectToNetwork(userId) {
        try {
            // Create a new wallet for managing identities
            const wallet = await Wallets.newFileSystemWallet(this.walletPath);

            // Load the connection profile
            const connectionProfile = JSON.parse(fs.readFileSync(this.connectionProfilePath, 'utf8'));

            // Create a new gateway instance for interacting with the fabric network
            const gateway = new Gateway();

            // Connect to the gateway using the identity specified
            await gateway.connect(connectionProfile, {
                wallet,
                identity: userId,
                discovery: { enabled: true, asLocalhost: true }
            });

            // Get the network channel
            const network = await gateway.getNetwork(this.channelName);

            // Get the contract instance
            const contract = network.getContract(this.chaincodeName);

            return { gateway, contract };
        } catch (error) {
            console.error(`Failed to connect to the network: ${error}`);
            throw error;
        }
    }

    async submitTransaction(userId, fcn, ...args) {
        let gateway;
        try {
            const connection = await this.connectToNetwork(userId);
            gateway = connection.gateway;
            const contract = connection.contract;

            // Submit the transaction
            const result = await contract.submitTransaction(fcn, ...args);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error(`Failed to submit transaction: ${error}`);
            throw error;
        } finally {
            if (gateway) {
                gateway.disconnect();
            }
        }
    }

    async evaluateTransaction(userId, fcn, ...args) {
        let gateway;
        try {
            const connection = await this.connectToNetwork(userId);
            gateway = connection.gateway;
            const contract = connection.contract;

            // Evaluate the transaction
            const result = await contract.evaluateTransaction(fcn, ...args);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error(`Failed to evaluate transaction: ${error}`);
            throw error;
        } finally {
            if (gateway) {
                gateway.disconnect();
            }
        }
    }
}

module.exports = new BlockchainHelper(); 