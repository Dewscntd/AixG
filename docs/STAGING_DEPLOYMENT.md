# FootAnalytics Staging Deployment Guide

This guide covers deploying FootAnalytics to a staging environment for testing and validation before production deployment.

## Overview

The staging environment is designed to closely mirror production while being cost-optimized and suitable for testing. Key differences from production:

- **Reduced resource allocation** - Smaller instance types and fewer replicas
- **Debug logging enabled** - Enhanced logging for troubleshooting
- **No GPU requirements** - ML Pipeline runs on CPU for cost savings
- **Relaxed security policies** - Easier access for testing
- **Development tools enabled** - GraphQL playground, introspection

## Prerequisites

### Required Tools
- `kubectl` - Kubernetes command-line tool
- `terraform` - Infrastructure as Code (for full deployment)
- `helm` - Kubernetes package manager (for full deployment)
- `aws` CLI - AWS command-line interface (for AWS deployments)

### Cluster Access
Ensure you have access to a Kubernetes cluster configured for staging:
```bash
kubectl cluster-info
kubectl get nodes
```

## Deployment Options

### Option 1: Kubernetes-Only Deployment (Recommended for Testing)

Deploy to an existing Kubernetes cluster:

```bash
# Quick deployment to existing cluster
./scripts/deploy-staging-k8s-only.sh
```

### Option 2: Full Infrastructure + Application Deployment

Deploy complete infrastructure and applications:

```bash
# Full deployment with infrastructure provisioning
./scripts/deploy-staging.sh
```

### Option 3: Dry Run (Preview Only)

See what would be deployed without making changes:

```bash
# Preview deployment plan
./scripts/deploy-staging-dry-run.sh
```

## Staging Configuration

### Environment Variables

The staging deployment uses these key environment variables:

```bash
ENVIRONMENT=staging
CLUSTER_NAME=footanalytics-staging-cluster
NAMESPACE=footanalytics-staging
REGION=eu-west-1
```

### Resource Allocation

| Component | Production | Staging |
|-----------|------------|---------|
| API Gateway | 5 replicas | 2 replicas |
| Video Ingestion | 3 replicas | 1 replica |
| Analytics Engine | 3 replicas | 1 replica |
| ML Pipeline | 3 replicas + GPU | 1 replica, CPU only |

### Configuration Differences

- **Logging**: Debug level enabled
- **GraphQL**: Playground and introspection enabled
- **CORS**: Permissive settings for testing
- **Rate Limiting**: Relaxed limits
- **File Size**: Reduced maximum upload size (5GB vs 10GB)
- **Batch Processing**: Smaller batch sizes for faster feedback

## Post-Deployment Verification

### 1. Check Pod Status
```bash
kubectl get pods -n footanalytics-staging
```

### 2. Verify Services
```bash
kubectl get services -n footanalytics-staging
```

### 3. Access Applications

#### API Gateway
```bash
kubectl port-forward service/api-gateway 4000:4000 -n footanalytics-staging
curl http://localhost:4000/health
```

#### Video Ingestion Service
```bash
kubectl port-forward service/video-ingestion 3001:3001 -n footanalytics-staging
curl http://localhost:3001/health
```

#### Analytics Engine
```bash
kubectl port-forward service/analytics-engine 3000:3000 -n footanalytics-staging
curl http://localhost:3000/health
```

#### ML Pipeline
```bash
kubectl port-forward service/ml-pipeline 8000:8000 -n ai-processing
curl http://localhost:8000/health
```

### 4. View Logs
```bash
# API Gateway logs
kubectl logs -f deployment/api-gateway -n footanalytics-staging

# All services logs
kubectl logs -f -l app.kubernetes.io/part-of=footanalytics -n footanalytics-staging
```

## Testing Workflows

### 1. Integration Tests
```bash
# Run integration test suite against staging
npm run test:integration:staging
```

### 2. End-to-End Tests
```bash
# Run E2E tests
npm run test:e2e:staging
```

### 3. Performance Tests
```bash
# Run performance tests with reduced load
npm run test:performance:staging
```

## Monitoring and Observability

### Grafana Dashboards
```bash
kubectl port-forward svc/grafana 3000:80 -n monitoring
# Access: http://localhost:3000
```

### Prometheus Metrics
```bash
kubectl port-forward svc/prometheus-server 9090:80 -n monitoring
# Access: http://localhost:9090
```

### Jaeger Tracing
```bash
kubectl port-forward svc/jaeger-query 16686:16686 -n jaeger
# Access: http://localhost:16686
```

## Troubleshooting

### Common Issues

#### Pods Not Starting
```bash
# Check pod events
kubectl describe pod <pod-name> -n footanalytics-staging

# Check resource constraints
kubectl top pods -n footanalytics-staging
```

#### Service Connection Issues
```bash
# Check service endpoints
kubectl get endpoints -n footanalytics-staging

# Test internal connectivity
kubectl exec -it deployment/api-gateway -n footanalytics-staging -- curl http://analytics-engine:3000/health
```

#### Configuration Issues
```bash
# Check ConfigMaps
kubectl get configmaps -n footanalytics-staging

# Check Secrets
kubectl get secrets -n footanalytics-staging
```

### Debug Commands

```bash
# Get all resources in staging namespace
kubectl get all -n footanalytics-staging

# Describe deployment for detailed info
kubectl describe deployment api-gateway -n footanalytics-staging

# Execute commands in pods
kubectl exec -it deployment/api-gateway -n footanalytics-staging -- /bin/bash
```

## Cleanup

### Remove Staging Deployment
```bash
# Delete staging namespace and all resources
kubectl delete namespace footanalytics-staging

# Delete AI processing namespace
kubectl delete namespace ai-processing
```

### Remove Infrastructure (if using full deployment)
```bash
cd infrastructure/terraform
terraform destroy -var="environment=staging"
```

## Security Considerations

- Staging uses relaxed security policies for easier testing
- Secrets should still use proper secret management
- Network policies provide basic pod-to-pod security
- Consider using separate AWS accounts for staging and production

## Cost Optimization

- Reduced replica counts
- Smaller instance types
- No GPU allocation for ML Pipeline
- Automatic scaling based on load
- Consider using spot instances for non-critical components

## Next Steps

After successful staging deployment:

1. ✅ Verify all services are healthy
2. ✅ Run comprehensive test suites
3. ✅ Validate key user workflows
4. ✅ Monitor performance and resource usage
5. ✅ Test disaster recovery procedures
6. ✅ Validate monitoring and alerting
7. ✅ Prepare for production deployment
