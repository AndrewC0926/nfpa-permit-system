#!/bin/bash
set -e

# Source utilities
source scripts/test-utils.sh

# Default values
PERMIT_ID="permit_$(date +%s)"
ORG=${ORG:-"org1"}
MAX_RETRIES=${MAX_RETRIES:-3}
CLEANUP=false
API_URL=${API_URL:-"http://localhost:3000"}

# Parse command line arguments
parse_args "$@"

# Initialize JSON log
JSON_LOG_FILE=$(init_json_log "api-test")

# Environment variables
BLOCKCHAIN_DIR="$(pwd)/blockchain"
CHANNEL_NAME="mychannel"
CHAINCODE_NAME="permitContract"
PEER_DIR="$BLOCKCHAIN_DIR/organizations/peerOrganizations/$ORG.permit.com"

# Array to store transaction IDs
declare -a TX_IDS

# Test API health endpoint
log "$LOG_INFO" "Testing API health endpoint..."
HEALTH_CMD="curl -s -w \"\n%{http_code}\" \"$API_URL/health\""
HEALTH_RESPONSE=$(retry $MAX_RETRIES 2 "$HEALTH_CMD" "API health check" "$JSON_LOG_FILE")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    log "$LOG_ERROR" "API health check failed with status $HTTP_CODE"
    log "$LOG_ERROR" "Response: $RESPONSE_BODY"
    update_test_result "$JSON_LOG_FILE" "FAILED" "$PERMIT_ID" "[]" "peer0.$ORG.permit.com"
    exit 1
fi
log "$LOG_INFO" "API health check passed"

# Create test permit via API
log "$LOG_INFO" "Creating test permit via API..."
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
        "description": "Test permit creation via API",
        "startDate": "$(date -I)",
        "endDate": "$(date -I -d "+30 days")"
    }
}
EOF
)

CREATE_CMD="curl -s -w \"\n%{http_code}\" \
    -X POST \
    -H \"Content-Type: application/json\" \
    -d '$PERMIT_JSON' \
    \"$API_URL/api/permits\""

CREATE_RESPONSE=$(retry $MAX_RETRIES 2 "$CREATE_CMD" "Create permit via API" "$JSON_LOG_FILE")
HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "201" ]; then
    log "$LOG_ERROR" "Permit creation failed with status $HTTP_CODE"
    log "$LOG_ERROR" "Response: $RESPONSE_BODY"
    update_test_result "$JSON_LOG_FILE" "FAILED" "$PERMIT_ID" "[]" "peer0.$ORG.permit.com"
    exit 1
fi
log "$LOG_INFO" "Permit creation successful"

# Extract transaction ID from response
TRANSACTION_ID=$(echo "$RESPONSE_BODY" | grep -o '"transactionId":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TRANSACTION_ID" ]; then
    log "$LOG_ERROR" "No transaction ID in response"
    update_test_result "$JSON_LOG_FILE" "FAILED" "$PERMIT_ID" "[]" "peer0.$ORG.permit.com"
    exit 1
fi
TX_IDS+=("$TRANSACTION_ID")
log "$LOG_INFO" "Transaction ID: $TRANSACTION_ID"

# Wait for transaction to be committed
log "$LOG_INFO" "Waiting for transaction to be committed..."
sleep 5

# Query permit via API
log "$LOG_INFO" "Querying permit via API..."
QUERY_CMD="curl -s -w \"\n%{http_code}\" \"$API_URL/api/permits/$PERMIT_ID\""
QUERY_RESPONSE=$(retry $MAX_RETRIES 2 "$QUERY_CMD" "Query permit via API" "$JSON_LOG_FILE")
HTTP_CODE=$(echo "$QUERY_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$QUERY_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    log "$LOG_ERROR" "Permit query failed with status $HTTP_CODE"
    log "$LOG_ERROR" "Response: $RESPONSE_BODY"
    update_test_result "$JSON_LOG_FILE" "FAILED" "$PERMIT_ID" "$TX_IDS_JSON" "peer0.$ORG.permit.com"
    exit 1
fi
log "$LOG_INFO" "Permit query successful"

# Verify permit details match
if ! echo "$RESPONSE_BODY" | grep -q "$PERMIT_ID"; then
    log "$LOG_ERROR" "Permit ID mismatch in response"
    update_test_result "$JSON_LOG_FILE" "FAILED" "$PERMIT_ID" "$TX_IDS_JSON" "peer0.$ORG.permit.com"
    exit 1
fi

# Query permit history via API
log "$LOG_INFO" "Querying permit history via API..."
HISTORY_CMD="curl -s -w \"\n%{http_code}\" \"$API_URL/api/permits/$PERMIT_ID/history\""
HISTORY_RESPONSE=$(retry $MAX_RETRIES 2 "$HISTORY_CMD" "Query permit history via API" "$JSON_LOG_FILE")
HTTP_CODE=$(echo "$HISTORY_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HISTORY_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    log "$LOG_ERROR" "Permit history query failed with status $HTTP_CODE"
    log "$LOG_ERROR" "Response: $RESPONSE_BODY"
    update_test_result "$JSON_LOG_FILE" "FAILED" "$PERMIT_ID" "$TX_IDS_JSON" "peer0.$ORG.permit.com"
    exit 1
fi
log "$LOG_INFO" "Permit history query successful"

# Verify transaction ID in history
if ! echo "$RESPONSE_BODY" | grep -q "$TRANSACTION_ID"; then
    log "$LOG_ERROR" "Transaction ID not found in history"
    update_test_result "$JSON_LOG_FILE" "FAILED" "$PERMIT_ID" "$TX_IDS_JSON" "peer0.$ORG.permit.com"
    exit 1
fi

# Query all permits via API
log "$LOG_INFO" "Querying all permits via API..."
ALL_CMD="curl -s -w \"\n%{http_code}\" \"$API_URL/api/permits\""
ALL_RESPONSE=$(retry $MAX_RETRIES 2 "$ALL_CMD" "Query all permits via API" "$JSON_LOG_FILE")
HTTP_CODE=$(echo "$ALL_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$ALL_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    log "$LOG_ERROR" "All permits query failed with status $HTTP_CODE"
    log "$LOG_ERROR" "Response: $RESPONSE_BODY"
    update_test_result "$JSON_LOG_FILE" "FAILED" "$PERMIT_ID" "$TX_IDS_JSON" "peer0.$ORG.permit.com"
    exit 1
fi
log "$LOG_INFO" "All permits query successful"

# Verify our permit is in the list
if ! echo "$RESPONSE_BODY" | grep -q "$PERMIT_ID"; then
    log "$LOG_ERROR" "Created permit not found in all permits list"
    update_test_result "$JSON_LOG_FILE" "FAILED" "$PERMIT_ID" "$TX_IDS_JSON" "peer0.$ORG.permit.com"
    exit 1
fi

# Clean up if requested
cleanup_permit "$PERMIT_ID" "$JSON_LOG_FILE"

# Update test result
TX_IDS_JSON=$(printf '%s\n' "${TX_IDS[@]}" | jq -R . | jq -s .)
update_test_result "$JSON_LOG_FILE" "PASS" "$PERMIT_ID" "$TX_IDS_JSON" "peer0.$ORG.permit.com"

log "$LOG_INFO" "API smoke test completed successfully!" 