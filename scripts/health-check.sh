#!/bin/bash
echo "🏥 Checking system health..."
kubectl cluster-info
kubectl get nodes
kubectl get pods -A | grep -v Running | head -10
echo "✅ Health check completed"

