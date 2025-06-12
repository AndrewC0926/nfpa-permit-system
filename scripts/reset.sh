#!/bin/bash
set -e

# Source utilities
source "$(dirname "$0")/test-utils.sh"

# Parse command line arguments
RESET_IDENTITIES=false
RESET_CHAINCODE=false
RESET_LOGS=false
RESET_ALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --identities)
            RESET_IDENTITIES=true
            shift
            ;;
        --chaincode)
            RESET_CHAINCODE=true
            shift
            ;;
        --logs)
            RESET_LOGS=true
            shift
            ;;
        --all)
            RESET_ALL=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --identities    Reset blockchain identities"
            echo "  --chaincode     Reset chaincode state"
            echo "  --logs         Clear test logs"
            echo "  --all          Reset everything"
            echo "  --help         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# If --all is specified, set all flags to true
if [ "$RESET_ALL" = true ]; then
    RESET_IDENTITIES=true
    RESET_CHAINCODE=true
    RESET_LOGS=true
fi

# Initialize JSON log
JSON_LOG_FILE=$(init_json_log "reset")

# Environment variables
BLOCKCHAIN_DIR="$(pwd)/blockchain"
CHANNEL_NAME="mychannel"
CHAINCODE_NAME="permitContract"
LOG_DIR="logs"

# Function to reset identities
reset_identities() {
    log "$LOG_INFO" "Resetting blockchain identities..."
    
    # Stop containers
    log "$LOG_INFO" "Stopping containers..."
    docker-compose -f docker-compose.blockchain.yml down
    
    # Remove identity directories
    log "$LOG_INFO" "Removing identity directories..."
    rm -rf "$BLOCKCHAIN_DIR/organizations/peerOrganizations"
    rm -rf "$BLOCKCHAIN_DIR/organizations/ordererOrganizations"
    
    # Remove production directories
    log "$LOG_INFO" "Removing production directories..."
    rm -rf "$BLOCKCHAIN_DIR/organizations/peerOrganizations/*/peers/*/production"
    rm -rf "$BLOCKCHAIN_DIR/organizations/ordererOrganizations/*/orderers/*/production"
    
    log "$LOG_INFO" "Identities reset complete"
    log_json "$JSON_LOG_FILE" "reset_identities" "SUCCESS" "Blockchain identities reset"
}

# Function to reset chaincode state
reset_chaincode() {
    log "$LOG_INFO" "Resetting chaincode state..."
    
    # Stop containers
    log "$LOG_INFO" "Stopping containers..."
    docker-compose -f docker-compose.blockchain.yml down
    
    # Remove channel artifacts
    log "$LOG_INFO" "Removing channel artifacts..."
    rm -rf "$BLOCKCHAIN_DIR/channel-artifacts"
    
    # Remove chaincode containers and images
    log "$LOG_INFO" "Removing chaincode containers and images..."
    docker ps -a | grep dev-peer | awk '{print $1}' | xargs -r docker rm -f
    docker images | grep dev-peer | awk '{print $3}' | xargs -r docker rmi -f
    
    log "$LOG_INFO" "Chaincode state reset complete"
    log_json "$JSON_LOG_FILE" "reset_chaincode" "SUCCESS" "Chaincode state reset"
}

# Function to reset logs
reset_logs() {
    log "$LOG_INFO" "Clearing test logs..."
    rm -rf "$LOG_DIR"/*.json
    log "$LOG_INFO" "Test logs cleared"
    log_json "$JSON_LOG_FILE" "reset_logs" "SUCCESS" "Test logs cleared"
}

# Execute requested resets
if [ "$RESET_IDENTITIES" = true ]; then
    reset_identities
fi

if [ "$RESET_CHAINCODE" = true ]; then
    reset_chaincode
fi

if [ "$RESET_LOGS" = true ]; then
    reset_logs
fi

# Print summary
echo
echo "Reset Summary:"
echo "--------------"
if [ "$RESET_IDENTITIES" = true ]; then
    echo "✅ Blockchain identities reset"
fi
if [ "$RESET_CHAINCODE" = true ]; then
    echo "✅ Chaincode state reset"
fi
if [ "$RESET_LOGS" = true ]; then
    echo "✅ Test logs cleared"
fi
echo
echo "Next steps:"
echo "1. Run 'make verify' to test the system"
echo "2. Check logs in $LOG_DIR for results"
echo

# Update test result
update_test_result "$JSON_LOG_FILE" "PASS" "reset" "[]" "reset"

log "$LOG_INFO" "Reset completed successfully" 