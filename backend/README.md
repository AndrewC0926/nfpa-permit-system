# NFPA Permit System Backend

A production-ready backend for the NFPA Permit System, featuring Hyperledger Fabric integration, AI-powered document analysis, and comprehensive security measures.

## Features

- **Hyperledger Fabric Integration**: Secure blockchain-based permit management
- **AI Document Analysis**: Automated document verification and compliance checking
- **Security Features**:
  - Rate limiting
  - Security headers (Helmet)
  - XSS protection
  - CORS configuration
  - JWT authentication
  - Password hashing
- **Audit Logging**: Comprehensive logging of all system events
- **File Management**: Secure document upload and verification
- **Health Monitoring**: System health checks and metrics
- **API Documentation**: Swagger/OpenAPI documentation
- **Background Jobs**: Automated cleanup and verification tasks

## Prerequisites

- Node.js >= 14.0.0
- MongoDB >= 4.4
- Hyperledger Fabric Network
- AI Service Integration (optional)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/nfpa-permit-system
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRATION=24h
   FABRIC_CONNECTION_PROFILE=path/to/connection-profile.json
   AI_SERVICE_API_KEY=your_ai_service_key
   AI_WEBHOOK_SECRET=your_webhook_secret
   ```

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Documentation

Access the Swagger documentation at `/api-docs` when the server is running.

## Security Features

### Rate Limiting
- General API: 100 requests per 15 minutes
- Authentication: 5 requests per hour

### Security Headers
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- X-XSS-Protection

### File Security
- File hash verification
- Automatic cleanup of old files
- Secure file storage

## Background Jobs

### Cleanup Job
- Runs daily at 2 AM
- Removes files older than 30 days
- Verifies file integrity

### Hash Verification
- Runs every 6 hours
- Verifies file hashes
- Updates document status

## Error Handling

The application includes comprehensive error handling:
- Centralized error handling middleware
- Detailed error logging
- Production-safe error responses

## Logging

- Winston logger configuration
- Separate error and combined logs
- Audit logging for critical operations
- Development console logging

## Testing

Run tests:
```bash
npm test
```

## Code Quality

Linting:
```bash
npm run lint
```

Formatting:
```bash
npm run format
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure proper MongoDB connection
3. Set up Hyperledger Fabric network
4. Configure AI service integration
5. Set secure JWT secret
6. Enable all security features
7. Configure proper logging
8. Set up monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

## Rootless, CI/CD-Safe Usage

- All scripts (`init.sh`, `fix-backend.sh`, etc.) are designed to run as a normal user only.
- **Do not run any scripts as root or with sudo.** They will fail fast if you try.
- If any root-owned files are detected in the backend or logs directories, scripts will exit and prompt you to fix permissions.
- All scripts are safe to run in GitHub Actions, Vercel, or Docker runners with a non-root user.
- No password prompts or interactive sudo required at any stage.

## Running in CI/CD

- Use `init.sh` to bootstrap the backend in any CI/CD pipeline.
- Use `fix-backend.sh` to repair dependencies or update packages in a rootless environment.
- All scripts are non-interactive and production-ready. 