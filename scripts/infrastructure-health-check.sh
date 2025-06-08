#!/bin/bash

# Infrastructure Health Check Script for FootAnalytics Platform
# Performs comprehensive health checks across all infrastructure components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE=${NAMESPACE:-"footanalytics"}
MONITORING_NAMESPACE=${MONITORING_NAMESPACE:-"monitoring"}
TIMEOUT=${TIMEOUT:-30}
VERBOSE=${VERBOSE:-false}

# Health check results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((PASSED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    ((WARNING_CHECKS++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((FAILED_CHECKS++))
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Kubernetes connectivity
check_kubernetes_connectivity() {
    log_info "Checking Kubernetes connectivity..."
    ((TOTAL_CHECKS++))
    
    if ! command_exists kubectl; then
        log_error "kubectl not found. Please install kubectl."
        return 1
    fi
    
    if kubectl cluster-info >/dev/null 2>&1; then
        log_success "Kubernetes cluster is accessible"
    else
        log_error "Cannot connect to Kubernetes cluster"
        return 1
    fi
}

# Check namespace existence
check_namespaces() {
    log_info "Checking required namespaces..."
    
    local namespaces=("$NAMESPACE" "$MONITORING_NAMESPACE" "istio-system" "jaeger" "flagger-system")
    
    for ns in "${namespaces[@]}"; do
        ((TOTAL_CHECKS++))
        if kubectl get namespace "$ns" >/dev/null 2>&1; then
            log_success "Namespace $ns exists"
        else
            log_error "Namespace $ns does not exist"
        fi
    done
}

# Check pod health
check_pod_health() {
    log_info "Checking pod health in namespace $NAMESPACE..."
    
    local pods
    pods=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    if [ -z "$pods" ]; then
        log_warning "No pods found in namespace $NAMESPACE"
        return 0
    fi
    
    for pod in $pods; do
        ((TOTAL_CHECKS++))
        local status
        status=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
        
        case $status in
            "Running")
                # Check if all containers are ready
                local ready_containers
                local total_containers
                ready_containers=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.containerStatuses[?(@.ready==true)]}' | jq '. | length' 2>/dev/null || echo "0")
                total_containers=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.containerStatuses}' | jq '. | length' 2>/dev/null || echo "1")
                
                if [ "$ready_containers" -eq "$total_containers" ]; then
                    log_success "Pod $pod is running and ready"
                else
                    log_warning "Pod $pod is running but not all containers are ready ($ready_containers/$total_containers)"
                fi
                ;;
            "Pending")
                log_warning "Pod $pod is pending"
                ;;
            "Failed"|"CrashLoopBackOff"|"Error")
                log_error "Pod $pod is in failed state: $status"
                ;;
            *)
                log_warning "Pod $pod has unknown status: $status"
                ;;
        esac
    done
}

# Check service health
check_service_health() {
    log_info "Checking service health in namespace $NAMESPACE..."
    
    local services
    services=$(kubectl get services -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    if [ -z "$services" ]; then
        log_warning "No services found in namespace $NAMESPACE"
        return 0
    fi
    
    for service in $services; do
        ((TOTAL_CHECKS++))
        local endpoints
        endpoints=$(kubectl get endpoints "$service" -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null || echo "")
        
        if [ -n "$endpoints" ]; then
            log_success "Service $service has endpoints"
        else
            log_error "Service $service has no endpoints"
        fi
    done
}

# Check ingress health
check_ingress_health() {
    log_info "Checking ingress health..."
    
    local ingresses
    ingresses=$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    if [ -z "$ingresses" ]; then
        log_warning "No ingresses found in namespace $NAMESPACE"
        return 0
    fi
    
    for ingress in $ingresses; do
        ((TOTAL_CHECKS++))
        local load_balancer
        load_balancer=$(kubectl get ingress "$ingress" -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
        
        if [ -n "$load_balancer" ]; then
            log_success "Ingress $ingress has load balancer IP: $load_balancer"
        else
            log_warning "Ingress $ingress has no load balancer IP assigned"
        fi
    done
}

# Check persistent volume claims
check_pvc_health() {
    log_info "Checking PVC health in namespace $NAMESPACE..."
    
    local pvcs
    pvcs=$(kubectl get pvc -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    if [ -z "$pvcs" ]; then
        log_info "No PVCs found in namespace $NAMESPACE"
        return 0
    fi
    
    for pvc in $pvcs; do
        ((TOTAL_CHECKS++))
        local status
        status=$(kubectl get pvc "$pvc" -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
        
        if [ "$status" = "Bound" ]; then
            log_success "PVC $pvc is bound"
        else
            log_error "PVC $pvc is not bound (status: $status)"
        fi
    done
}

# Check monitoring stack
check_monitoring_stack() {
    log_info "Checking monitoring stack in namespace $MONITORING_NAMESPACE..."
    
    local monitoring_components=("prometheus" "grafana" "alertmanager")
    
    for component in "${monitoring_components[@]}"; do
        ((TOTAL_CHECKS++))
        local pods
        pods=$(kubectl get pods -n "$MONITORING_NAMESPACE" -l "app.kubernetes.io/name=$component" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
        
        if [ -n "$pods" ]; then
            local running_pods=0
            for pod in $pods; do
                local status
                status=$(kubectl get pod "$pod" -n "$MONITORING_NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
                if [ "$status" = "Running" ]; then
                    ((running_pods++))
                fi
            done
            
            if [ $running_pods -gt 0 ]; then
                log_success "$component is running ($running_pods pods)"
            else
                log_error "$component has no running pods"
            fi
        else
            log_error "$component not found in monitoring namespace"
        fi
    done
}

# Check Istio service mesh
check_istio_health() {
    log_info "Checking Istio service mesh..."
    
    ((TOTAL_CHECKS++))
    if kubectl get namespace istio-system >/dev/null 2>&1; then
        local istio_pods
        istio_pods=$(kubectl get pods -n istio-system -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}' 2>/dev/null || echo "")
        
        if [ -n "$istio_pods" ]; then
            local pod_count
            pod_count=$(echo "$istio_pods" | wc -w)
            log_success "Istio is running with $pod_count pods"
        else
            log_error "Istio pods are not running"
        fi
    else
        log_warning "Istio namespace not found"
    fi
}

# Check resource usage
check_resource_usage() {
    log_info "Checking cluster resource usage..."
    
    ((TOTAL_CHECKS++))
    if command_exists kubectl && kubectl top nodes >/dev/null 2>&1; then
        local node_usage
        node_usage=$(kubectl top nodes --no-headers 2>/dev/null || echo "")
        
        if [ -n "$node_usage" ]; then
            log_success "Node metrics are available"
            
            if [ "$VERBOSE" = "true" ]; then
                echo "$node_usage" | while read -r line; do
                    log_info "Node usage: $line"
                done
            fi
        else
            log_warning "Node metrics are not available"
        fi
    else
        log_warning "Cannot retrieve node metrics (metrics-server may not be installed)"
    fi
}

# Check external dependencies
check_external_dependencies() {
    log_info "Checking external dependencies..."
    
    # Check if we can resolve DNS
    ((TOTAL_CHECKS++))
    if nslookup google.com >/dev/null 2>&1; then
        log_success "DNS resolution is working"
    else
        log_error "DNS resolution is not working"
    fi
    
    # Check internet connectivity
    ((TOTAL_CHECKS++))
    if curl -s --max-time 10 https://google.com >/dev/null 2>&1; then
        log_success "Internet connectivity is working"
    else
        log_warning "Internet connectivity may be limited"
    fi
}

# Generate health report
generate_health_report() {
    echo ""
    echo "=================================="
    echo "Infrastructure Health Check Report"
    echo "=================================="
    echo "Total Checks: $TOTAL_CHECKS"
    echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
    echo -e "Warnings: ${YELLOW}$WARNING_CHECKS${NC}"
    echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
    echo ""
    
    local success_rate
    success_rate=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        if [ $WARNING_CHECKS -eq 0 ]; then
            echo -e "${GREEN}✓ All checks passed! Infrastructure is healthy.${NC}"
        else
            echo -e "${YELLOW}⚠ Infrastructure is mostly healthy with some warnings.${NC}"
        fi
    else
        echo -e "${RED}✗ Infrastructure has issues that need attention.${NC}"
    fi
    
    echo "Success Rate: $success_rate%"
    echo ""
}

# Main execution
main() {
    echo "Starting FootAnalytics Infrastructure Health Check..."
    echo "Namespace: $NAMESPACE"
    echo "Monitoring Namespace: $MONITORING_NAMESPACE"
    echo ""
    
    check_kubernetes_connectivity
    check_namespaces
    check_pod_health
    check_service_health
    check_ingress_health
    check_pvc_health
    check_monitoring_stack
    check_istio_health
    check_resource_usage
    check_external_dependencies
    
    generate_health_report
    
    # Exit with appropriate code
    if [ $FAILED_CHECKS -gt 0 ]; then
        exit 1
    elif [ $WARNING_CHECKS -gt 0 ]; then
        exit 2
    else
        exit 0
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -m|--monitoring-namespace)
            MONITORING_NAMESPACE="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -n, --namespace NAMESPACE              Application namespace (default: footanalytics)"
            echo "  -m, --monitoring-namespace NAMESPACE   Monitoring namespace (default: monitoring)"
            echo "  -t, --timeout SECONDS                  Timeout for operations (default: 30)"
            echo "  -v, --verbose                          Verbose output"
            echo "  -h, --help                             Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main
