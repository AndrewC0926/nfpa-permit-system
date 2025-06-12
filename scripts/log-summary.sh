#!/bin/bash

# Source utilities
source "$(dirname "$0")/test-utils.sh"

# Default values
LOG_DIR="logs"
NUM_RESULTS=${1:-5}  # Default to last 5 results

# Function to format timestamp
format_timestamp() {
    local timestamp=$1
    date -d "$timestamp" "+%Y-%m-%d %H:%M"
}

# Function to get test duration
get_duration() {
    local log_file=$1
    local start_time=$(jq -r '.timestamp' "$log_file")
    local end_time=$(jq -r '.steps[-1].timestamp' "$log_file")
    
    if [ "$start_time" != "null" ] && [ "$end_time" != "null" ]; then
        local start_sec=$(date -d "$start_time" +%s)
        local end_sec=$(date -d "$end_time" +%s)
        local duration=$((end_sec - start_sec))
        printf "%ds" $duration
    else
        echo "N/A"
    fi
}

# Function to get failed steps
get_failed_steps() {
    local log_file=$1
    jq -r '.steps[] | select(.status == "FAILED") | .step' "$log_file" | tr '\n' '; ' | sed 's/; $//'
}

# Print header
printf "%-20s %-15s %-12s %-8s %-10s %-40s %s\n" \
    "Timestamp" "Script" "Permit ID" "Status" "Duration" "Transaction ID" "Failed Steps"
printf "%s\n" "--------------------------------------------------------------------------------------------------------"

# Find and sort log files
find "$LOG_DIR" -name "*-test-*.json" -type f -printf "%T@ %p\n" | \
    sort -nr | \
    head -n "$NUM_RESULTS" | \
    cut -d' ' -f2- | \
    while read -r log_file; do
        # Extract data from JSON
        timestamp=$(jq -r '.timestamp' "$log_file")
        test_type=$(jq -r '.testType' "$log_file")
        permit_id=$(jq -r '.testData.permitId' "$log_file")
        status=$(jq -r '.result' "$log_file")
        tx_ids=$(jq -r '.testData.transactionIds | join(", ")' "$log_file")
        failed_steps=$(get_failed_steps "$log_file")
        duration=$(get_duration "$log_file")
        
        # Format and print row
        printf "%-20s %-15s %-12s %-8s %-10s %-40s %s\n" \
            "$(format_timestamp "$timestamp")" \
            "$test_type" \
            "$permit_id" \
            "$status" \
            "$duration" \
            "$tx_ids" \
            "$failed_steps"
    done

# Print summary
echo
echo "Summary:"
echo "--------"
total_tests=$(find "$LOG_DIR" -name "*-test-*.json" | wc -l)
passed_tests=$(find "$LOG_DIR" -name "*-test-*.json" -exec jq -r '.result' {} \; | grep -c "PASS")
failed_tests=$((total_tests - passed_tests))

echo "Total tests: $total_tests"
echo "Passed: $passed_tests"
echo "Failed: $failed_tests"

# Exit with non-zero if any tests failed
if [ "$failed_tests" -gt 0 ]; then
    exit 1
fi 