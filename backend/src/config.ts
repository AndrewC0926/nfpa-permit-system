import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

interface Config {
    fabric: {
        connectionProfile: string;
        channelName: string;
        chaincodeName: string;
        walletPath: string;
        userId: string;
    };
    openai: {
        apiKey: string;
    };
    aws: {
        region: string;
        bucket: string;
        accessKeyId: string;
        secretAccessKey: string;
    };
}

export const config: Config = {
    fabric: {
        connectionProfile: process.env.FABRIC_CONNECTION_PROFILE || path.join(__dirname, '../connection-profile.json'),
        channelName: process.env.FABRIC_CHANNEL_NAME || 'mychannel',
        chaincodeName: process.env.FABRIC_CHAINCODE_NAME || 'permitcontract',
        walletPath: process.env.FABRIC_WALLET_PATH || path.join(__dirname, '../wallet'),
        userId: process.env.FABRIC_USER_ID || 'admin'
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || ''
    },
    aws: {
        region: process.env.AWS_REGION || 'us-west-2',
        bucket: process.env.AWS_BUCKET || 'permit-documents',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
}; 