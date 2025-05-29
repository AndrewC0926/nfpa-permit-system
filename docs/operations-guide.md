# NFPA Permit System - Production Operations Guide

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Deployment Procedures](#deployment-procedures)
3. [Monitoring and Alerting](#monitoring-and-alerting)
4. [Security Operations](#security-operations)
5. [Backup and Recovery](#backup-and-recovery)
6. [Scaling Operations](#scaling-operations)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance Procedures](#maintenance-procedures)
9. [Emergency Procedures](#emergency-procedures)
10. [Compliance and Audit](#compliance-and-audit)

## System Architecture

### Production Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS Production Environment              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Route 53  │    │   CloudFront│    │   WAF       │     │
│  │   DNS       │    │   CDN       │    │   Security  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│           │                 │                 │            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Application Load Balancer                  ││
│  └─────────────────────────────────────────────────────────┘│
│           │                                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                 EKS Cluster                             ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       ││
│  │  │ Ingress     │ │ NFPA        │ │ Fabric      │       ││
│  │  │ Controller  │ │ Backend     │ │ Peers       │       ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘       ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       ││
│  │  │ Monitoring  │ │ Logging     │ │ Security    │       ││
│  │  │ Stack       │ │ Stack       │ │ Tools       │       ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘       ││
│  └─────────────────────────────────────────────────────────┘│
│           │                 │                 │            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ RDS         │    │ ElastiCache │    │ S3          │     │
│  │ PostgreSQL  │    │ Redis       │    │ Documents   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Component Specifications

#### EKS Cluster Configuration
- **Node Groups**: 3 Auto Scaling Groups across 3 AZs
- **Instance Types**: t3.large (burstable), m5.xlarge (baseline)
- **Min/Max Nodes**: 3-20 nodes
- **Kubernetes Version**: 1.28
- **CNI**: AWS VPC CNI

#### Database Layer
- **Primary Database**: RDS PostgreSQL 14.9
  - Instance: db.r5.xlarge
  - Multi-AZ: Enabled
  - Backup Retention: 30 days
  - Encryption: Enabled
- **Cache Layer**: ElastiCache Redis 7.0
  - Instance: cache.r5.large
  - Cluster Mode: Enabled
  - Encryption: At-rest and in-transit

#### Storage
- **Persistent Volumes**: EBS gp3 volumes
- **Document Storage**: S3 with versioning
- **Backup Storage**: S3 with lifecycle policies

## Deployment Procedures

### Pre-Deployment Checklist

```bash
# 1. Verify prerequisites
./scripts/check-prerequisites.sh

# 2. Run security scan
./scripts/security-scan.sh

# 3. Validate configuration
./scripts/validate-config.sh production

# 4. Create deployment branch
git checkout -b release/$(date +%Y%m%d)
```

### Standard Deployment Process

#### 1. Infrastructure Deployment

```bash
# Deploy infrastructure changes
cd terraform/
terraform plan -var-file="environments/production.tfvars"
terraform apply -var-file="environments/production.tfvars"
```

#### 2. Application Deployment

```bash
# Deploy application
./deploy-production.sh production app

# Verify deployment
kubectl get pods -n nfpa-permit-system
kubectl logs -f deployment/nfpa-backend -n nfpa-permit-system
```

#### 3. Post-Deployment Verification

```bash
# Run integration tests
./scripts/integration-tests.sh production

# Verify monitoring
./scripts/check-monitoring.sh

# Update documentation
./scripts/update-runbook.sh
```

### Rollback Procedures

#### Application Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/nfpa-backend -n nfpa-permit-system

# Verify rollback
kubectl rollout status deployment/nfpa-backend -n nfpa-permit-system
```

#### Database Rollback

```bash
# Restore from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier nfpa-permits-restored \
  --db-snapshot-identifier nfpa-permits-backup-20240101
```

## Monitoring and Alerting

### Key Performance Indicators (KPIs)

#### Application Metrics
- **Response Time**: < 200ms (95th percentile)
- **Throughput**: 1000+ requests/minute
- **Error Rate**: < 0.1%
- **Availability**: 99.9% uptime

#### Infrastructure Metrics
- **CPU Utilization**: < 70% average
- **Memory Utilization**: < 80% average
- **Disk I/O**: < 80% capacity
- **Network Latency**: < 10ms

#### Business Metrics
- **Permit Processing Time**: < 2 hours average
- **System Adoption Rate**: Trending upward
- **User Satisfaction**: > 4.5/5 rating

### Alert Thresholds

#### Critical Alerts (PagerDuty)
```yaml
alerts:
  - name: NFPASystemDown
    condition: up{job="nfpa-backend"} == 0
    duration: 1m
    severity: critical
    
  - name: HighErrorRate
    condition: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    duration: 2m
    severity: critical
    
  - name: DatabaseConnectionFailure
    condition: up{job="postgres-exporter"} == 0
    duration: 30s
    severity: critical
```

#### Warning Alerts (Email)
```yaml
alerts:
  - name: HighResponseTime
    condition: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
    duration: 5m
    severity: warning
    
  - name: HighCPUUsage
    condition: avg(cpu_usage_percent) > 80
    duration: 10m
    severity: warning
```

### Monitoring Dashboards

#### Executive Dashboard
- System uptime and availability
- Total permits processed
- Revenue metrics
- User satisfaction scores

#### Operations Dashboard
- Infrastructure health
- Application performance
- Error rates and logs
- Security events

#### Development Dashboard
- API response times
- Database query performance
- Blockchain transaction metrics
- Code deployment frequency

## Security Operations

### Security Monitoring

#### Real-time Security Monitoring
```bash
# Check Falco alerts
kubectl logs -f daemonset/falco -n security

# Review security events
kubectl get events --field-selector type=Warning -n nfpa-permit-system

# Audit log analysis
aws logs filter-log-events --log-group-name /aws/eks/nfpa-permit-cluster/cluster
```

#### Security Scanning Schedule
- **Container Images**: Daily scan with Trivy
- **Infrastructure**: Weekly scan with AWS Config
- **Dependencies**: Continuous monitoring with Snyk
- **Penetration Testing**: Quarterly external assessment

### Incident Response

#### Security Incident Classification

1. **P0 - Critical**: Data breach, system compromise
2. **P1 - High**: Unauthorized access attempt, DDoS
3. **P2 - Medium**: Policy violation, suspicious activity
4. **P3 - Low**: Configuration drift, compliance issue

#### Incident Response Playbook

```bash
# 1. Immediate Response
./scripts/incident-response.sh --severity P0 --type security

# 2. Isolate affected systems
kubectl cordon <affected-node>
kubectl scale deployment/nfpa-backend --replicas=0

# 3. Preserve evidence
kubectl logs deployment/nfpa-backend > incident-logs.txt
aws s3 cp incident-logs.txt s3://nfpa-incident-response/

# 4. Notify stakeholders
./scripts/notify-incident.sh --severity P0 --channels "slack,email,pagerduty"
```

## Backup and Recovery

### Backup Strategy

#### Database Backups
- **Automated Snapshots**: Every 6 hours
- **Cross-Region Replication**: Daily to DR region
- **Point-in-Time Recovery**: 30-day retention
- **Backup Verification**: Weekly restore tests

#### Application Data Backups
```bash
# Kubernetes resources backup
velero backup create nfpa-daily-backup \
  --include-namespaces nfpa-permit-system \
  --ttl 720h

# Document storage backup
aws s3 sync s3://nfpa-documents s3://nfpa-documents-backup \
  --storage-class GLACIER
```

#### Blockchain Data Backup
```bash
# Fabric peer data backup
kubectl exec -it fabric-peer-0 -- tar czf /tmp/fabric-backup.tar.gz /var/hyperledger/production
kubectl cp fabric-peer-0:/tmp/fabric-backup.tar.gz ./fabric-backup-$(date +%Y%m%d).tar.gz
```

### Recovery Procedures

#### Disaster Recovery (RTO: 4 hours, RPO: 1 hour)

```bash
# 1. Activate DR environment
./scripts/activate-dr.sh --region us-west-2

# 2. Restore database
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier nfpa-permits-dr \
  --db-snapshot-identifier latest-snapshot

# 3. Restore application
velero restore create nfpa-dr-restore \
  --from-backup nfpa-daily-backup

# 4. Update DNS
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch file://dns-failover.json

# 5. Verify recovery
./scripts/verify-dr.sh
```

## Scaling Operations

### Auto-Scaling Configuration

#### Horizontal Pod Autoscaler (HPA)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nfpa-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nfpa-backend
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### Cluster Autoscaler
```bash
# Configure cluster autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# Monitor scaling events
kubectl logs -f deployment/cluster-autoscaler -n kube-system
```

### Manual Scaling Procedures

#### Scale Application
```bash
# Scale backend pods
kubectl scale deployment/nfpa-backend --replicas=10 -n nfpa-permit-system

# Scale database
aws rds modify-db-instance \
  --db-instance-identifier nfpa-permits \
  --db-instance-class db.r5.2xlarge \
  --apply-immediately
```

#### Load Testing
```bash
# Run load tests
kubectl run load-test --image=loadimpact/k6 --rm -it --restart=Never \
  -- run -u 100 -d 5m /scripts/load-test.js

# Monitor during load test
watch kubectl top pods -n nfpa-permit-system
```

## Troubleshooting

### Common Issues and Solutions

#### Application Issues

**Issue**: High Response Times
```bash
# Diagnosis
kubectl top pods -n nfpa-permit-system
kubectl logs -f deployment/nfpa-backend -n nfpa-permit-system --tail=100

# Solutions
# 1. Scale horizontally
kubectl scale deployment/nfpa-backend --replicas=10

# 2. Check database performance
kubectl exec -it postgres-0 -- psql -c "SELECT * FROM pg_stat_activity;"

# 3. Clear cache
kubectl exec -it redis-0 -- redis-cli FLUSHALL
```

**Issue**: Database Connection Pool Exhaustion
```bash
# Diagnosis
kubectl logs deployment/nfpa-backend | grep "pool exhausted"

# Solution
kubectl set env deployment/nfpa-backend DATABASE_POOL_SIZE=20
```

#### Infrastructure Issues

**Issue**: Node Not Ready
```bash
# Diagnosis
kubectl describe node <node-name>
kubectl get events --sort-by=.metadata.creationTimestamp

# Solution
kubectl drain <node-name> --ignore-daemonsets
kubectl delete node <node-name>
# Node will be automatically replaced by ASG
```

**Issue**: Persistent Volume Issues
```bash
# Diagnosis
kubectl get pv,pvc -n nfpa-permit-system
kubectl describe pvc <pvc-name>

# Solution
kubectl delete pvc <pvc-name>
kubectl apply -f pvc-replacement.yaml
```

### Log Analysis

#### Centralized Logging
```bash
# Search application logs
kubectl logs -f deployment/nfpa-backend -n nfpa-permit-system | grep ERROR

# Search across all pods
kubectl logs -l app=nfpa-backend -n nfpa-permit-system --since=1h

# Using ELK stack
curl -X GET "elasticsearch:9200/nfpa-backend-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{"query": {"match": {"level": "error"}}}'
```

#### Performance Analysis
```bash
# CPU and memory usage
kubectl top pods -n nfpa-permit-system

# Network analysis
kubectl exec -it nfpa-backend-pod -- netstat -tulpn

# Database performance
kubectl exec -it postgres-0 -- psql -c "
  SELECT query, mean_time, calls 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;"
```

## Maintenance Procedures

### Regular Maintenance Schedule

#### Daily Operations
- [ ] Check system health dashboard
- [ ] Review overnight alerts
- [ ] Verify backup completion
- [ ] Monitor resource utilization

#### Weekly Maintenance
- [ ] Security patch assessment
- [ ] Performance review
- [ ] Capacity planning review
- [ ] Log rotation and cleanup

#### Monthly Maintenance
- [ ] Security vulnerability scan
- [ ] Disaster recovery test
- [ ] Performance optimization
- [ ] Documentation updates

#### Quarterly Maintenance
- [ ] Infrastructure review
- [ ] Security audit
- [ ] Capacity planning
- [ ] Business continuity testing

### Maintenance Windows

#### Scheduled Maintenance Process
```bash
# 1. Notify users
./scripts/notify-maintenance.sh --start "2024-01-15 02:00" --duration "2h"

# 2. Enable maintenance mode
kubectl apply -f maintenance-mode.yaml

# 3. Perform maintenance
./scripts/maintenance-tasks.sh

# 4. Verify system health
./scripts/health-check.sh

# 5. Disable maintenance mode
kubectl delete -f maintenance-mode.yaml

# 6. Notify completion
./scripts/notify-maintenance-complete.sh
```

### Update Procedures

#### Kubernetes Updates
```bash
# 1. Update EKS control plane
aws eks update-cluster-version \
  --name nfpa-permit-cluster \
  --version 1.29

# 2. Update node groups
aws eks update-nodegroup-version \
  --cluster-name nfpa-permit-cluster \
  --nodegroup-name nfpa-nodes

# 3. Update add-ons
kubectl apply -f https://raw.githubusercontent.com/aws/amazon-vpc-cni-k8s/master/config/master/aws-k8s-cni.yaml
```

#### Application Updates
```bash
# 1. Build new image
docker build -t nfpa-backend:v2.1.0 .
docker push your-registry/nfpa-backend:v2.1.0

# 2. Update deployment
kubectl set image deployment/nfpa-backend \
  nfpa-backend=your-registry/nfpa-backend:v2.1.0 \
  -n nfpa-permit-system

# 3. Monitor rollout
kubectl rollout status deployment/nfpa-backend -n nfpa-permit-system
```

## Emergency Procedures

### Emergency Response Team

#### Contact Information
- **Primary On-Call**: +1-555-0123 (PagerDuty)
- **Infrastructure Lead**: infrastructure@yourdomain.com
- **Security Lead**: security@yourdomain.com
- **Business Owner**: permits-owner@yourdomain.com

#### Escalation Matrix
1. **Level 1**: On-call engineer (0-15 minutes)
2. **Level 2**: Lead engineer + Manager (15-30 minutes)
3. **Level 3**: Director + Security team (30-60 minutes)
4. **Level 4**: Executive team (1+ hours)

### Emergency Scenarios

#### Scenario 1: Complete System Outage
```bash
# Immediate actions (0-5 minutes)
1. Acknowledge incident in PagerDuty
2. Join war room: https://zoom.us/emergency-room
3. Execute: ./scripts/emergency-health-check.sh

# Assessment phase (5-15 minutes)
1. Check AWS status: https://status.aws.amazon.com
2. Verify EKS cluster: kubectl cluster-info
3. Check load balancer: aws elbv2 describe-load-balancers

# Recovery actions (15+ minutes)
1. If infrastructure issue: ./scripts/emergency-failover.sh
2. If application issue: kubectl rollout undo deployment/nfpa-backend
3. If database issue: ./scripts/database-emergency-recovery.sh
```

#### Scenario 2: Security Breach
```bash
# Immediate containment (0-10 minutes)
1. Isolate affected systems: ./scripts/security-isolate.sh
2. Preserve evidence: ./scripts/evidence-collection.sh
3. Notify security team: ./scripts/security-alert.sh

# Investigation phase (10+ minutes)
1. Analyze logs: ./scripts/security-log-analysis.sh
2. Check for lateral movement: ./scripts/network-analysis.sh
3. Assess data exposure: ./scripts/data-impact-assessment.sh
```

#### Scenario 3: Data Corruption
```bash
# Assessment (0-15 minutes)
1. Identify scope: ./scripts/data-integrity-check.sh
2. Stop writes: kubectl scale deployment/nfpa-backend --replicas=0
3. Assess backup options: ./scripts/backup-assessment.sh

# Recovery (15+ minutes)
1. Restore from backup: ./scripts/data-restore.sh
2. Verify integrity: ./scripts/data-verification.sh
3. Resume operations: kubectl scale deployment/nfpa-backend --replicas=5
```

## Compliance and Audit

### Compliance Requirements

#### SOC 2 Type II Compliance
- **Security**: Multi-factor authentication, encryption
- **Availability**: 99.9% uptime, disaster recovery
- **Processing Integrity**: Data validation, error handling
- **Confidentiality**: Access controls, data encryption
- **Privacy**: Data minimization, consent management

#### NIST Cybersecurity Framework
- **Identify**: Asset inventory, risk assessment
- **Protect**: Access control, data protection
- **Detect**: Continuous monitoring, anomaly detection
- **Respond**: Incident response, communications
- **Recover**: Recovery planning, improvements

#### Government Compliance (FISMA/FedRAMP)
- **Security Controls**: 800+ controls implementation
- **Continuous Monitoring**: Automated compliance checking
- **Documentation**: Policy and procedure documentation
- **Training**: Security awareness training

### Audit Procedures

#### Internal Audit Checklist
```bash
# Security audit
./scripts/security-audit.sh --compliance soc2

# Infrastructure audit
./scripts/infrastructure-audit.sh --framework nist

# Data audit
./scripts/data-audit.sh --regulation gdpr

# Access audit
./scripts/access-audit.sh --period quarterly
```

#### External Audit Support
```bash
# Generate audit reports
./scripts/generate-audit-report.sh --period "2024-Q1" --format pdf

# Export compliance evidence
./scripts/export-compliance-evidence.sh --auditor "Ernst & Young"

# Prepare audit environment
./scripts/setup-audit-environment.sh --readonly --timeframe "2024-01-01:2024-03-31"
```

### Continuous Compliance

#### Automated Compliance Monitoring
```yaml
# OPA Gatekeeper policies
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: nfparequiredsecuritycontext
spec:
  crd:
    spec:
      names:
        kind: NFPARequiredSecurityContext
      validation:
        type: object
        properties:
          runAsNonRoot:
            type: boolean
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package nfparequiredsecuritycontext
        
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.securityContext.runAsNonRoot == true
          msg := "Containers must run as non-root user"
        }
```

#### Regular Compliance Reports
- **Weekly**: Security posture dashboard
- **Monthly**: Compliance metrics report
- **Quarterly**: Full compliance assessment
- **Annual**: Third-party security audit

---

## Quick Reference

### Emergency Commands
```bash
# System status
kubectl get pods -A | grep -v Running

# Force scale down
kubectl scale deployment/nfpa-backend --replicas=0 -n nfpa-permit-system

# Emergency failover
./scripts/emergency-failover.sh --target dr-region

# Security lockdown
./scripts/security-lockdown.sh --level critical
```

### Monitoring URLs
- **Main Dashboard**: https://grafana.yourdomain.com/d/nfpa-overview
- **Alerts**: https://alertmanager.yourdomain.com
- **Logs**: https://kibana.yourdomain.com
- **Status Page**: https://status.yourdomain.com

### Support Contacts
- **24/7 Operations**: ops@yourdomain.com
- **Security Team**: security@yourdomain.com  
- **Business Owner**: permits@yourdomain.com
- **Vendor Support**: AWS Enterprise Support

---

*This operations guide is a living document. Please update it as the system evolves and new procedures are established.*
