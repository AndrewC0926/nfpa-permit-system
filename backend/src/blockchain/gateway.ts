import { Gateway, Network, Contract } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';

export class BlockchainGateway {
    private gateway: Gateway;
    private network: Network;
    private contract: Contract;

    constructor() {
        this.gateway = new Gateway();
        // Initialize with dummy values that will be replaced in connect()
        this.network = {} as Network;
        this.contract = {} as Contract;
    }

    async connect() {
        try {
            // Load connection profile
            const connectionProfile = JSON.parse(
                fs.readFileSync(path.resolve(__dirname, '../config/connection-profile.json'), 'utf8')
            );

            // Connect to the gateway
            await this.gateway.connect(connectionProfile, {
                identity: 'admin',
                discovery: { enabled: true, asLocalhost: true }
            });

            // Get the network
            this.network = await this.gateway.getNetwork('mychannel');

            // Get the contract
            this.contract = this.network.getContract('permit-contract');

            console.log('Connected to blockchain network');
        } catch (error) {
            console.error('Failed to connect to blockchain network:', error);
            throw error;
        }
    }

    async submitTransaction(functionName: string, ...args: any[]): Promise<Buffer> {
        try {
            if (!this.contract) {
                throw new Error('Not connected to blockchain network');
            }

            const result = await this.contract.submitTransaction(functionName, ...args);
            return result;
        } catch (error) {
            console.error('Failed to submit transaction:', error);
            throw error;
        }
    }

    async evaluateTransaction(functionName: string, ...args: any[]): Promise<Buffer> {
        try {
            if (!this.contract) {
                throw new Error('Not connected to blockchain network');
            }

            const result = await this.contract.evaluateTransaction(functionName, ...args);
            return result;
        } catch (error) {
            console.error('Failed to evaluate transaction:', error);
            throw error;
        }
    }

    disconnect() {
        if (this.gateway) {
            this.gateway.disconnect();
        }
    }
} 