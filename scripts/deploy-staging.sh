#!/bin/bash

# FootAnalytics Staging Deployment Script
# Wrapper script for deploying to staging environment

set -euo pipefail

# Set staging environment variables
export ENVIRONMENT="staging"
export CLUSTER_NAME="${CLUSTER_NAME:-footanalytics-staging-cluster}"
export NAMESPACE="${NAMESPACE:-footanalytics-staging}"
export REGION="${REGION:-eu-west-1}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting FootAnalytics Staging Deployment${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Cluster: $CLUSTER_NAME${NC}"
echo -e "${BLUE}Namespace: $NAMESPACE${NC}"
echo -e "${BLUE}Region: $REGION${NC}"
echo ""

# Confirm deployment
read -p "Do you want to proceed with staging deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Run the main deployment script with staging configuration
./scripts/deploy-production.sh

echo -e "${GREEN}✅ Staging deployment completed!${NC}"
echo ""
echo "=== Staging Access Information ==="
echo "ArgoCD: kubectl port-forward svc/argocd-server -n argocd 8080:443"
echo "Grafana: kubectl port-forward svc/grafana -n monitoring 3000:80"
echo "API Gateway: kubectl port-forward svc/api-gateway -n $NAMESPACE 4000:4000"
echo ""
echo "=== Next Steps ==="
echo "1. Run integration tests against staging"
echo "2. Verify all services are healthy"
echo "3. Test key user workflows"
echo "4. Monitor logs and metrics"
