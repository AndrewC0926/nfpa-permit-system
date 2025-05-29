#!/bin/bash
echo "🔍 Checking prerequisites..."
command -v terraform >/dev/null 2>&1 || { echo "❌ Terraform required but not installed"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "❌ kubectl required but not installed"; exit 1; }
command -v helm >/dev/null 2>&1 || { echo "❌ Helm required but not installed"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI required but not installed"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker required but not installed"; exit 1; }
echo "✅ All prerequisites met"
