# Feature Flags with Flagsmith

## 🎯 **Overview**

Flagsmith provides runtime configuration management for FootAnalytics platform, enabling feature toggles, A/B testing, and gradual feature rollouts without code deployments.

## 🏗️ **Architecture**

### Components
- **Flagsmith API**: Core feature flag service
- **PostgreSQL**: Feature flag configuration storage
- **Redis**: Caching layer for performance
- **Flagsmith UI**: Web interface for flag management
- **SDKs**: Client libraries for applications

### Feature Flag Workflow
```mermaid
graph TD
    A[Developer] --> B[Create Feature Flag]
    B --> C[Flagsmith UI]
    C --> D[PostgreSQL Storage]
    D --> E[Redis Cache]
    E --> F[Application SDK]
    F --> G[Feature Evaluation]
    G --> H[User Experience]
    H --> I[Analytics]
    I --> J[Flag Optimization]
```

## 🚀 **Installation & Configuration**

### Prerequisites
- Kubernetes cluster
- PostgreSQL database
- Redis cache
- Ingress controller

### Installation Steps

#### 1. Deploy using Terraform
```bash
cd infrastructure/terraform
terraform apply -target=module.feature_flags
```

#### 2. Verify Installation
```bash
# Check Flagsmith pods
kubectl get pods -n feature-flags

# Check services
kubectl get services -n feature-flags

# Check ingress
kubectl get ingress -n feature-flags
```

#### 3. Access Flagsmith UI
```bash
# Port forward for local access
kubectl port-forward svc/flagsmith -n feature-flags 8000:8000

# Access UI at http://localhost:8000
# Default credentials: admin / (check secret)
```

### Configuration Files

#### Flagsmith Deployment
<augment_code_snippet path="infrastructure/terraform/modules/feature-flags/main.tf" mode="EXCERPT">
````terraform
# Flagsmith Deployment
resource "kubernetes_deployment" "flagsmith" {
  metadata {
    name      = "flagsmith"
    namespace = kubernetes_namespace.feature_flags.metadata[0].name
  }

  spec {
    replicas = 3

    template {
      spec {
        container {
          name  = "flagsmith"
          image = "flagsmith/flagsmith:2.77.0"

          env {
            name  = "DJANGO_ALLOWED_HOSTS"
            value = "*"
          }

          env {
            name  = "DATABASE_URL"
            value = "postgresql://postgres:${var.postgres_password}@flagsmith-postgres:5432/flagsmith"
          }
````
</augment_code_snippet>

## 🔧 **Feature Flag Management**

### Creating Feature Flags

#### Using Flagsmith UI
1. **Login** to Flagsmith dashboard
2. **Navigate** to Features section
3. **Create** new feature flag
4. **Configure** targeting rules
5. **Enable** for environments

#### Using API
```bash
# Create feature flag via API
curl -X POST "https://flags.footanalytics.com/api/v1/features/" \
  -H "Authorization: Api-Key YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ml_model_v2_enabled",
    "description": "Enable ML model version 2",
    "project": 1,
    "initial_value": "false",
    "default_enabled": false
  }'
```

### Key Feature Flags

#### ML Pipeline Flags
```yaml
# ML Model Version Control
ml_model_v2_enabled:
  description: "Enable new ML model version"
  type: boolean
  default: false
  environments:
    staging: true
    production: false

# GPU Optimization
gpu_optimization_enabled:
  description: "Enable GPU optimization features"
  type: boolean
  default: true
  targeting:
    - segment: "premium_users"
      enabled: true
```

#### Analytics Flags
```yaml
# Advanced Analytics
advanced_analytics_enabled:
  description: "Enable advanced analytics features"
  type: boolean
  default: false
  rollout:
    percentage: 25  # 25% of users

# Real-time Processing
real_time_processing_enabled:
  description: "Enable real-time video processing"
  type: boolean
  default: false
  targeting:
    - segment: "beta_users"
      enabled: true
```

#### UI/UX Flags
```yaml
# New Dashboard
new_dashboard_enabled:
  description: "Enable new dashboard design"
  type: boolean
  default: false
  multivariate:
    - variation: "control"
      weight: 50
    - variation: "new_design"
      weight: 50

# Hebrew UI
hebrew_ui_enabled:
  description: "Enable Hebrew language interface"
  type: boolean
  default: true
  targeting:
    - segment: "israeli_users"
      enabled: true
```

## 💻 **SDK Integration**

### Frontend Integration (React)

#### Installation
```bash
npm install flagsmith-react
```

#### Configuration
```typescript
// src/flagsmith.ts
import { createFlagsmithInstance } from 'flagsmith-react';

export const flagsmith = createFlagsmithInstance({
  environmentKey: process.env.REACT_APP_FLAGSMITH_KEY!,
  cacheFlags: true,
  enableAnalytics: true,
  api: 'https://flags.footanalytics.com/api/v1/',
});
```

#### Usage in Components
```typescript
// src/components/Dashboard.tsx
import React from 'react';
import { useFlags, useFlagsmith } from 'flagsmith-react';

const Dashboard: React.FC = () => {
  const flags = useFlags(['new_dashboard_enabled', 'advanced_analytics_enabled']);
  const flagsmith = useFlagsmith();

  // Identify user for targeting
  React.useEffect(() => {
    flagsmith.identify('user-123', {
      email: 'user@example.com',
      plan: 'premium',
      country: 'IL'
    });
  }, [flagsmith]);

  return (
    <div>
      {flags.new_dashboard_enabled?.enabled ? (
        <NewDashboard />
      ) : (
        <LegacyDashboard />
      )}
      
      {flags.advanced_analytics_enabled?.enabled && (
        <AdvancedAnalytics />
      )}
    </div>
  );
};
```

### Backend Integration (Node.js)

#### Installation
```bash
npm install flagsmith-nodejs
```

#### Configuration
```typescript
// src/services/flagsmith.ts
import Flagsmith from 'flagsmith-nodejs';

export const flagsmith = new Flagsmith({
  environmentKey: process.env.FLAGSMITH_SERVER_KEY!,
  apiUrl: 'https://flags.footanalytics.com/api/v1/',
  enableLocalEvaluation: true,
  environmentRefreshIntervalSeconds: 60,
});
```

#### Usage in Services
```typescript
// src/services/mlPipeline.ts
import { flagsmith } from './flagsmith';

export class MLPipelineService {
  async processVideo(videoId: string, userId: string): Promise<void> {
    // Get flags for user
    const flags = await flagsmith.getIdentityFlags(userId, {
      plan: 'premium',
      country: 'IL'
    });

    // Check ML model version
    const useV2Model = flags.isFeatureEnabled('ml_model_v2_enabled');
    const model = useV2Model ? this.modelV2 : this.modelV1;

    // Check GPU optimization
    const gpuOptimization = flags.isFeatureEnabled('gpu_optimization_enabled');
    const config = {
      ...this.baseConfig,
      gpuOptimization
    };

    await this.processWithModel(videoId, model, config);
  }
}
```

### Python Integration (ML Pipeline)

#### Installation
```bash
pip install flagsmith
```

#### Configuration
```python
# ml_pipeline/flagsmith_client.py
from flagsmith import Flagsmith

flagsmith_client = Flagsmith(
    environment_key=os.getenv('FLAGSMITH_SERVER_KEY'),
    api_url='https://flags.footanalytics.com/api/v1/',
    enable_local_evaluation=True,
    environment_refresh_interval_seconds=60
)
```

#### Usage in ML Pipeline
```python
# ml_pipeline/inference.py
from .flagsmith_client import flagsmith_client

class InferenceEngine:
    def __init__(self):
        self.model_v1 = self.load_model_v1()
        self.model_v2 = self.load_model_v2()
    
    async def predict(self, video_data, user_id=None):
        # Get feature flags
        flags = await flagsmith_client.get_identity_flags(
            user_id,
            traits={'plan': 'premium', 'country': 'IL'}
        )
        
        # Select model version
        use_v2_model = flags.is_feature_enabled('ml_model_v2_enabled')
        model = self.model_v2 if use_v2_model else self.model_v1
        
        # GPU optimization
        gpu_optimization = flags.is_feature_enabled('gpu_optimization_enabled')
        
        # Configure inference
        config = InferenceConfig(
            batch_size=32 if gpu_optimization else 16,
            use_tensorrt=gpu_optimization,
            precision='fp16' if gpu_optimization else 'fp32'
        )
        
        return await model.predict(video_data, config)
```

## 🎯 **Targeting & Segmentation**

### User Segments
```yaml
# Premium Users Segment
premium_users:
  rules:
    - trait: "plan"
      operator: "EQUAL"
      value: "premium"
    - trait: "country"
      operator: "EQUAL"
      value: "IL"

# Beta Users Segment
beta_users:
  rules:
    - trait: "beta_participant"
      operator: "EQUAL"
      value: "true"
    - trait: "signup_date"
      operator: "GREATER_THAN"
      value: "2024-01-01"
```

### Percentage Rollouts
```yaml
# Gradual Feature Rollout
new_feature_rollout:
  enabled: true
  percentage: 25  # 25% of users
  segments:
    - premium_users: 50%  # 50% of premium users
    - beta_users: 100%    # 100% of beta users
```

### A/B Testing
```yaml
# Dashboard A/B Test
dashboard_ab_test:
  multivariate: true
  variations:
    - name: "control"
      weight: 40
      value: "original_dashboard"
    - name: "variant_a"
      weight: 30
      value: "new_dashboard_v1"
    - name: "variant_b"
      weight: 30
      value: "new_dashboard_v2"
```

## 📊 **Analytics & Monitoring**

### Flag Usage Metrics
```typescript
// Track flag usage
flagsmith.track('feature_used', {
  feature: 'advanced_analytics_enabled',
  user_id: 'user-123',
  timestamp: new Date().toISOString()
});
```

### Custom Analytics
```python
# Track ML model performance by flag
async def track_model_performance(prediction_result, flags):
    model_version = 'v2' if flags.is_feature_enabled('ml_model_v2_enabled') else 'v1'
    
    await analytics.track('model_prediction', {
        'model_version': model_version,
        'accuracy': prediction_result.accuracy,
        'latency': prediction_result.latency,
        'gpu_optimization': flags.is_feature_enabled('gpu_optimization_enabled')
    })
```

### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Feature Flags Analytics",
    "panels": [
      {
        "title": "Flag Evaluation Rate",
        "targets": [
          {
            "expr": "rate(flagsmith_flag_evaluations_total[5m])"
          }
        ]
      },
      {
        "title": "Feature Adoption",
        "targets": [
          {
            "expr": "flagsmith_feature_enabled_users / flagsmith_total_users * 100"
          }
        ]
      }
    ]
  }
}
```

## 🔐 **Security & Permissions**

### Environment Keys
```yaml
# Environment-specific keys
environments:
  development:
    client_key: "dev_client_key_xxx"
    server_key: "dev_server_key_xxx"
  staging:
    client_key: "staging_client_key_xxx"
    server_key: "staging_server_key_xxx"
  production:
    client_key: "prod_client_key_xxx"
    server_key: "prod_server_key_xxx"
```

### RBAC Configuration
```yaml
# Role-based access control
roles:
  admin:
    permissions:
      - create_flags
      - edit_flags
      - delete_flags
      - manage_environments
  developer:
    permissions:
      - view_flags
      - edit_flags
  viewer:
    permissions:
      - view_flags
```

### Audit Logging
```typescript
// Enable audit logging
const flagsmith = new Flagsmith({
  environmentKey: process.env.FLAGSMITH_KEY,
  enableAuditLog: true,
  auditLogEndpoint: 'https://audit.footanalytics.com/api/v1/events'
});
```

## 🛠️ **Troubleshooting**

### Common Issues

#### 1. Flag Not Updating
```bash
# Check cache status
kubectl exec -n feature-flags deployment/flagsmith-redis -- redis-cli info

# Clear cache
kubectl exec -n feature-flags deployment/flagsmith-redis -- redis-cli flushall

# Restart Flagsmith
kubectl rollout restart deployment/flagsmith -n feature-flags
```

#### 2. SDK Connection Issues
```typescript
// Debug SDK connectivity
flagsmith.on('error', (error) => {
  console.error('Flagsmith error:', error);
});

// Test API connectivity
const health = await fetch('https://flags.footanalytics.com/health/');
console.log('API Health:', await health.json());
```

#### 3. Performance Issues
```bash
# Check database performance
kubectl exec -n feature-flags deployment/flagsmith-postgres -- \
  psql -U postgres -d flagsmith -c "SELECT * FROM pg_stat_activity;"

# Monitor Redis performance
kubectl exec -n feature-flags deployment/flagsmith-redis -- \
  redis-cli --latency-history
```

### Debugging Commands
```bash
# View Flagsmith logs
kubectl logs -f deployment/flagsmith -n feature-flags

# Check database connectivity
kubectl exec -n feature-flags deployment/flagsmith -- \
  python manage.py check --database default

# Test flag evaluation
curl -H "X-Environment-Key: YOUR_KEY" \
  "https://flags.footanalytics.com/api/v1/flags/"
```

## 📋 **Best Practices**

### Flag Naming
1. **Descriptive Names**: Use clear, descriptive flag names
2. **Consistent Naming**: Follow naming conventions (snake_case)
3. **Versioning**: Include version numbers for major changes
4. **Environment Prefixes**: Use prefixes for environment-specific flags

### Flag Lifecycle
1. **Planning**: Define flag purpose and success criteria
2. **Implementation**: Implement with proper fallbacks
3. **Testing**: Test all flag states thoroughly
4. **Monitoring**: Monitor flag performance and adoption
5. **Cleanup**: Remove unused flags regularly

### Performance
1. **Caching**: Enable local evaluation for better performance
2. **Batch Requests**: Use bulk flag evaluation when possible
3. **Fallbacks**: Always provide sensible default values
4. **Monitoring**: Track flag evaluation performance

---

**Next Steps**: [Distributed Tracing](../observability/DISTRIBUTED_TRACING.md) | [Monitoring](../monitoring/MONITORING.md)
