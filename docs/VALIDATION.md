# NFPA Permit System - Validation Guide

This guide explains how to validate the NFPA Permit System, interpret results, and fix common issues.

## Quick Start

```bash
# Run complete system validation
make validate

# Run validation in CI mode (non-interactive)
make validate-ci
```

## What Gets Validated

The validation system checks all critical components:

### 1. Blockchain Network
- ✅ Docker containers (orderer, peers)
- ✅ MSP directories and certificates
- ✅ Channel artifacts (genesis block, channel tx)
- ✅ Chaincode installation and commitment

### 2. Backend API
- ✅ Node.js environment
- ✅ Dependencies (package.json, node_modules)
- ✅ Environment variables (.env)
- ✅ API health endpoint
- ✅ MongoDB connection
- ✅ AWS S3 configuration

### 3. Frontend
- ✅ Node.js environment
- ✅ Dependencies
- ✅ Environment variables
- ✅ API base URL configuration

### 4. AI Integration
- ✅ OpenAI API key
- ✅ AI webhook health
- ✅ Document analysis endpoints

### 5. Storage
- ✅ MongoDB connection
- ✅ AWS S3 credentials
- ✅ File upload/download

### 6. Test Suite
- ✅ Chaincode tests
- ✅ API smoke tests
- ✅ Test logs and summaries

## Understanding Results

The validation output includes:

1. **Component Status**
   ```
   ✅ BLOCKCHAIN: Healthy
   ✅ BACKEND: Healthy
   ⚠️  FRONTEND: Warning
   ❌ AI: Failed
   ```

2. **Next Steps**
   - Specific actions to fix each failed component
   - Commands to run for remediation
   - Log locations for debugging

3. **Auto-Remediation**
   - Missing directories are created
   - Default .env files are generated
   - Docker containers are restarted
   - Dependencies are installed

## Common Issues and Fixes

### Blockchain Issues
- **Missing Containers**
  ```bash
  make reset  # Reset blockchain state
  docker ps   # Check container status
  ```
- **Missing Artifacts**
  ```bash
  ./scripts/fix-paths.sh  # Regenerate artifacts
  ```

### Backend Issues
- **Missing .env**
  ```bash
  cp backend/.env.example backend/.env  # Create from template
  ```
- **API Not Responding**
  ```bash
  cd backend && npm run dev  # Restart backend
  ```

### Frontend Issues
- **Build Errors**
  ```bash
  cd frontend && npm install  # Install dependencies
  npm run build              # Rebuild frontend
  ```
- **API Connection**
  ```bash
  # Check VITE_API_BASE_URL in frontend/.env
  ```

### AI Integration Issues
- **Missing API Key**
  ```bash
  export OPENAI_API_KEY=your_key_here
  ```
- **Webhook Errors**
  ```bash
  # Check backend logs for webhook errors
  tail -f backend/logs/app.log
  ```

### Storage Issues
- **MongoDB Connection**
  ```bash
  # Verify MongoDB URI in backend/.env
  mongodb://localhost:27017/nfpa-permit
  ```
- **AWS Credentials**
  ```bash
  # Set AWS credentials
  export AWS_ACCESS_KEY_ID=your_key
  export AWS_SECRET_ACCESS_KEY=your_secret
  ```

## CI/CD Integration

The validation system is designed to work in CI/CD pipelines:

```yaml
# .github/workflows/verify.yml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Validate System
        run: make validate-ci
```

## Best Practices

1. **Regular Validation**
   - Run `make validate` after pulling changes
   - Run before deploying to production
   - Run after modifying configuration

2. **Environment Setup**
   - Keep .env files in sync
   - Maintain consistent port numbers
   - Use proper API keys and credentials

3. **Troubleshooting**
   - Check component logs
   - Verify network connectivity
   - Ensure all services are running

## Support

If you encounter issues:
1. Check the validation output
2. Review component-specific logs
3. Run individual component tests
4. Check the troubleshooting guide

## Contributing

To add new validation checks:
1. Add check to appropriate validation function
2. Add remediation if possible
3. Update documentation
4. Add test cases 