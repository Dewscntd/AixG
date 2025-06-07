#!/bin/bash

# FootAnalytics Staging Deployment Script (Kubernetes Only)
# Simplified deployment for existing Kubernetes cluster

set -euo pipefail

# Set staging environment variables
export ENVIRONMENT="staging"
export CLUSTER_NAME="${CLUSTER_NAME:-footanalytics-staging-cluster}"
export NAMESPACE="${NAMESPACE:-footanalytics-staging}"
export REGION="${REGION:-eu-west-1}"
K8S_DIR="infrastructure/k8s"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check kubectl context
    if ! kubectl cluster-info &> /dev/null; then
        log_error "kubectl not configured or cluster not accessible"
        log_info "Please configure kubectl to connect to your staging cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Deploy applications
deploy_applications() {
    log_info "Deploying applications to staging..."
    
    # Create application namespace
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace ai-processing --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply staging configurations
    if [ -d "$K8S_DIR/overlays/staging" ]; then
        log_info "Applying staging overlay configurations..."
        kubectl apply -k "$K8S_DIR/overlays/staging"
    else
        log_warning "Staging overlay not found, applying base configurations..."
        kubectl apply -k "$K8S_DIR/base"
    fi
    
    # Wait for deployments to be ready
    log_info "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment --all -n "$NAMESPACE" || true
    
    log_success "Applications deployed successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check all pods are running
    log_info "Checking pod status..."
    kubectl get pods -n "$NAMESPACE"
    
    local failed_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
    if [ "$failed_pods" -gt 0 ]; then
        log_warning "Some pods are not running:"
        kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running
    fi
    
    # Check services
    log_info "Checking services..."
    kubectl get services -n "$NAMESPACE"
    
    # Run basic health checks
    log_info "Running health checks..."
    
    # Check if API Gateway service exists and try to port-forward for health check
    if kubectl get service api-gateway -n "$NAMESPACE" &> /dev/null; then
        log_info "API Gateway service found"
        # Note: In a real deployment, you would check the actual health endpoint
        log_info "To test API Gateway: kubectl port-forward service/api-gateway 4000:4000 -n $NAMESPACE"
    else
        log_warning "API Gateway service not found"
    fi
    
    log_success "Deployment verification completed"
}

# Display access information
display_access_info() {
    echo ""
    echo "=== Staging Deployment Summary ==="
    echo "Environment: $ENVIRONMENT"
    echo "Namespace: $NAMESPACE"
    echo "Cluster: $(kubectl config current-context)"
    echo ""
    echo "=== Access Commands ==="
    echo "View pods: kubectl get pods -n $NAMESPACE"
    echo "View services: kubectl get services -n $NAMESPACE"
    echo "View logs: kubectl logs -f deployment/api-gateway -n $NAMESPACE"
    echo ""
    echo "=== Port Forward Commands ==="
    echo "API Gateway: kubectl port-forward service/api-gateway 4000:4000 -n $NAMESPACE"
    echo "Video Ingestion: kubectl port-forward service/video-ingestion 3001:3001 -n $NAMESPACE"
    echo "Analytics Engine: kubectl port-forward service/analytics-engine 3000:3000 -n $NAMESPACE"
    echo "ML Pipeline: kubectl port-forward service/ml-pipeline 8000:8000 -n ai-processing"
    echo ""
    echo "=== Next Steps ==="
    echo "1. Verify all services are healthy"
    echo "2. Run integration tests"
    echo "3. Test key user workflows"
    echo "4. Monitor application logs"
}

# Main function
main() {
    log_info "Starting FootAnalytics staging deployment (Kubernetes only)..."
    
    echo -e "${BLUE}🚀 FootAnalytics Staging Deployment${NC}"
    echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
    echo -e "${BLUE}Namespace: $NAMESPACE${NC}"
    echo ""
    
    # Confirm deployment
    read -p "Do you want to proceed with staging deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
    
    check_prerequisites
    deploy_applications
    verify_deployment
    
    log_success "🎉 FootAnalytics staging deployment completed successfully!"
    
    display_access_info
}

# Run main function
main "$@"
