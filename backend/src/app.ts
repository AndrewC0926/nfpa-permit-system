import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './config/logger';
import * as database from './config/database';
import { BlockchainGateway } from './blockchain/gateway';
import permitRoutes from './routes/permits';
import authRoutes from './routes/auth';
import { createPermitRoutes } from './routes/permitRoutes';
import { PermitService } from './services/permitService';
import { AIService } from './services/aiService';
import { StorageService } from './services/storageService';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize blockchain gateway
const blockchainGateway = new BlockchainGateway();
blockchainGateway.connect().catch(error => {
    logger.error('Failed to connect to blockchain:', error);
});

// Initialize services
const aiService = new AIService(config.openai.apiKey);
const storageService = new StorageService(
    config.aws.region,
    config.aws.bucket,
    config.aws.accessKeyId,
    config.aws.secretAccessKey
);
const permitService = new PermitService(blockchainGateway, aiService, storageService);

// Routes
app.use('/api/permits', permitRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/permits', createPermitRoutes(permitService));

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start server
const startServer = async () => {
    try {
        await database.connectDB();
        app.listen(port, () => {
            logger.info(`Server is running on port ${port}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app; 