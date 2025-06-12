# Test configuration
TEST_SCRIPTS_DIR := scripts
LOG_DIR := logs
CHAINCODE_TEST := $(TEST_SCRIPTS_DIR)/chaincode-test.sh
API_TEST := $(TEST_SCRIPTS_DIR)/api-smoke-test.sh
LOG_SUMMARY := $(TEST_SCRIPTS_DIR)/log-summary.sh
DEMO_SCRIPT := $(TEST_SCRIPTS_DIR)/demo.sh
RESET_SCRIPT := $(TEST_SCRIPTS_DIR)/reset.sh
VALIDATE_SCRIPT := $(TEST_SCRIPTS_DIR)/validate-system.sh

# Default values for optional flags
PERMIT_ID ?= demo$(shell date +%s)
ORG ?= org1
CHANNEL_NAME ?= permit-channel
VERBOSE ?= false
CI_MODE ?= false

# Ensure scripts are executable
.PHONY: setup
setup:
	@echo "🔧 Setting up test environment..."
	@chmod +x $(TEST_SCRIPTS_DIR)/*.sh
	@mkdir -p $(LOG_DIR)
	@echo "✅ Setup complete"

# Validate system
.PHONY: validate
validate: setup
	@echo "🔍 Running system validation..."
	@CI_MODE=false $(VALIDATE_SCRIPT)

# Validate system in CI mode
.PHONY: validate-ci
validate-ci: setup
	@echo "🔍 Running system validation (CI mode)..."
	@CI_MODE=true $(VALIDATE_SCRIPT)

# Run all tests
.PHONY: verify
verify: setup
	@echo "🔍 Running verification tests..."
	@echo "----------------------------------------"
	@echo "1. Running chaincode tests..."
	@$(CHAINCODE_TEST) || (echo "❌ Chaincode tests failed!" && exit 1)
	@echo "2. Running API smoke tests..."
	@$(API_TEST) || (echo "❌ API smoke tests failed!" && exit 1)
	@echo "----------------------------------------"
	@echo "📊 Test Summary:"
	@$(LOG_SUMMARY) 5
	@echo "----------------------------------------"
	@echo "📁 Log files are available in: $(LOG_DIR)"

# Run only chaincode tests
.PHONY: test-chaincode
test-chaincode: setup
	@echo "🔍 Running chaincode tests..."
	@PERMIT_ID=$(PERMIT_ID) ORG=$(ORG) $(CHAINCODE_TEST)

# Run only API tests
.PHONY: test-api
test-api: setup
	@echo "🔍 Running API smoke tests..."
	@PERMIT_ID=$(PERMIT_ID) ORG=$(ORG) $(API_TEST)

# Show test summary
.PHONY: test-summary
test-summary:
	@echo "📊 Test Summary:"
	@$(LOG_SUMMARY) 5

# Run interactive demo
.PHONY: demo
demo: setup
	@echo "🎮 Starting NFPA Permit System Demo..."
	@echo "💡 Tip: Use PERMIT_ID=xyz to specify a custom permit ID"
	@echo "💡 Tip: Use ORG=org1|org2 to specify organization"
	@PERMIT_ID=$(PERMIT_ID) ORG=$(ORG) $(DEMO_SCRIPT)

# Reset system state
.PHONY: reset
reset: setup
	@echo "🔄 Resetting system state..."
	@$(RESET_SCRIPT) --all

# Reset specific components
.PHONY: reset-identities
reset-identities: setup
	@echo "🔄 Resetting blockchain identities..."
	@$(RESET_SCRIPT) --identities

.PHONY: reset-chaincode
reset-chaincode: setup
	@echo "🔄 Resetting chaincode state..."
	@$(RESET_SCRIPT) --chaincode

.PHONY: reset-logs
reset-logs: setup
	@echo "🧹 Clearing test logs..."
	@$(RESET_SCRIPT) --logs

# Clean test artifacts
.PHONY: clean
clean: reset-logs
	@echo "🧹 Cleaning test artifacts..."

# Help target
.PHONY: help
help:
	@echo "NFPA Permit System - Make Commands"
	@echo "=================================="
	@echo ""
	@echo "Available Commands:"
	@echo "------------------"
	@echo "  make validate        Run complete system validation"
	@echo "  make validate-ci     Run validation in CI mode"
	@echo "  make verify          Run all tests and show summary"
	@echo "  make test-chaincode  Run only chaincode tests"
	@echo "  make test-api       Run only API smoke tests"
	@echo "  make test-summary   Show test summary"
	@echo "  make demo           Run interactive system demo"
	@echo "  make reset          Reset all system state"
	@echo "  make reset-identities Reset blockchain identities"
	@echo "  make reset-chaincode  Reset chaincode state"
	@echo "  make reset-logs     Clear test logs"
	@echo "  make clean          Clean test artifacts"
	@echo "  make help           Show this help message"
	@echo ""
	@echo "Optional Flags:"
	@echo "--------------"
	@echo "  PERMIT_ID=xyz       Specify custom permit ID (default: auto-generated)"
	@echo "  ORG=org1|org2       Specify organization (default: org1)"
	@echo "  VERBOSE=true        Enable verbose output"
	@echo "  CI_MODE=true        Run in CI mode (non-interactive)"
	@echo ""
	@echo "Examples:"
	@echo "---------"
	@echo "  make validate              # Run complete system validation"
	@echo "  make validate-ci           # Run validation in CI mode"
	@echo "  make demo                  # Run demo with auto-generated permit"
	@echo "  make demo PERMIT_ID=test123 # Run demo with specific permit"
	@echo "  make test-chaincode ORG=org2 # Run chaincode tests for org2"
	@echo ""
	@echo "💡 Tips:"
	@echo "-------"
	@echo "• Run 'make validate' to check system readiness"
	@echo "• Use 'make validate-ci' in CI/CD pipelines"
	@echo "• Run 'make verify' after making changes"
	@echo "• Use 'make reset-chaincode' after modifying chaincode"
	@echo "• Check logs in $(LOG_DIR) for detailed results"
	@echo "• Use VERBOSE=true for detailed output"

deploy:
	git add .
	git commit -m "Deploy: production release"
	git push origin main
	@echo "Triggering Vercel deployment..."
	curl -X POST https://api.vercel.com/v1/integrations/deploy/prj_xxx?buildCache=false 