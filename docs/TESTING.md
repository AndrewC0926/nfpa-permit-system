# NFPA Permit System Testing Guide

This document describes how to run and interpret tests for the NFPA Permit System, including both local testing and CI/CD verification.

## Quick Start

```bash
# Run all tests
make verify

# Run specific test suites
make test-chaincode  # Test blockchain functionality
make test-api       # Test API integration
make test-summary   # View test results
```

## Test Components

The testing suite consists of three main components:

1. **Chaincode Tests** (`scripts/chaincode-test.sh`)
   - Tests direct blockchain interactions
   - Verifies permit creation and querying
   - Validates transaction integrity

2. **API Tests** (`scripts/api-smoke-test.sh`)
   - Tests backend API integration
   - Verifies permit lifecycle through API
   - Validates blockchain interaction

3. **Test Utilities** (`scripts/test-utils.sh`)
   - Common functions for test scripts
   - Logging and error handling
   - Retry logic for transient failures

## Understanding Test Results

### Log Summary Format

The `log-summary.sh` script provides a formatted table of test results:

```
Timestamp            Script           Permit ID    Status    Duration    Transaction ID                    Failed Steps
--------------------------------------------------------------------------------------------------------
2024-06-12 10:33    api-smoke-test   permit001    PASS      45s         abc123...                         
2024-06-12 10:30    chaincode-test   permit002    FAIL      30s         def456...                         Create permit
```

Columns:
- **Timestamp**: When the test was run
- **Script**: Test script name
- **Permit ID**: Unique identifier for test permit
- **Status**: PASS/FAIL
- **Duration**: Test execution time
- **Transaction ID**: Blockchain transaction IDs
- **Failed Steps**: List of failed steps (if any)

### Test Logs

Test logs are stored in the `logs/` directory with the following format:
- `chaincode-test-YYYYMMDD_HHMMSS.json`
- `api-test-YYYYMMDD_HHMMSS.json`

Each log file contains:
- Test environment details
- Step-by-step execution log
- Transaction IDs
- Error messages (if any)
- Final test result

## Pass/Fail Criteria

A test is considered:

### PASS
- All steps complete successfully
- No errors in blockchain transactions
- API responses match expected format
- Transaction IDs are valid and traceable

### FAIL
- Any step returns non-zero exit code
- Blockchain transaction fails
- API returns error status
- Response validation fails
- Timeout or retry limit exceeded

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Pull requests to main
- Pushes to main branch
- Manual workflow dispatch

### CI Artifacts

1. **Test Logs**
   - Available in GitHub Actions artifacts
   - Retained for 7 days
   - Downloadable from Actions tab

2. **PR Comments**
   - Summary of test results
   - Links to full logs
   - Step-by-step status

## Advanced Usage

### Command Line Options

```bash
# Specify permit ID
./scripts/chaincode-test.sh --permit-id=test123

# Choose organization
./scripts/chaincode-test.sh --org=org2

# Set retry attempts
./scripts/chaincode-test.sh --retry=5

# Clean up after test
./scripts/chaincode-test.sh --clean
```

### Environment Variables

```bash
# Override API URL
API_URL=http://localhost:3000 ./scripts/api-smoke-test.sh

# Set in .env file
echo "API_URL=http://localhost:3000" > scripts/.env
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure scripts are executable: `chmod +x scripts/*.sh`
   - Check blockchain directory permissions

2. **API Connection Failed**
   - Verify API is running
   - Check API_URL environment variable
   - Ensure network connectivity

3. **Blockchain Errors**
   - Check peer and orderer status
   - Verify channel configuration
   - Check MSP certificates

### Debugging

1. **View Detailed Logs**
   ```bash
   make test-summary  # View recent test results
   cat logs/latest-test.json  # View full test log
   ```

2. **Clean and Retry**
   ```bash
   make clean  # Remove test artifacts
   make verify  # Run tests again
   ```

## Contributing

When adding new tests:
1. Follow existing script patterns
2. Use test-utils.sh functions
3. Add proper error handling
4. Include JSON logging
5. Update this documentation

## Support

For test-related issues:
1. Check test logs in `logs/` directory
2. Review GitHub Actions artifacts
3. Open an issue with test logs attached 