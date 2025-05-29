#!/bin/bash
# NFPA Permit System - Environment-specific Configuration Script
# Usage: ./configure-environment.sh [environment]

set -e

ENVIRONMENT=${1:-production}
CONFIG_DIR="config/environments"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Create environment-specific configurations
create_production_config() {
    print_info "Creating production configuration..."
    
    mkdir -p $CONFIG_DIR/production
    
    # Production Terraform variables
    cat > $CONFIG_DIR/production/terraform.tfvars <<EOF
# Production Environment Configuration
aws_region = "us-east-1"
cluster_name = "nfpa-permit-cluster-prod"
environment = "production"

# Node group configuration
node_group_desired_size = 5
node_group_max_size = 20
node_group_min_size = 3

# Domain configuration
domain_name = "permits.yourdomain.com"
EOF

    print_status "Production configuration created"
}

create_staging_config() {
    print_info "Creating staging configuration..."
    
    mkdir -p $CONFIG_DIR/staging
    
    # Staging Terraform variables
    cat > $CONFIG_DIR/staging/terraform.tfvars <<EOF
# Staging Environment Configuration
aws_region = "us-east-1"
cluster_name = "nfpa-permit-cluster-staging"
environment = "staging"

# Node group configuration (smaller for staging)
node_group_desired_size = 2
node_group_max_size = 5
node_group_min_size = 1

# Domain configuration
domain_name = "staging-permits.yourdomain.com"
EOF

    print_status "Staging configuration created"
}

# Main configuration function
main() {
    echo "🔧 =========================================="
    echo "🔧  NFPA Permit System Environment Setup"
    echo "🔧  Environment: $ENVIRONMENT"
    echo "🔧 =========================================="
    echo ""
    
    case $ENVIRONMENT in
        "production")
            create_production_config
            ;;
        "staging")
            create_staging_config
            ;;
        "all")
            create_production_config
            create_staging_config
            ;;
        *)
            echo "Unknown environment: $ENVIRONMENT"
            echo "Valid options: production, staging, all"
            exit 1
            ;;
    esac
    
    echo ""
    echo "🎉 Environment configuration completed!"
    echo "======================================="
    echo ""
    echo "📁 Configuration files created in: $CONFIG_DIR/"
    echo ""
    echo "Next steps:"
    echo "1. Review and customize the configuration files"
    echo "2. Update domain names and credentials"
    echo "3. Run the deployment script: ./deploy-production.sh $ENVIRONMENT"
    echo ""
}

# Run main function
main

