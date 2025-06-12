# Makefile Guide

## 🎯 Overview

This guide explains all available Makefile targets and their usage in the NFPA Permit System.

## 📋 Available Targets

### System Validation
```bash
# Interactive validation with auto-remediation
make validate

# CI/CD validation (non-interactive)
make validate-ci

# Validate specific components
make validate-blockchain
make validate-backend
make validate-frontend
make validate-ai
make validate-storage
make validate-tests
```

### Testing
```bash
# Run all tests
make verify

# Run specific test suites
make test-chaincode
make test-api
make test-frontend

# Show test summary
make test-summary

# Clean test artifacts
make clean-tests
```

### Demo
```bash
# Start interactive demo
make demo

# Run demo in CI mode
make demo-ci
```

### System Management
```bash
# Reset system state
make reset

# Reset specific components
make reset-identities
make reset-chaincode
make reset-logs

# Clean all artifacts
make clean
```

### Development
```bash
# Install dependencies
make install

# Start development servers
make dev

# Build for production
make build

# Deploy to production
make deploy
```

## 🔧 Configuration

### Environment Variables
```bash
# CI mode (default: false)
CI_MODE=true make validate

# Debug mode (default: false)
DEBUG=true make test-chaincode

# Test timeout (default: 30s)
TEST_TIMEOUT=60 make verify
```

### Component-Specific Options
```bash
# Blockchain options
BLOCKCHAIN_DIR=/custom/path make validate-blockchain
CHANNEL_NAME=custom-channel make test-chaincode

# Backend options
API_URL=http://localhost:3001 make test-api
NODE_ENV=production make build-backend

# Frontend options
VITE_API_URL=http://api.example.com make build-frontend
```

## 📊 Output Examples

### Validation Output
```bash
$ make validate
🔍 Validating system components...

✅ BLOCKCHAIN: Healthy
  - Channel: permit-channel
  - Peers: 2/2 running
  - Chaincode: v1.0.0 installed

✅ BACKEND: Healthy
  - API: Running on port 3001
  - Database: Connected
  - AI Service: Ready

✅ FRONTEND: Healthy
  - Server: Running on port 3000
  - Build: Latest
  - Assets: Loaded

✅ AI: Healthy
  - Model: Loaded
  - GPU: Available
  - Queue: Empty

✅ STORAGE: Healthy
  - S3: Connected
  - MongoDB: Connected
  - Cache: Ready

✅ TESTS: Healthy
  - Chaincode: 95% coverage
  - API: 90% coverage
  - Frontend: 85% coverage
```

### Test Summary
```bash
$ make test-summary
📊 Test Results Summary

Total Tests: 150
✅ Passed: 145
❌ Failed: 5
⏱️ Duration: 2m 30s

Failed Tests:
1. chaincode-test.sh: Permit creation failed
2. api-smoke-test.sh: Health check timeout
3. frontend-test.sh: Component render error
4. chaincode-test.sh: Query failed
5. api-smoke-test.sh: Validation error

See logs/ for detailed results
```

## 🛠️ Common Tasks

### 1. Development Setup
```bash
# Install dependencies
make install

# Start development servers
make dev

# Run tests
make verify
```

### 2. Testing Changes
```bash
# Run specific test
make test-chaincode

# Show results
make test-summary

# Clean artifacts
make clean-tests
```

### 3. System Reset
```bash
# Reset everything
make reset

# Reset specific component
make reset-chaincode

# Clean all artifacts
make clean
```

### 4. Production Deployment
```bash
# Build all components
make build

# Deploy to production
make deploy

# Verify deployment
make validate
```

## 📝 Best Practices

### 1. Development Workflow
1. Start with `make validate`
2. Make changes
3. Run `make verify`
4. Check `make test-summary`
5. Reset if needed with `make reset`

### 2. Testing Strategy
1. Run specific tests during development
2. Use `make verify` before commits
3. Check `make test-summary` for results
4. Clean artifacts with `make clean-tests`

### 3. System Management
1. Use `make validate` to check health
2. Reset components as needed
3. Clean artifacts regularly
4. Monitor test coverage

## 🔍 Troubleshooting

### Common Issues
1. **Validation Failures**
   - Check component logs
   - Verify dependencies
   - Run `make reset` if needed

2. **Test Failures**
   - Check test logs
   - Verify environment
   - Clean and retry

3. **Build Errors**
   - Check dependencies
   - Verify configuration
   - Clean and rebuild

### Debug Mode
```bash
# Enable debug output
DEBUG=true make <target>

# Example
DEBUG=true make validate
```

## 📚 Related Documentation

- [Validation Guide](VALIDATION.md)
- [Testing Guide](TESTING.md)
- [POC Summary](POC-summary.md) 