# FootAnalytics Production Deployment Guide

## 🎯 Overview

This guide provides comprehensive instructions for deploying FootAnalytics platform to production with enterprise-grade reliability, observability, and security.

## 🏗️ Architecture Overview

### Core Components
- **GitOps with ArgoCD**: Declarative deployment management
- **Canary Deployments**: Progressive delivery with Flagger
- **Feature Flags**: Runtime configuration with Flagsmith
- **Distributed Tracing**: End-to-end observability with Jaeger
- **Comprehensive Monitoring**: SLO-based alerting with Prometheus/Grafana
- **Incident Response**: Automated escalation with PagerDuty
- **Chaos Engineering**: Resilience testing with Litmus

### Infrastructure Stack
- **Kubernetes**: Container orchestration (EKS)
- **Istio**: Service mesh for traffic management
- **Terraform**: Infrastructure as Code
- **GitHub Actions**: CI/CD pipeline
- **AWS**: Cloud provider

## 🚀 Quick Start

### Prerequisites

1. **Tools Installation**
   ```bash
   # Install required tools
   brew install kubectl terraform helm aws-cli jq yq
   
   # Install ArgoCD CLI
   brew install argocd
   
   # Install Istio CLI
   curl -L https://istio.io/downloadIstio | sh -
   ```

2. **AWS Configuration**
   ```bash
   aws configure
   # Set your AWS credentials and region
   ```

3. **Environment Variables**
   ```bash
   export CLUSTER_NAME="footanalytics-cluster"
   export REGION="eu-west-1"
   export ENVIRONMENT="production"
   ```

### Automated Deployment

```bash
# Run the automated deployment script
./scripts/deploy-production.sh
```

## 📋 Manual Deployment Steps

### 1. Infrastructure Deployment

```bash
# Navigate to Terraform directory
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -out=tfplan

# Apply infrastructure
terraform apply tfplan

# Update kubeconfig
aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION
```

### 2. Core Platform Installation

#### ArgoCD (GitOps)
```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for deployment
kubectl wait --for=condition=available --timeout=600s deployment/argocd-server -n argocd

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

#### Monitoring Stack
```bash
# Add Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Prometheus stack
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values infrastructure/k8s/monitoring/prometheus-values.yaml

# Apply SLO definitions and alerts
kubectl apply -f infrastructure/k8s/monitoring/slo-definitions.yaml
kubectl apply -f infrastructure/k8s/monitoring/alerting-rules.yaml
```

#### Service Mesh (Istio)
```bash
# Install Istio
istioctl install --set values.defaultRevision=default -y

# Enable injection for application namespaces
kubectl label namespace footanalytics istio-injection=enabled
kubectl label namespace ai-processing istio-injection=enabled
```

#### Canary Deployments (Flagger)
```bash
# Install Flagger
helm repo add flagger https://flagger.app
helm upgrade --install flagger flagger/flagger \
  --namespace istio-system \
  --set meshProvider=istio \
  --set metricsServer=http://prometheus-server.monitoring:80
```

### 3. Application Deployment

```bash
# Deploy applications using Kustomize
kubectl apply -k infrastructure/k8s/overlays/production

# Verify deployments
kubectl get deployments -n footanalytics
kubectl get deployments -n ai-processing
```

## 🔍 Monitoring & Observability

### SLO/SLI Definitions

| Service | SLI | SLO Target | Window |
|---------|-----|------------|--------|
| Platform | Availability | 99.9% | 30d |
| API Gateway | P95 Latency | <200ms | 30d |
| ML Pipeline | P99 Latency | <2s | 30d |
| Video Processing | Success Rate | 95% | 30d |

### Key Metrics

#### Platform Health
- **Request Success Rate**: `(non-5xx responses / total responses) * 100`
- **Response Time P95**: `histogram_quantile(0.95, http_request_duration_seconds_bucket)`
- **Error Budget Burn Rate**: `(1 - SLI) / (1 - SLO_target)`

#### ML Pipeline
- **Inference Latency**: `histogram_quantile(0.99, ml_inference_duration_seconds_bucket)`
- **GPU Utilization**: `avg(nvidia_gpu_utilization_gpu)`
- **Model Accuracy**: `avg(ml_model_accuracy_score) * 100`

### Dashboards

1. **Platform Overview**: High-level health and performance metrics
2. **ML Pipeline**: GPU utilization, inference latency, model accuracy
3. **Infrastructure**: Node health, resource utilization, storage
4. **Business Metrics**: User sessions, video uploads, analytics generation

### Alerting

#### Critical Alerts
- Platform availability < 99%
- API response time > 200ms
- ML inference latency > 2s
- High error rate > 5%
- Node not ready
- Pod crash looping

#### Warning Alerts
- Platform availability < 99.5%
- High memory/CPU usage
- GPU utilization outside optimal range
- Slow analytics generation

## 🚢 Deployment Strategies

### Canary Deployments

Flagger automatically manages canary deployments with the following configuration:

```yaml
analysis:
  interval: 1m
  threshold: 5
  maxWeight: 50
  stepWeight: 10
  metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
    - name: request-duration
      thresholdRange:
        max: 200
```

### Blue-Green Deployments

For critical updates, use blue-green deployments:

```bash
# Deploy to green environment
kubectl apply -k infrastructure/k8s/overlays/green

# Switch traffic
kubectl patch service api-gateway -p '{"spec":{"selector":{"version":"green"}}}'
```

## 🔧 Feature Flags

### Flagsmith Configuration

Access Flagsmith at: `https://flags.footanalytics.com`

#### Key Feature Flags
- `ml_model_v2_enabled`: Enable new ML model version
- `advanced_analytics_enabled`: Enable advanced analytics features
- `real_time_processing_enabled`: Enable real-time video processing
- `gpu_optimization_enabled`: Enable GPU optimization features

### Usage in Code

```typescript
// Frontend (React)
import { useFlags } from '@flagsmith/react';

const { ml_model_v2_enabled } = useFlags(['ml_model_v2_enabled']);

// Backend (Node.js)
import Flagsmith from 'flagsmith-nodejs';

const flags = await Flagsmith.getEnvironmentFlags();
const isEnabled = flags.isFeatureEnabled('ml_model_v2_enabled');
```

## 🔄 GitOps Workflow

### Repository Structure
```
gitops-config/
├── applications/
│   ├── api-gateway.yaml
│   ├── ml-pipeline.yaml
│   └── analytics-engine.yaml
├── overlays/
│   ├── staging/
│   └── production/
└── base/
    ├── deployments/
    ├── services/
    └── configmaps/
```

### Deployment Process

1. **Code Changes**: Developers push to feature branches
2. **CI Pipeline**: Automated testing and image building
3. **GitOps Update**: CI updates image tags in GitOps repository
4. **ArgoCD Sync**: ArgoCD detects changes and deploys
5. **Canary Analysis**: Flagger performs progressive rollout
6. **Monitoring**: Continuous monitoring and alerting

## 🚨 Incident Response

### Escalation Policy

1. **L1 - Platform Engineer** (5 min response)
2. **L2 - Tech Lead** (15 min escalation)
3. **L3 - CTO** (30 min escalation)

### Runbooks

Critical incident runbooks are available at:
- High CPU Usage: `/runbooks/high-cpu-runbook.md`
- Memory Issues: `/runbooks/high-memory-runbook.md`
- Pod Crashes: `/runbooks/pod-crashloop-runbook.md`
- ML Failures: `/runbooks/ml-inference-failure-runbook.md`
- Database Issues: `/runbooks/database-connection-runbook.md`

### Automated Response

PagerDuty integration provides:
- Automatic incident creation
- Escalation management
- Status page updates
- Post-incident analysis

## 🧪 Chaos Engineering

### Scheduled Experiments

Chaos experiments run automatically:
- **Schedule**: Monday-Friday, 2:00-4:00 AM UTC
- **Frequency**: Every 8 hours during maintenance window
- **Types**: Pod deletion, CPU/memory stress, network latency

### Manual Testing

```bash
# Run pod deletion experiment
kubectl apply -f infrastructure/k8s/chaos-engineering/pod-delete-experiment.yaml

# Monitor experiment
kubectl get chaosengine -n footanalytics

# View results
kubectl describe chaosresult -n footanalytics
```

## 🔐 Security

### Network Policies
- Ingress/egress traffic restrictions
- Namespace isolation
- Service-to-service communication control

### RBAC
- Role-based access control
- Service account permissions
- ArgoCD project-level access

### Secrets Management
- Kubernetes secrets for sensitive data
- External secrets operator integration
- Rotation policies

## 📊 Performance Optimization

### Resource Limits
```yaml
resources:
  limits:
    cpu: 2000m
    memory: 4Gi
    nvidia.com/gpu: 1
  requests:
    cpu: 1000m
    memory: 2Gi
```

### Horizontal Pod Autoscaling
```yaml
minReplicas: 2
maxReplicas: 10
targetCPUUtilizationPercentage: 70
targetMemoryUtilizationPercentage: 80
```

### GPU Optimization
- Model quantization with TensorRT
- Batch processing optimization
- Memory pool management

## 🔄 Backup & Disaster Recovery

### Database Backups
- Automated daily backups
- Point-in-time recovery
- Cross-region replication

### Application State
- Persistent volume snapshots
- Configuration backup
- Secrets backup

### Recovery Procedures
- RTO: 4 hours
- RPO: 1 hour
- Multi-region failover capability

## 📈 Scaling

### Horizontal Scaling
- HPA for CPU/memory-based scaling
- Custom metrics scaling (GPU utilization)
- Predictive scaling based on usage patterns

### Vertical Scaling
- VPA for automatic resource adjustment
- Node auto-scaling
- GPU node pools

## 🔍 Troubleshooting

### Common Issues

1. **Pod Stuck in Pending**
   ```bash
   kubectl describe pod <pod-name> -n <namespace>
   # Check resource constraints and node capacity
   ```

2. **Service Unavailable**
   ```bash
   kubectl get endpoints <service-name> -n <namespace>
   # Verify pod readiness and service selector
   ```

3. **High Latency**
   ```bash
   # Check Istio metrics
   kubectl exec -n istio-system deployment/istiod -- pilot-discovery request GET /debug/endpointz
   ```

### Debugging Commands

```bash
# View logs
kubectl logs -f deployment/api-gateway -n footanalytics

# Port forward for local access
kubectl port-forward service/api-gateway 4000:4000 -n footanalytics

# Execute commands in pod
kubectl exec -it deployment/ml-pipeline -n ai-processing -- /bin/bash

# Check resource usage
kubectl top pods -n footanalytics
kubectl top nodes
```

## 📞 Support

For production issues:
- **Critical**: PagerDuty escalation
- **Non-critical**: Slack #footanalytics-support
- **Documentation**: Internal wiki
- **Runbooks**: `/docs/runbooks/`

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
**Maintainer**: Platform Engineering Team
