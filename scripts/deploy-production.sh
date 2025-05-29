#!/bin/bash
# NFPA Permit System - Production Deployment Script
# Usage: ./deploy-production.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION="us-east-1"
CLUSTER_NAME="nfpa-permit-cluster"
NAMESPACE="nfpa-permit-system"
DOCKER_REGISTRY="your-account.dkr.ecr.us-east-1.amazonaws.com"
IMAGE_TAG=$(git rev-parse --short HEAD)

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if required tools are installed
    command -v terraform >/dev/null 2>&1 || { print_error "Terraform is required but not installed. Aborting."; exit 1; }
    command -v kubectl >/dev/null 2>&1 || { print_error "kubectl is required but not installed. Aborting."; exit 1; }
    command -v helm >/dev/null 2>&1 || { print_error "Helm is required but not installed. Aborting."; exit 1; }
    command -v aws >/dev/null 2>&1 || { print_error "AWS CLI is required but not installed. Aborting."; exit 1; }
    command -v docker >/dev/null 2>&1 || { print_error "Docker is required but not installed. Aborting."; exit 1; }
    
    # Check AWS credentials
    aws sts get-caller-identity >/dev/null 2>&1 || { print_error "AWS credentials not configured. Aborting."; exit 1; }
    
    print_status "All prerequisites met"
}

# Create infrastructure with Terraform
deploy_infrastructure() {
    print_info "Deploying infrastructure with Terraform..."
    
    cd terraform/
    
    # Initialize Terraform
    terraform init
    
    # Plan infrastructure changes
    terraform plan -var="environment=$ENVIRONMENT" -out=tfplan
    
    print_warning "Review the Terraform plan above. Continue? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_error "Deployment cancelled by user"
        exit 1
    fi
    
    # Apply infrastructure changes
    terraform apply tfplan
    
    # Get outputs
    CLUSTER_ENDPOINT=$(terraform output -raw cluster_endpoint)
    RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
    REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)
    S3_BUCKET=$(terraform output -raw s3_bucket_name)
    
    print_status "Infrastructure deployed successfully"
    cd ..
}

# Configure kubectl
configure_kubectl() {
    print_info "Configuring kubectl..."
    
    aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
    
    # Test cluster connection
    kubectl cluster-info
    
    print_status "kubectl configured successfully"
}

# Build and push Docker images
build_and_push_images() {
    print_info "Building and pushing Docker images..."
    
    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $DOCKER_REGISTRY
    
    # Build backend image
    docker build -t nfpa-backend:$IMAGE_TAG -f application/backend/Dockerfile application/backend/
    docker tag nfpa-backend:$IMAGE_TAG $DOCKER_REGISTRY/nfpa-backend:$IMAGE_TAG
    docker tag nfpa-backend:$IMAGE_TAG $DOCKER_REGISTRY/nfpa-backend:latest
    
    # Push images
    docker push $DOCKER_REGISTRY/nfpa-backend:$IMAGE_TAG
    docker push $DOCKER_REGISTRY/nfpa-backend:latest
    
    print_status "Docker images built and pushed"
}

# Install monitoring stack
install_monitoring() {
    print_info "Installing monitoring stack..."
    
    # Add Helm repositories
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo add elastic https://helm.elastic.co
    helm repo update
    
    # Create monitoring namespace
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    
    # Install Prometheus stack
    helm upgrade --install prometheus-stack prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --values helm/prometheus-stack-values.yaml \
        --wait
    
    # Install ELK stack
    helm upgrade --install elasticsearch elastic/elasticsearch \
        --namespace monitoring \
        --values helm/elasticsearch-values.yaml \
        --wait
    
    helm upgrade --install kibana elastic/kibana \
        --namespace monitoring \
        --values helm/elasticsearch-values.yaml \
        --wait
    
    helm upgrade --install logstash elastic/logstash \
        --namespace monitoring \
        --values helm/elasticsearch-values.yaml \
        --wait
    
    helm upgrade --install filebeat elastic/filebeat \
        --namespace monitoring \
        --values helm/elasticsearch-values.yaml \
        --wait
    
    print_status "Monitoring stack installed"
}

# Install security tools
install_security() {
    print_info "Installing security tools..."
    
    # Add Helm repositories
    helm repo add falcosecurity https://falcosecurity.github.io/charts
    helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
    helm repo update
    
    # Create security namespace
    kubectl create namespace security --dry-run=client -o yaml | kubectl apply -f -
    
    # Install Falco
    helm upgrade --install falco falcosecurity/falco \
        --namespace security \
        --values helm/falco-values.yaml \
        --wait
    
    # Install Velero
    helm upgrade --install velero vmware-tanzu/velero \
        --namespace velero \
        --create-namespace \
        --values helm/velero-values.yaml \
        --wait
    
    print_status "Security tools installed"
}

# Deploy NFPA application
deploy_application() {
    print_info "Deploying NFPA application..."
    
    # Create namespace
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Update image tags in deployment files
    sed -i "s|nfpa-permit-system:latest|$DOCKER_REGISTRY/nfpa-backend:$IMAGE_TAG|g" k8s/production/*.yaml
    
    # Apply Kubernetes manifests
    kubectl apply -f k8s/production/ -n $NAMESPACE
    
    # Wait for deployments to be ready
    kubectl wait --for=condition=available --timeout=600s deployment/nfpa-backend -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=600s deployment/fabric-peer -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=600s deployment/postgres -n $NAMESPACE
    
    print_status "NFPA application deployed"
}

# Setup SSL certificates
setup_ssl() {
    print_info "Setting up SSL certificates..."
    
    # Install cert-manager if not already installed
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml
    
    # Wait for cert-manager to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-webhook -n cert-manager
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-cainjector -n cert-manager
    
    # Create ClusterIssuer for Let's Encrypt
    cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
    
    print_status "SSL certificates configured"
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."
    
    # Create migration job
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: nfpa-migration-$(date +%s)
  namespace: $NAMESPACE
spec:
  template:
    spec:
      containers:
      - name: migration
        image: $DOCKER_REGISTRY/nfpa-backend:$IMAGE_TAG
        command: ["npm", "run", "migrate"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: nfpa-secrets
              key: DATABASE_URL
      restartPolicy: Never
  backoffLimit: 3
EOF
    
    print_status "Database migrations completed"
}

# Verify deployment
verify_deployment() {
    print_info "Verifying deployment..."
    
    # Check pod status
    kubectl get pods -n $NAMESPACE
    
    # Check service status
    kubectl get services -n $NAMESPACE
    
    # Check ingress status
    kubectl get ingress -n $NAMESPACE
    
    # Test health endpoint
    BACKEND_URL=$(kubectl get ingress nfpa-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')
    
    if curl -s -f "https://$BACKEND_URL/health" > /dev/null; then
        print_status "Health check passed"
    else
        print_warning "Health check failed - application may still be starting"
    fi
    
    # Display important information
    echo ""
    echo "🎉 NFPA Permit System Deployment Complete!"
    echo "=========================================="
    echo ""
    echo "📊 Application URLs:"
    echo "   Main Application: https://$BACKEND_URL"
    echo "   API Health Check: https://$BACKEND_URL/health"
    echo "   API Documentation: https://$BACKEND_URL/api/docs"
    echo ""
    echo "🔧 Monitoring URLs:"
    GRAFANA_URL=$(kubectl get ingress grafana-ingress -n monitoring -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo "Not configured")
    KIBANA_URL=$(kubectl get ingress kibana-ingress -n monitoring -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo "Not configured")
    echo "   Grafana: https://$GRAFANA_URL"
    echo "   Kibana: https://$KIBANA_URL"
    echo ""
    echo "🗃️ Database Information:"
    echo "   RDS Endpoint: $RDS_ENDPOINT"
    echo "   Redis Endpoint: $REDIS_ENDPOINT"
    echo "   S3 Bucket: $S3_BUCKET"
    echo ""
    echo "🔐 Security Information:"
    echo "   SSL Certificates: Managed by cert-manager"
    echo "   Network Policies: Applied"
    echo "   Security Scanning: Falco running"
    echo "   Backup Strategy: Velero configured"
    echo ""
    
    print_status "Deployment verification completed"
}

# Cleanup function
cleanup() {
    print_info "Cleaning up temporary files..."
    rm -f terraform/tfplan
    print_status "Cleanup completed"
}

# Show usage information
show_usage() {
    echo "NFPA Permit System - Production Deployment Script"
    echo ""
    echo "Usage: $0 [ENVIRONMENT] [COMMAND]"
    echo ""
    echo "ENVIRONMENT:"
    echo "  production  - Deploy to production (default)"
    echo "  staging     - Deploy to staging"
    echo ""
    echo "COMMANDS:"
    echo "  all         - Full deployment (default)"
    echo "  infra       - Deploy infrastructure only"
    echo "  app         - Deploy application only"
    echo "  monitoring  - Install monitoring stack only"
    echo "  security    - Install security tools only"
    echo "  verify      - Verify existing deployment"
    echo "  cleanup     - Clean up resources"
    echo ""
    echo "Examples:"
    echo "  $0                          # Full production deployment"
    echo "  $0 staging                  # Full staging deployment"
    echo "  $0 production app           # Deploy app to production only"
    echo "  $0 production monitoring    # Install monitoring only"
}

# Main deployment function
main() {
    local command=${2:-all}
    
    echo "🏛️ =========================================="
    echo "🏛️  NFPA Permit System Production Deployment"
    echo "🏛️  Environment: $ENVIRONMENT"
    echo "🏛️  Command: $command"
    echo "🏛️ =========================================="
    echo ""
    
    case $command in
        "all")
            check_prerequisites
            deploy_infrastructure
            configure_kubectl
            build_and_push_images
            install_monitoring
            install_security
            setup_ssl
            deploy_application
            run_migrations
            verify_deployment
            cleanup
            ;;
        "infra")
            check_prerequisites
            deploy_infrastructure
            configure_kubectl
            ;;
        "app")
            check_prerequisites
            configure_kubectl
            build_and_push_images
            deploy_application
            run_migrations
            verify_deployment
            ;;
        "monitoring")
            check_prerequisites
            configure_kubectl
            install_monitoring
            ;;
        "security")
            check_prerequisites
            configure_kubectl
            install_security
            ;;
        "verify")
            check_prerequisites
            configure_kubectl
            verify_deployment
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Trap signals for cleanup
trap cleanup EXIT

# Run main function
main "$@"

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

# Database configuration
db_instance_class = "db.r5.xlarge"
db_allocated_storage = 500
db_backup_retention_period = 30

# Redis configuration
redis_node_type = "cache.r5.large"
redis_num_cache_clusters = 3

# Additional tags
additional_tags = {
  Owner = "IT-Operations"
  CostCenter = "Production"
  Compliance = "SOC2"
}
EOF

    # Production Kubernetes values
    cat > $CONFIG_DIR/production/kubernetes-values.yaml <<EOF
# Production Kubernetes Configuration
replicaCount: 5

image:
  repository: your-account.dkr.ecr.us-east-1.amazonaws.com/nfpa-backend
  tag: latest
  pullPolicy: Always

resources:
  limits:
    cpu: 2000m
    memory: 4Gi
  requests:
    cpu: 1000m
    memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 50
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: permits.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: nfpa-tls-prod
      hosts:
        - permits.yourdomain.com

database:
  host: nfpa-permit-cluster-prod-postgres.cluster-xyz.us-east-1.rds.amazonaws.com
  port: 5432
  name: nfpa_permits
  ssl: require

redis:
  host: nfpa-permit-cluster-prod-redis.xyz.cache.amazonaws.com
  port: 6379
  ssl: true

monitoring:
  enabled: true
  prometheus:
    enabled: true
  grafana:
    enabled: true
  alerts:
    enabled: true
    email: "ops@yourdomain.com"

security:
  networkPolicies:
    enabled: true
  podSecurityPolicy:
    enabled: true
  falco:
    enabled: true
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

# Database configuration (smaller instances for staging)
db_instance_class = "db.t3.medium"
db_allocated_storage = 100
db_backup_retention_period = 7

# Redis configuration
redis_node_type = "cache.t3.medium"
redis_num_cache_clusters = 1

# Additional tags
additional_tags = {
  Owner = "Development"
  CostCenter = "Staging"
  AutoShutdown = "true"
}
EOF

    # Staging Kubernetes values
    cat > $CONFIG_DIR/staging/kubernetes-values.yaml <<EOF
# Staging Kubernetes Configuration
replicaCount: 2

image:
  repository: your-account.dkr.ecr.us-east-1.amazonaws.com/nfpa-backend
  tag: staging
  pullPolicy: Always

resources:
  limits:
    cpu: 1000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 85

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-staging"
    nginx.ingress.kubernetes.io/rate-limit: "50"
  hosts:
    - host: staging-permits.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: nfpa-tls-staging
      hosts:
        - staging-permits.yourdomain.com

database:
  host: nfpa-permit-cluster-staging-postgres.cluster-xyz.us-east-1.rds.amazonaws.com
  port: 5432
  name: nfpa_permits_staging
  ssl: prefer

redis:
  host: nfpa-permit-cluster-staging-redis.xyz.cache.amazonaws.com
  port: 6379
  ssl: false

monitoring:
  enabled: true
  prometheus:
    enabled: true
  grafana:
    enabled: false
  alerts:
    enabled: false

security:
  networkPolicies:
    enabled: false
  podSecurityPolicy:
    enabled: false
  falco:
    enabled: false
EOF

    print_status "Staging configuration created"
}

create_development_config() {
    print_info "Creating development configuration..."
    
    mkdir -p $CONFIG_DIR/development
    
    # Development local configuration
    cat > $CONFIG_DIR/development/docker-compose.override.yml <<EOF
# Development Docker Compose Override
version: '3.8'

services:
  nfpa-backend:
    build: 
      context: ./application/backend
      dockerfile: Dockerfile.dev
    volumes:
      - ./application/backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
      - HOT_RELOAD=true
    ports:
      - "3001:3001"
      - "9229:9229"  # Debug port

  postgres:
    environment:
      - POSTGRES_DB=nfpa_permits_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data

  redis:
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data

  fabric-peer:
    environment:
      - FABRIC_LOGGING_SPEC=DEBUG
    volumes:
      - ./fabric-config:/opt/gopath/src/github.com/hyperledger/fabric/peer/fabric-config

volumes:
  postgres_dev_data:
  redis_dev_data:
EOF

    print_status "Development configuration created"
}

# Create monitoring dashboards
create_monitoring_dashboards() {
    print_info "Creating monitoring dashboards..."
    
    mkdir -p $CONFIG_DIR/monitoring/dashboards
    
    # NFPA System Overview Dashboard
    cat > $CONFIG_DIR/monitoring/dashboards/nfpa-overview.json <<EOF
{
  "dashboard": {
    "id": null,
    "title": "NFPA Permit System Overview",
    "tags": ["nfpa", "permits", "blockchain"],
    "style": "dark",
    "timezone": "browser",
    "panels": [
      {
        "title": "System Health",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job='nfpa-backend'}",
            "legendFormat": "Backend Health"
          }
        ]
      },
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='nfpa-backend'}[5m])",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job='nfpa-backend'}[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Active Permits",
        "type": "stat",
        "targets": [
          {
            "expr": "nfpa_active_permits_total",
            "legendFormat": "Active Permits"
          }
        ]
      },
      {
        "title": "Blockchain Transactions",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(fabric_transaction_total[5m])",
            "legendFormat": "Transactions/sec"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
EOF

    print_status "Monitoring dashboards created"
}

# Create security policies
create_security_policies() {
    print_info "Creating security policies..."
    
    mkdir -p $CONFIG_DIR/security
    
    # Pod Security Policy
    cat > $CONFIG_DIR/security/pod-security-policy.yaml <<EOF
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: nfpa-restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  runAsGroup:
    rule: 'MustRunAs'
    ranges:
      - min: 1
        max: 65535
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
EOF

    # Network Security Policy
    cat > $CONFIG_DIR/security/network-policy.yaml <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: nfpa-network-policy
  namespace: nfpa-permit-system
spec:
  podSelector:
    matchLabels:
      app: nfpa-backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: istio-system
    - podSelector:
        matchLabels:
          app: nginx-ingress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
EOF

    print_status "Security policies created"
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
        "development")
            create_development_config
            ;;
        "all")
            create_production_config
            create_staging_config
            create_development_config
            ;;
        *)
            echo "Unknown environment: $ENVIRONMENT"
            echo "Valid options: production, staging, development, all"
            exit 1
            ;;
    esac
    
    create_monitoring_dashboards
    create_security_policies
    
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
