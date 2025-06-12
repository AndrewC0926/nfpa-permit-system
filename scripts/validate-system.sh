#!/bin/bash

# Source utility functions
source "$(dirname "$0")/test-utils.sh"

# Initialize JSON log
LOG_FILE="$LOG_DIR/system-validation-$(date +%Y%m%d-%H%M%S).json"
echo "[]" > "$LOG_FILE"

# Environment variables
BLOCKCHAIN_DIR="$(pwd)/blockchain"
BACKEND_DIR="$(pwd)/backend"
FRONTEND_DIR="$(pwd)/frontend"
CHANNEL_NAME="permit-channel"
CHAINCODE_NAME="permitContract"
CHAINCODE_VERSION="1.0"
API_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5173"

# Result tracking
declare -A RESULTS=(
    [blockchain]="pending"
    [backend]="pending"
    [frontend]="pending"
    [ai]="pending"
    [storage]="pending"
    [tests]="pending"
)

# Auto-remediation functions
remediate_blockchain() {
    log_action "Attempting blockchain remediation"
    
    # Check and create channel-artifacts
    if [ ! -d "$BLOCKCHAIN_DIR/channel-artifacts" ]; then
        log_info "Creating channel-artifacts directory"
        mkdir -p "$BLOCKCHAIN_DIR/channel-artifacts"
    fi

    # Check and run fix-paths.sh
    if [ ! -f "$BLOCKCHAIN_DIR/channel-artifacts/genesis.block" ]; then
        log_info "Running fix-paths.sh to regenerate artifacts"
        "$(dirname "$0")/fix-paths.sh"
    fi

    # Check and restart Docker containers
    if ! docker ps | grep -q "orderer"; then
        log_info "Attempting to restart Docker containers"
        docker-compose -f "$BLOCKCHAIN_DIR/docker-compose.yaml" down
        docker-compose -f "$BLOCKCHAIN_DIR/docker-compose.yaml" up -d
        sleep 10  # Wait for containers to start
    fi
}

remediate_backend() {
    log_action "Attempting backend remediation"
    
    # Check and create .env
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        log_info "Creating default .env file"
        cat > "$BACKEND_DIR/.env" << EOL
PORT=3000
MONGODB_URI=mongodb://localhost:27017/nfpa-permit
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}
OPENAI_API_KEY=${OPENAI_API_KEY:-}
EOL
    fi

    # Check and install dependencies
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        log_info "Installing backend dependencies"
        cd "$BACKEND_DIR" && npm install
    fi

    # Check and restart backend
    if ! curl -s "$API_URL/health" | grep -q "ok"; then
        log_info "Attempting to restart backend"
        cd "$BACKEND_DIR" && npm run dev &
        sleep 5  # Wait for backend to start
    fi
}

remediate_frontend() {
    log_action "Attempting frontend remediation"
    
    # Check and create .env
    if [ ! -f "$FRONTEND_DIR/.env" ]; then
        log_info "Creating default .env file"
        cat > "$FRONTEND_DIR/.env" << EOL
VITE_API_BASE_URL=http://localhost:3000
EOL
    fi

    # Check and install dependencies
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        log_info "Installing frontend dependencies"
        cd "$FRONTEND_DIR" && npm install
    fi
}

# Validation functions with auto-remediation
validate_blockchain() {
    log_step "Validating Blockchain Components"
    local needs_remediation=false
    
    # Check Docker containers
    log_action "Checking Docker containers"
    if ! docker ps | grep -q "orderer"; then
        log_error "Orderer container is not running"
        needs_remediation=true
    fi
    if ! docker ps | grep -q "peer0.org1"; then
        log_error "Peer0.org1 container is not running"
        needs_remediation=true
    fi
    if ! docker ps | grep -q "peer0.org2"; then
        log_error "Peer0.org2 container is not running"
        needs_remediation=true
    fi

    # Check MSP directories
    log_action "Checking MSP directories"
    for org in org1 org2; do
        if [ ! -d "$BLOCKCHAIN_DIR/organizations/peerOrganizations/$org.example.com/msp" ]; then
            log_error "MSP directory missing for $org"
            needs_remediation=true
        fi
    done

    # Check channel artifacts
    log_action "Checking channel artifacts"
    if [ ! -f "$BLOCKCHAIN_DIR/channel-artifacts/genesis.block" ]; then
        log_error "Genesis block missing"
        needs_remediation=true
    fi
    if [ ! -f "$BLOCKCHAIN_DIR/channel-artifacts/$CHANNEL_NAME.tx" ]; then
        log_error "Channel transaction missing"
        needs_remediation=true
    fi

    # Check chaincode
    log_action "Checking chaincode"
    for org in org1 org2; do
        if ! docker exec peer0.$org.example.com peer lifecycle chaincode queryinstalled | grep -q "$CHAINCODE_NAME"; then
            log_error "Chaincode not installed on peer0.$org"
            needs_remediation=true
        fi
    done

    # Attempt remediation if needed
    if [ "$needs_remediation" = true ]; then
        log_warning "Blockchain components need remediation"
        remediate_blockchain
        # Re-run validation after remediation
        validate_blockchain
    else
        log_success "All blockchain components are healthy"
        RESULTS[blockchain]="healthy"
    fi
}

validate_backend() {
    log_step "Validating Backend Components"
    local needs_remediation=false
    
    # Check Node.js environment
    log_action "Checking Node.js environment"
    if ! command -v node &> /dev/null; then
        log_error "Node.js not installed"
        return 1
    fi
    if ! command -v npm &> /dev/null; then
        log_error "npm not installed"
        return 1
    fi

    # Check backend dependencies
    log_action "Checking backend dependencies"
    if [ ! -f "$BACKEND_DIR/package.json" ]; then
        log_error "Backend package.json missing"
        needs_remediation=true
    fi
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        log_error "Backend node_modules missing"
        needs_remediation=true
    fi

    # Check environment variables
    log_action "Checking environment variables"
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        log_error "Backend .env file missing"
        needs_remediation=true
    fi

    # Check API health
    log_action "Checking API health"
    if ! curl -s "$API_URL/health" | grep -q "ok"; then
        log_error "API health check failed"
        needs_remediation=true
    fi

    # Attempt remediation if needed
    if [ "$needs_remediation" = true ]; then
        log_warning "Backend components need remediation"
        remediate_backend
        # Re-run validation after remediation
        validate_backend
    else
        log_success "Backend is healthy"
        RESULTS[backend]="healthy"
    fi
}

validate_frontend() {
    log_step "Validating Frontend Components"
    local needs_remediation=false
    
    # Check Node.js environment
    log_action "Checking Node.js environment"
    if ! command -v node &> /dev/null; then
        log_error "Node.js not installed"
        return 1
    fi
    if ! command -v npm &> /dev/null; then
        log_error "npm not installed"
        return 1
    fi

    # Check frontend dependencies
    log_action "Checking frontend dependencies"
    if [ ! -f "$FRONTEND_DIR/package.json" ]; then
        log_error "Frontend package.json missing"
        needs_remediation=true
    fi
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        log_error "Frontend node_modules missing"
        needs_remediation=true
    fi

    # Check environment variables
    log_action "Checking environment variables"
    if [ ! -f "$FRONTEND_DIR/.env" ]; then
        log_error "Frontend .env file missing"
        needs_remediation=true
    fi
    if ! grep -q "VITE_API_BASE_URL" "$FRONTEND_DIR/.env"; then
        log_error "VITE_API_BASE_URL not configured"
        needs_remediation=true
    fi

    # Attempt remediation if needed
    if [ "$needs_remediation" = true ]; then
        log_warning "Frontend components need remediation"
        remediate_frontend
        # Re-run validation after remediation
        validate_frontend
    else
        log_success "Frontend is healthy"
        RESULTS[frontend]="healthy"
    fi
}

validate_ai_integration() {
    log_step "Validating AI Integration"
    
    # Check OpenAI API key
    log_action "Checking OpenAI API key"
    if [ -z "$OPENAI_API_KEY" ]; then
        log_error "OPENAI_API_KEY not set"
        RESULTS[ai]="error"
        return 1
    fi

    # Check AI webhook
    log_action "Checking AI webhook"
    if ! curl -s "$API_URL/api/ai/health" | grep -q "ok"; then
        log_error "AI webhook health check failed"
        RESULTS[ai]="error"
        return 1
    fi

    log_success "AI integration is healthy"
    RESULTS[ai]="healthy"
}

validate_storage() {
    log_step "Validating Storage Components"
    
    # Check MongoDB connection
    log_action "Checking MongoDB connection"
    if ! curl -s "$API_URL/api/health" | grep -q "mongodb"; then
        log_error "MongoDB connection failed"
        RESULTS[storage]="error"
        return 1
    fi

    # Check AWS S3 configuration
    log_action "Checking AWS S3 configuration"
    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
        log_error "AWS credentials not configured"
        RESULTS[storage]="error"
        return 1
    fi

    log_success "Storage is healthy"
    RESULTS[storage]="healthy"
}

validate_tests() {
    log_step "Validating Test Suite"
    
    # Run all tests
    log_action "Running test suite"
    if ! make verify; then
        log_error "Test suite failed"
        RESULTS[tests]="error"
        return 1
    fi

    # Check test logs
    log_action "Checking test logs"
    if [ ! -d "$LOG_DIR" ]; then
        log_error "Test logs directory missing"
        RESULTS[tests]="error"
        return 1
    fi
    if [ ! -f "$LOG_DIR/latest-test-summary.json" ]; then
        log_error "Test summary missing"
        RESULTS[tests]="error"
        return 1
    fi

    log_success "Tests are healthy"
    RESULTS[tests]="healthy"
}

# Print validation summary
print_summary() {
    echo ""
    echo "📊 Validation Summary"
    echo "===================="
    echo ""
    
    # Print component status
    for component in "${!RESULTS[@]}"; do
        case "${RESULTS[$component]}" in
            "healthy")
                echo "✅ $(echo $component | tr '[:lower:]' '[:upper:]'): Healthy"
                ;;
            "error")
                echo "❌ $(echo $component | tr '[:lower:]' '[:upper:]'): Failed"
                ;;
            "warning")
                echo "⚠️  $(echo $component | tr '[:lower:]' '[:upper:]'): Warning"
                ;;
            *)
                echo "❓ $(echo $component | tr '[:lower:]' '[:upper:]'): Unknown"
                ;;
        esac
    done
    
    echo ""
    echo "💡 Next Steps:"
    echo "-------------"
    if [[ "${RESULTS[blockchain]}" == "error" ]]; then
        echo "• Run 'make reset' to reset blockchain state"
        echo "• Check Docker containers with 'docker ps'"
    fi
    if [[ "${RESULTS[backend]}" == "error" ]]; then
        echo "• Check backend logs in $BACKEND_DIR/logs"
        echo "• Verify .env configuration"
    fi
    if [[ "${RESULTS[frontend]}" == "error" ]]; then
        echo "• Check frontend build with 'npm run build'"
        echo "• Verify VITE_API_BASE_URL in .env"
    fi
    if [[ "${RESULTS[ai]}" == "error" ]]; then
        echo "• Set OPENAI_API_KEY environment variable"
        echo "• Check AI webhook configuration"
    fi
    if [[ "${RESULTS[storage]}" == "error" ]]; then
        echo "• Verify MongoDB connection string"
        echo "• Check AWS credentials"
    fi
    if [[ "${RESULTS[tests]}" == "error" ]]; then
        echo "• Run 'make test-chaincode' and 'make test-api' separately"
        echo "• Check test logs in $LOG_DIR"
    fi
}

# Main validation
main() {
    echo "🔍 Starting System Validation"
    echo "============================"

    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"

    # Run all validations
    validate_blockchain
    validate_backend
    validate_frontend
    validate_ai_integration
    validate_storage
    validate_tests

    # Print summary
    print_summary

    # Exit with appropriate status
    if [[ "${RESULTS[blockchain]}" == "error" ]] || \
       [[ "${RESULTS[backend]}" == "error" ]] || \
       [[ "${RESULTS[frontend]}" == "error" ]] || \
       [[ "${RESULTS[ai]}" == "error" ]] || \
       [[ "${RESULTS[storage]}" == "error" ]] || \
       [[ "${RESULTS[tests]}" == "error" ]]; then
        echo ""
        echo "❌ System validation failed. Please check the logs above."
        exit 1
    else
        echo ""
        echo "✅ System validation passed!"
        exit 0
    fi
}

# Run main function
main 