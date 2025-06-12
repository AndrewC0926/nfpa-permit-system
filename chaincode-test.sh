#!/bin/bash
set -e

# Source utilities
source scripts/test-utils.sh

# Default values
PERMIT_ID="permit_$(date +%s)"
ORG=${ORG:-"org1"}
MAX_RETRIES=${MAX_RETRIES:-3}
CLEANUP=false

# Parse command line arguments
parse_args "$@"

# Initialize JSON log
JSON_LOG_FILE=$(init_json_log "chaincode-test")

# Environment variables
BLOCKCHAIN_DIR="$(pwd)/blockchain"
CHANNEL_NAME="mychannel"
CHAINCODE_NAME="permitContract"
PEER_DIR="$BLOCKCHAIN_DIR/organizations/peerOrganizations/$ORG.permit.com"

# Set up peer environment
export FABRIC_CFG_PATH="$BLOCKCHAIN_DIR"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="${ORG^}MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$PEER_DIR/peers/peer0.$ORG.permit.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$PEER_DIR/users/Admin@$ORG.permit.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

# Create sample permit
log "$LOG_INFO" "Creating sample permit $PERMIT_ID..."
PERMIT_JSON=$(cat <<EOF
{
    "id": "$PERMIT_ID",
    "type": "construction",
    "status": "pending",
    "applicant": {
        "name": "Test Contractor",
        "email": "test@example.com",
        "phone": "555-0123"
    },
    "location": {
        "address": "123 Test St",
        "city": "Test City",
        "state": "TS",
        "zip": "12345"
    },
    "details": {
        "description": "Test permit creation",
        "startDate": "$(date -I)",
        "endDate": "$(date -I -d "+30 days")"
    }
}
EOF
)

# Array to store transaction IDs
declare -a TX_IDS

# Invoke chaincode to create permit
log "$LOG_INFO" "Invoking chaincode to create permit..."
CREATE_CMD="peer chaincode invoke \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.permit.com \
    --tls \
    --cafile \"$BLOCKCHAIN_DIR/organizations/ordererOrganizations/permit.com/orderers/orderer.permit.com/msp/tlscacerts/tlsca.permit.com-cert.pem\" \
    -C $CHANNEL_NAME \
    -n $CHAINCODE_NAME \
    -c \"{\\\"function\\\":\\\"CreatePermit\\\",\\\"args\\\":[\\\"$PERMIT_ID\\\",\\\"$PERMIT_JSON\\\"]}\" \
    --waitForEvent"

TRANSACTION_ID=$(retry $MAX_RETRIES 2 "$CREATE_CMD" "Create permit" "$JSON_LOG_FILE" | grep "txid" | awk '{print $2}' | tr -d '"')

if [ -z "$TRANSACTION_ID" ]; then
    log "$LOG_ERROR" "Failed to create permit"
    update_test_result "$JSON_LOG_FILE" "FAILED" "$PERMIT_ID" "[]" "peer0.$ORG.permit.com"
    exit 1
fi
TX_IDS+=("$TRANSACTION_ID")
log "$LOG_INFO" "Permit creation transaction ID: $TRANSACTION_ID"

# Wait for transaction to be committed
log "$LOG_INFO" "Waiting for transaction to be committed..."
sleep 5

# Query permit details
log "$LOG_INFO" "Querying permit details..."
QUERY_CMD="peer chaincode query \
    -C $CHANNEL_NAME \
    -n $CHAINCODE_NAME \
    -c \"{\\\"function\\\":\\\"GetPermit\\\",\\\"args\\\":[\\\"$PERMIT_ID\\\"]}\""

retry $MAX_RETRIES 2 "$QUERY_CMD" "Query permit" "$JSON_LOG_FILE"

# Query permit history
log "$LOG_INFO" "Querying permit history..."
HISTORY_CMD="peer chaincode query \
    -C $CHANNEL_NAME \
    -n $CHAINCODE_NAME \
    -c \"{\\\"function\\\":\\\"GetPermitHistory\\\",\\\"args\\\":[\\\"$PERMIT_ID\\\"]}\""

retry $MAX_RETRIES 2 "$HISTORY_CMD" "Query permit history" "$JSON_LOG_FILE"

# Query all permits
log "$LOG_INFO" "Querying all permits..."
ALL_CMD="peer chaincode query \
    -C $CHANNEL_NAME \
    -n $CHAINCODE_NAME \
    -c \"{\\\"function\\\":\\\"GetAllPermits\\\",\\\"args\\\":[]}\""

retry $MAX_RETRIES 2 "$ALL_CMD" "Query all permits" "$JSON_LOG_FILE"

# Clean up if requested
cleanup_permit "$PERMIT_ID" "$JSON_LOG_FILE"

# Update test result
TX_IDS_JSON=$(printf '%s\n' "${TX_IDS[@]}" | jq -R . | jq -s .)
update_test_result "$JSON_LOG_FILE" "PASS" "$PERMIT_ID" "$TX_IDS_JSON" "peer0.$ORG.permit.com"

log "$LOG_INFO" "Chaincode test completed successfully!" 