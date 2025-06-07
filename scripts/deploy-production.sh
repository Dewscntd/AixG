#!/bin/bash

# FootAnalytics Production Deployment Script
# Comprehensive production-grade deployment with zero-downtime

set -euo pipefail

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-footanalytics-cluster}"
REGION="${REGION:-eu-west-1}"
NAMESPACE="${NAMESPACE:-footanalytics}"
ENVIRONMENT="${ENVIRONMENT:-production}"
TERRAFORM_DIR="infrastructure/terraform"
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
    
    local tools=("kubectl" "terraform" "helm" "aws" "jq" "yq")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    
    # Check kubectl context
    if ! kubectl cluster-info &> /dev/null; then
        log_error "kubectl not configured or cluster not accessible"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform
    terraform init -upgrade
    
    # Plan deployment
    terraform plan -out=tfplan
    
    # Apply infrastructure
    terraform apply tfplan
    
    # Wait for cluster to be ready
    log_info "Waiting for EKS cluster to be ready..."
    aws eks wait cluster-active --name "$CLUSTER_NAME" --region "$REGION"
    
    # Update kubeconfig
    aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$REGION"
    
    cd - > /dev/null
    log_success "Infrastructure deployed successfully"
}

# Install ArgoCD
install_argocd() {
    log_info "Installing ArgoCD..."
    
    # Create ArgoCD namespace
    kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
    
    # Install ArgoCD
    kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
    
    # Wait for ArgoCD to be ready
    kubectl wait --for=condition=available --timeout=600s deployment/argocd-server -n argocd
    
    # Get ArgoCD admin password
    ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
    log_info "ArgoCD admin password: $ARGOCD_PASSWORD"
    
    log_success "ArgoCD installed successfully"
}

# Install monitoring stack
install_monitoring() {
    log_info "Installing monitoring stack..."
    
    # Create monitoring namespace
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    
    # Add Helm repositories
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Install Prometheus
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --values "$K8S_DIR/monitoring/prometheus-values.yaml" \
        --wait
    
    # Install custom alerts and SLOs
    kubectl apply -f "$K8S_DIR/monitoring/slo-definitions.yaml"
    kubectl apply -f "$K8S_DIR/monitoring/alerting-rules.yaml"
    
    log_success "Monitoring stack installed successfully"
}

# Install Istio service mesh
install_istio() {
    log_info "Installing Istio service mesh..."
    
    # Download and install Istio
    curl -L https://istio.io/downloadIstio | sh -
    export PATH="$PWD/istio-*/bin:$PATH"
    
    # Install Istio
    istioctl install --set values.defaultRevision=default -y
    
    # Enable Istio injection for application namespaces
    kubectl label namespace "$NAMESPACE" istio-injection=enabled --overwrite
    kubectl label namespace ai-processing istio-injection=enabled --overwrite
    
    log_success "Istio installed successfully"
}

# Install Flagger for canary deployments
install_flagger() {
    log_info "Installing Flagger for canary deployments..."
    
    # Add Flagger Helm repository
    helm repo add flagger https://flagger.app
    helm repo update
    
    # Install Flagger
    helm upgrade --install flagger flagger/flagger \
        --namespace istio-system \
        --set crd.create=false \
        --set meshProvider=istio \
        --set metricsServer=http://prometheus-server.monitoring:80
    
    # Install Flagger Grafana
    helm upgrade --install flagger-grafana flagger/grafana \
        --namespace istio-system
    
    log_success "Flagger installed successfully"
}

# Install Jaeger for distributed tracing
install_jaeger() {
    log_info "Installing Jaeger for distributed tracing..."
    
    # Create Jaeger namespace
    kubectl create namespace jaeger --dry-run=client -o yaml | kubectl apply -f -
    
    # Install Jaeger operator
    kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.49.0/jaeger-operator.yaml -n jaeger
    
    # Wait for operator to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/jaeger-operator -n jaeger
    
    # Deploy Jaeger instance
    kubectl apply -f "$K8S_DIR/jaeger/jaeger-production.yaml"
    
    log_success "Jaeger installed successfully"
}

# Deploy applications
deploy_applications() {
    log_info "Deploying applications..."
    
    # Create application namespace
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace ai-processing --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply base configurations
    kubectl apply -k "$K8S_DIR/overlays/production"
    
    # Wait for deployments to be ready
    kubectl wait --for=condition=available --timeout=600s deployment --all -n "$NAMESPACE"
    kubectl wait --for=condition=available --timeout=600s deployment --all -n ai-processing
    
    log_success "Applications deployed successfully"
}

# Setup chaos engineering
setup_chaos_engineering() {
    log_info "Setting up chaos engineering..."
    
    # Install Litmus
    kubectl apply -f https://litmuschaos.github.io/litmus/litmus-operator-v3.0.0.yaml
    
    # Wait for Litmus to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/chaos-operator-ce -n litmus
    
    # Apply chaos experiments
    kubectl apply -f "$K8S_DIR/chaos-engineering/chaos-experiments.yaml"
    
    log_success "Chaos engineering setup completed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check all pods are running
    local failed_pods=$(kubectl get pods --all-namespaces --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
    if [ "$failed_pods" -gt 0 ]; then
        log_warning "Some pods are not running:"
        kubectl get pods --all-namespaces --field-selector=status.phase!=Running
    fi
    
    # Check services
    kubectl get services -n "$NAMESPACE"
    kubectl get services -n ai-processing
    
    # Check ingresses
    kubectl get ingress -n "$NAMESPACE"
    
    # Run health checks
    log_info "Running health checks..."
    
    # API Gateway health check
    if kubectl get service api-gateway -n "$NAMESPACE" &> /dev/null; then
        kubectl port-forward service/api-gateway 4000:4000 -n "$NAMESPACE" &
        local port_forward_pid=$!
        sleep 5
        
        if curl -f http://localhost:4000/health &> /dev/null; then
            log_success "API Gateway health check passed"
        else
            log_warning "API Gateway health check failed"
        fi
        
        kill $port_forward_pid 2>/dev/null || true
    fi
    
    log_success "Deployment verification completed"
}

# Setup monitoring dashboards
setup_dashboards() {
    log_info "Setting up monitoring dashboards..."
    
    # Apply Grafana dashboards
    kubectl apply -f "$K8S_DIR/grafana/dashboards/"
    
    # Get Grafana admin password
    local grafana_password=$(kubectl get secret --namespace monitoring grafana -o jsonpath="{.data.admin-password}" | base64 --decode)
    log_info "Grafana admin password: $grafana_password"
    
    log_success "Monitoring dashboards setup completed"
}

# Main deployment function
main() {
    log_info "Starting FootAnalytics production deployment..."
    
    check_prerequisites
    
    # Infrastructure deployment
    deploy_infrastructure
    
    # Core platform components
    install_argocd
    install_monitoring
    install_istio
    install_flagger
    install_jaeger
    
    # Application deployment
    deploy_applications
    
    # Additional features
    setup_chaos_engineering
    setup_dashboards
    
    # Verification
    verify_deployment
    
    log_success "🎉 FootAnalytics production deployment completed successfully!"
    
    # Display important information
    echo ""
    echo "=== Deployment Summary ==="
    echo "Cluster: $CLUSTER_NAME"
    echo "Region: $REGION"
    echo "Environment: $ENVIRONMENT"
    echo ""
    echo "=== Access Information ==="
    echo "ArgoCD: kubectl port-forward svc/argocd-server -n argocd 8080:443"
    echo "Grafana: kubectl port-forward svc/grafana -n monitoring 3000:80"
    echo "Jaeger: kubectl port-forward svc/jaeger-query -n jaeger 16686:16686"
    echo ""
    echo "=== Next Steps ==="
    echo "1. Configure DNS records for ingresses"
    echo "2. Setup SSL certificates"
    echo "3. Configure external monitoring alerts"
    echo "4. Run end-to-end tests"
    echo "5. Setup backup and disaster recovery"
}

# Run main function
main "$@"
