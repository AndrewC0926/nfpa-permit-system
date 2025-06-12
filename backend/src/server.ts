import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './config/database';
import { logger } from './config/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

// Connect to database
connectDB()
  .then(() => {
    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`🔧 Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
}); 