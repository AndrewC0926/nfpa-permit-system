#!/bin/bash
set -e

# Source utilities
source "$(dirname "$0")/test-utils.sh"

# Initialize JSON log
JSON_LOG_FILE=$(init_json_log "demo")

# Environment variables
API_URL=${API_URL:-"http://localhost:3000"}
BLOCKCHAIN_DIR="$(pwd)/blockchain"
CHANNEL_NAME="mychannel"
CHAINCODE_NAME="permitContract"

# Generate unique IDs
PERMIT_ID="permit_$(date +%s)"
USER_ID="user_$(date +%s)"

# Logging function for demo steps
demo_log() {
    local step=$1
    local message=$2
    log "$LOG_INFO" "[$step] $message"
    log_json "$JSON_LOG_FILE" "$step" "INFO" "$message"
}

# Function to wait for user input
wait_for_user() {
    local message=$1
    echo
    echo "Press Enter to $message..."
    read -r
}

# Start demo
demo_log "start" "Starting NFPA Permit System Demo"
echo "==============================================="
echo "NFPA Permit System Demo"
echo "==============================================="
echo

# Step 1: User Login
demo_log "login" "Simulating user login..."
wait_for_user "simulate user login"
echo "✅ User logged in successfully"
echo

# Step 2: Upload Permit
demo_log "upload" "Creating test permit..."
PERMIT_JSON=$(cat <<EOF
{
    "id": "$PERMIT_ID",
    "type": "construction",
    "status": "pending",
    "applicant": {
        "name": "Demo Contractor",
        "email": "demo@example.com",
        "phone": "555-0123"
    },
    "location": {
        "address": "123 Demo St",
        "city": "Demo City",
        "state": "DS",
        "zip": "12345"
    },
    "details": {
        "description": "Demo permit creation",
        "startDate": "$(date -I)",
        "endDate": "$(date -I -d "+30 days")"
    }
}
EOF
)

# Create permit via API
CREATE_CMD="curl -s -w \"\n%{http_code}\" \
    -X POST \
    -H \"Content-Type: application/json\" \
    -d '$PERMIT_JSON' \
    \"$API_URL/api/permits\""

CREATE_RESPONSE=$(retry 3 2 "$CREATE_CMD" "Create permit" "$JSON_LOG_FILE")
HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "201" ]; then
    demo_log "error" "Failed to create permit: $RESPONSE_BODY"
    exit 1
fi

TRANSACTION_ID=$(echo "$RESPONSE_BODY" | grep -o '"transactionId":"[^"]*"' | cut -d'"' -f4)
demo_log "upload" "Permit created with ID: $PERMIT_ID"
demo_log "upload" "Transaction ID: $TRANSACTION_ID"
echo "✅ Permit uploaded successfully"
echo

# Step 3: AI Analysis
demo_log "analysis" "Simulating AI analysis..."
wait_for_user "simulate AI analysis"
echo "✅ AI analysis completed"
echo

# Step 4: Blockchain Verification
demo_log "blockchain" "Verifying permit on blockchain..."
QUERY_CMD="curl -s -w \"\n%{http_code}\" \"$API_URL/api/permits/$PERMIT_ID\""
QUERY_RESPONSE=$(retry 3 2 "$QUERY_CMD" "Query permit" "$JSON_LOG_FILE")
HTTP_CODE=$(echo "$QUERY_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$QUERY_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    demo_log "error" "Failed to verify permit: $RESPONSE_BODY"
    exit 1
fi

demo_log "blockchain" "Permit verified on blockchain"
echo "✅ Blockchain verification successful"
echo

# Step 5: Audit Summary
demo_log "audit" "Generating audit summary..."
HISTORY_CMD="curl -s -w \"\n%{http_code}\" \"$API_URL/api/permits/$PERMIT_ID/history\""
HISTORY_RESPONSE=$(retry 3 2 "$HISTORY_CMD" "Query permit history" "$JSON_LOG_FILE")
HTTP_CODE=$(echo "$HISTORY_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HISTORY_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    demo_log "error" "Failed to get audit history: $RESPONSE_BODY"
    exit 1
fi

demo_log "audit" "Audit summary generated"
echo "✅ Audit summary generated"
echo

# Print summary
echo "==============================================="
echo "Demo Summary"
echo "==============================================="
echo "Permit ID: $PERMIT_ID"
echo "Transaction ID: $TRANSACTION_ID"
echo "Status: Success"
echo "Log file: $JSON_LOG_FILE"
echo "==============================================="

# Update test result
TX_IDS_JSON="[\"$TRANSACTION_ID\"]"
update_test_result "$JSON_LOG_FILE" "PASS" "$PERMIT_ID" "$TX_IDS_JSON" "demo"

demo_log "end" "Demo completed successfully" 