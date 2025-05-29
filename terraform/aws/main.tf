# AWS Production Infrastructure for NFPA Permit System
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC for isolation
resource "aws_vpc" "nfpa_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "nfpa-permit-vpc"
    Environment = "production"
  }
}

# Public subnets for load balancers
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.nfpa_vpc.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  map_public_ip_on_launch = true

  tags = {
    Name = "nfpa-public-${count.index + 1}"
  }
}

# Private subnets for application servers
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.nfpa_vpc.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "nfpa-private-${count.index + 1}"
  }
}

# EKS Cluster for containerized deployment
resource "aws_eks_cluster" "nfpa_cluster" {
  name     = "nfpa-permit-cluster"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  encryption_config {
    provider {
      key_arn = aws_kms_key.nfpa_key.arn
    }
    resources = ["secrets"]
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
  ]
}

# RDS for application database
resource "aws_db_instance" "nfpa_db" {
  identifier = "nfpa-permit-db"
  
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.nfpa_key.arn
  
  db_name  = "nfpa_permits"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.nfpa.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "nfpa-final-snapshot"

  tags = {
    Name = "nfpa-permit-database"
  }
}

# ElastiCache Redis for session management
resource "aws_elasticache_subnet_group" "nfpa_cache" {
  name       = "nfpa-cache-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "nfpa_redis" {
  replication_group_id       = "nfpa-redis"
  description                = "Redis cluster for NFPA permit system"
  
  node_type                  = "cache.t3.micro"
  port                       = 6379
  parameter_group_name       = "default.redis7"
  
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  subnet_group_name = aws_elasticache_subnet_group.nfpa_cache.name
  security_group_ids = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.redis_auth_token
  
  tags = {
    Name = "nfpa-redis-cluster"
  }
}

# Application Load Balancer
resource "aws_lb" "nfpa_alb" {
  name               = "nfpa-permit-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = true

  tags = {
    Name = "nfpa-permit-load-balancer"
  }
}

# S3 bucket for document storage
resource "aws_s3_bucket" "nfpa_documents" {
  bucket = "nfpa-permit-documents-${random_string.bucket_suffix.result}"

  tags = {
    Name = "nfpa-permit-documents"
  }
}

resource "aws_s3_bucket_encryption" "nfpa_documents" {
  bucket = aws_s3_bucket.nfpa_documents.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.nfpa_key.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

# CloudWatch for monitoring
resource "aws_cloudwatch_log_group" "nfpa_logs" {
  name              = "/aws/eks/nfpa-permit-cluster"
  retention_in_days = 30
  kms_key_id       = aws_kms_key.nfpa_key.arn

  tags = {
    Name = "nfpa-permit-logs"
  }
}

# Security Groups
resource "aws_security_group" "alb" {
  name_prefix = "nfpa-alb-"
  vpc_id      = aws_vpc.nfpa_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "nfpa-rds-"
  vpc_id      = aws_vpc.nfpa_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }
}

resource "aws_security_group" "redis" {
  name_prefix = "nfpa-redis-"
  vpc_id      = aws_vpc.nfpa_vpc.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  default     = "us-east-1"
}

variable "db_username" {
  description = "Database username"
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  sensitive   = true
}

variable "redis_auth_token" {
  description = "Redis authentication token"
  sensitive   = true
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Outputs
output "cluster_endpoint" {
  value = aws_eks_cluster.nfpa_cluster.endpoint
}

output "database_endpoint" {
  value = aws_db_instance.nfpa_db.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.nfpa_redis.configuration_endpoint_address
}

output "load_balancer_dns" {
  value = aws_lb.nfpa_alb.dns_name
}
