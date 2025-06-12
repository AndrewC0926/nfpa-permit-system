export interface Config {
    port: number;
    jwt: {
        secret: string;
        expiresIn: string;
    };
    mongodb: {
        uri: string;
    };
    aws: {
        region: string;
        bucket: string;
        accessKeyId: string;
        secretAccessKey: string;
    };
    openai: {
        apiKey: string;
    };
    fabric: {
        connectionProfile: string;
        channelName: string;
        chaincodeName: string;
        walletPath: string;
        userId: string;
    };
}

export const config: Config = {
    port: parseInt(process.env.PORT || '3000', 10),
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nfpa-permit'
    },
    aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        bucket: process.env.AWS_BUCKET || 'nfpa-permit-docs',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || ''
    },
    fabric: {
        connectionProfile: process.env.FABRIC_CONNECTION_PROFILE || '',
        channelName: process.env.FABRIC_CHANNEL_NAME || 'mychannel',
        chaincodeName: process.env.FABRIC_CHAINCODE_NAME || 'nfpa-permit',
        walletPath: process.env.FABRIC_WALLET_PATH || '',
        userId: process.env.FABRIC_USER_ID || ''
    }
}; 