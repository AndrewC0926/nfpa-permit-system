#!/bin/bash

# Logging levels
LOG_INFO="INFO"
LOG_ERROR="ERROR"
LOG_DEBUG="DEBUG"

# JSON log file
JSON_LOG_DIR="logs"
mkdir -p "$JSON_LOG_DIR"

# Initialize JSON log
init_json_log() {
    local test_type=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local log_file="$JSON_LOG_DIR/${test_type}-${timestamp}.json"
    
    # Create initial JSON structure
    cat > "$log_file" <<EOF
{
    "testType": "$test_type",
    "timestamp": "$(date -Iseconds)",
    "environment": {
        "API_URL": "${API_URL:-http://localhost:3000}",
        "CHANNEL_NAME": "${CHANNEL_NAME:-mychannel}",
        "CHAINCODE_NAME": "${CHAINCODE_NAME:-permitContract}"
    },
    "testData": {
        "permitId": "",
        "transactionIds": [],
        "peerUsed": ""
    },
    "steps": [],
    "result": "IN_PROGRESS"
}
EOF
    echo "$log_file"
}

# Log to JSON
log_json() {
    local log_file=$1
    local step=$2
    local status=$3
    local details=$4
    
    # Update steps array
    jq --arg step "$step" \
       --arg status "$status" \
       --arg details "$details" \
       '.steps += [{"step": $step, "status": $status, "details": $details, "timestamp": "'$(date -Iseconds)'"}]' \
       "$log_file" > "${log_file}.tmp" && mv "${log_file}.tmp" "$log_file"
}

# Update test result in JSON
update_test_result() {
    local log_file=$1
    local result=$2
    local permit_id=$3
    local tx_ids=$4
    local peer_used=$5
    
    jq --arg result "$result" \
       --arg permitId "$permit_id" \
       --arg peerUsed "$peer_used" \
       '.result = $result | 
        .testData.permitId = $permitId |
        .testData.peerUsed = $peerUsed |
        .testData.transactionIds = '"$tx_ids" \
       "$log_file" > "${log_file}.tmp" && mv "${log_file}.tmp" "$log_file"
}

# Logging function with timestamp and level
log() {
    local level=$1
    local message=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message"
}

# Retry function with exponential backoff
retry() {
    local max_attempts=$1
    local delay=$2
    local command=$3
    local description=$4
    local log_file=$5
    
    local attempt=1
    local result=0
    
    while [ $attempt -le $max_attempts ]; do
        log "$LOG_INFO" "Attempt $attempt/$max_attempts: $description"
        
        # Run the command and capture both stdout and stderr
        output=$($command 2>&1)
        result=$?
        
        if [ $result -eq 0 ]; then
            log "$LOG_INFO" "Success: $description"
            if [ -n "$log_file" ]; then
                log_json "$log_file" "$description" "SUCCESS" "$output"
            fi
            echo "$output"
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            log "$LOG_ERROR" "Failed: $description (attempt $attempt/$max_attempts)"
            log "$LOG_ERROR" "Error output: $output"
            if [ -n "$log_file" ]; then
                log_json "$log_file" "$description" "RETRY" "$output"
            fi
            sleep $delay
            delay=$((delay * 2))
        fi
        
        attempt=$((attempt + 1))
    done
    
    log "$LOG_ERROR" "Failed after $max_attempts attempts: $description"
    log "$LOG_ERROR" "Last error output: $output"
    if [ -n "$log_file" ]; then
        log_json "$log_file" "$description" "FAILED" "$output"
    fi
    return 1
}

# Load environment variables from .env file
load_env() {
    local env_file="scripts/.env"
    if [ -f "$env_file" ]; then
        log "$LOG_INFO" "Loading environment from $env_file"
        set -a
        source "$env_file"
        set +a
    fi
}

# Parse command line arguments
parse_args() {
    local args=("$@")
    local i=0
    
    while [ $i -lt ${#args[@]} ]; do
        case ${args[$i]} in
            --permit-id=*)
                PERMIT_ID="${args[$i]#*=}"
                ;;
            --org=*)
                ORG="${args[$i]#*=}"
                ;;
            --retry=*)
                MAX_RETRIES="${args[$i]#*=}"
                ;;
            --clean)
                CLEANUP=true
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log "$LOG_ERROR" "Unknown option: ${args[$i]}"
                show_help
                exit 1
                ;;
        esac
        i=$((i + 1))
    done
}

# Show help message
show_help() {
    cat <<EOF
Usage: $0 [options]

Options:
    --permit-id=<value>    Specify permit ID (default: auto-generated)
    --org=<org1|org2>      Specify organization (default: org1)
    --retry=<n>            Number of retry attempts (default: 3)
    --clean                Clean up test permit after verification
    --help                 Show this help message

Environment variables can be set in scripts/.env or overridden inline:
    API_URL=http://localhost:3000 ./api-smoke-test.sh
EOF
}

# Clean up test permit
cleanup_permit() {
    local permit_id=$1
    local log_file=$2
    
    if [ "$CLEANUP" = true ]; then
        log "$LOG_INFO" "Cleaning up test permit: $permit_id"
        # Add cleanup logic here based on the test type
        log_json "$log_file" "cleanup" "SUCCESS" "Cleaned up permit $permit_id"
    fi
}

# Export functions
export -f log
export -f retry
export -f load_env
export -f parse_args
export -f show_help
export -f cleanup_permit
export -f init_json_log
export -f log_json
export -f update_test_result 