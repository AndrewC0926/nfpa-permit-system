import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Fail fast if run as root or with sudo
if (typeof process.getuid === 'function' && process.getuid() === 0) {
  // eslint-disable-next-line no-console
  console.error('❌ Do not run the backend as root or with sudo. Exiting.');
  process.exit(1);
}
if (process.env.SUDO_USER) {
  // eslint-disable-next-line no-console
  console.error('❌ Do not run the backend with sudo. Exiting.');
  process.exit(1);
}

// Ensure logs directory exists and is owned by the current user
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
try {
  if (typeof process.getuid === 'function' && typeof process.getgid === 'function') {
    fs.chownSync(logsDir, process.getuid(), process.getgid());
  }
} catch (e) {
  // Ignore if not permitted, but warn
  // eslint-disable-next-line no-console
  console.warn('Warning: Could not set ownership of logs directory.');
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Create a stream object for Morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

// If we're not in production, log to console with more readable format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
} 