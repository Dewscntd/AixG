# AixG Platform - Deployment, Testing & Local Development Plan

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Docker Configuration](#docker-configuration)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Testing Strategy](#testing-strategy)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Monitoring & Observability](#monitoring--observability)
7. [Production Deployment](#production-deployment)

---

## 1. Local Development Setup

### 1.1 Prerequisites

```bash
# Required Software
- Node.js 20.x or higher
- Docker Desktop (for Mac/Windows) or Docker Engine (for Linux)
- PostgreSQL 15+
- Redis 7+
- Git
- VS Code (recommended) or your preferred IDE

# Optional but Recommended
- kubectl (for Kubernetes testing)
- k3d or minikube (for local Kubernetes)
- Postman or Insomnia (for API testing)
```

### 1.2 Quick Start Script

```bash
#!/bin/bash
# scripts/quick-start.sh

echo "🚀 AixG Platform - Quick Start Setup"

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install
cd frontend && npm install && cd ..

# 2. Setup environment files
echo "⚙️  Setting up environment..."
cp .env.example .env.development
cp frontend/.env.example frontend/.env.development

# 3. Start Docker services
echo "🐳 Starting Docker services..."
docker-compose -f docker-compose.development.yml up -d

# 4. Wait for services
echo "⏳ Waiting for services to be ready..."
npm run wait-for-services

# 5. Run database migrations
echo "🗄️  Running database migrations..."
npm run db:migrate

# 6. Seed database (optional)
echo "🌱 Seeding database..."
npm run db:seed

# 7. Start development servers
echo "🎯 Starting development servers..."
npm run dev:all

echo "✅ Setup complete! Platform running at:"
echo "   - Backend: http://localhost:4000"
echo "   - Frontend: http://localhost:3000"
echo "   - GraphQL Playground: http://localhost:4000/graphql"
```

### 1.3 Manual Setup Steps

#### Step 1: Clone and Install
```bash
git clone https://github.com/your-org/aixg-platform.git
cd aixg-platform
npm install
npm run setup:frontend
```

#### Step 2: Environment Configuration
```bash
# Backend .env.development
cp .env.example .env.development

# Edit .env.development with your settings:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aixg_dev"
REDIS_URL="redis://localhost:6379"
OPENAI_API_KEY="your-openai-key"
PINECONE_API_KEY="your-pinecone-key"
JWT_SECRET="your-jwt-secret-here"
```

#### Step 3: Start Infrastructure Services
```bash
# Using Docker Compose
docker-compose -f docker-compose.development.yml up -d

# Verify services are running
docker-compose ps

# Check logs
docker-compose logs -f
```

#### Step 4: Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio
```

#### Step 5: Start Development Servers
```bash
# Option 1: Start all services concurrently
npm run dev:all

# Option 2: Start services separately (in different terminals)
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend

# Terminal 3: Infrastructure services logs
npm run logs:services
```

### 1.4 Development Tools

#### VS Code Configuration
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

#### Recommended VS Code Extensions
```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "graphql.vscode-graphql",
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools"
  ]
}
```

### 1.5 Development Workflow

```bash
# Daily workflow

# 1. Pull latest changes
git pull origin main

# 2. Update dependencies if needed
npm install

# 3. Start services
npm run dev:services
npm run dev:all

# 4. Make changes and test

# 5. Run tests
npm run test

# 6. Check types
npm run type-check

# 7. Lint and format
npm run lint
npm run format

# 8. Commit changes
git add .
git commit -m "feat: your feature description"

# 9. Push changes
git push origin your-branch
```

---

## 2. Docker Configuration

### 2.1 Development Docker Compose

```yaml
# docker-compose.development.yml
version: '3.9'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: aixg-postgres-dev
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: aixg_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: aixg-redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Pinecone Alternative (for local dev)
  # Using Milvus as local vector database
  milvus:
    image: milvusdb/milvus:latest
    container_name: aixg-milvus-dev
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
    ports:
      - "19530:19530"
      - "9091:9091"
    depends_on:
      - etcd
      - minio

  etcd:
    image: quay.io/coreos/etcd:latest
    container_name: aixg-etcd-dev
    environment:
      ETCD_AUTO_COMPACTION_MODE: revision
      ETCD_AUTO_COMPACTION_RETENTION: 1000
      ETCD_QUOTA_BACKEND_BYTES: 4294967296
    command: etcd -advertise-client-urls=http://127.0.0.1:2379 -listen-client-urls http://0.0.0.0:2379

  minio:
    image: minio/minio:latest
    container_name: aixg-minio-dev
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    command: minio server /minio_data --console-address ":9001"

  # Prometheus Monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: aixg-prometheus-dev
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  # Grafana Dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: aixg-grafana-dev
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_INSTALL_PLUGINS: grafana-clock-panel
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana-dashboards:/etc/grafana/provisioning/dashboards
    depends_on:
      - prometheus

volumes:
  postgres-data:
  redis-data:
  prometheus-data:
  grafana-data:
```

### 2.2 Production Dockerfile

```dockerfile
# Dockerfile
# Multi-stage build for production

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --only=production && \
    cd frontend && npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build && \
    cd frontend && npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built artifacts and dependencies
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy Prisma schema for runtime
COPY --chown=nodejs:nodejs prisma ./prisma

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
```

### 2.3 Docker Build & Run Commands

```bash
# Build production image
docker build -t aixg-platform:latest .

# Run production container
docker run -d \
  --name aixg-platform \
  -p 4000:4000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e REDIS_URL="redis://host:6379" \
  aixg-platform:latest

# Build and push to registry
docker build -t ghcr.io/your-org/aixg-platform:v2.0.0 .
docker push ghcr.io/your-org/aixg-platform:v2.0.0
```

---

## 3. Kubernetes Deployment

### 3.1 Local Kubernetes Setup

```bash
# Option 1: k3d (Lightweight K8s)
k3d cluster create aixg-dev \
  --agents 2 \
  --port "4000:4000@loadbalancer" \
  --port "3000:3000@loadbalancer"

# Option 2: minikube
minikube start --cpus 4 --memory 8192
minikube addons enable ingress

# Option 3: Docker Desktop Kubernetes
# Enable Kubernetes in Docker Desktop settings
```

### 3.2 Kubernetes Manifests

#### Namespace
```yaml
# k8s/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: aixg-platform
  labels:
    app: aixg-platform
    environment: production
```

#### ConfigMap
```yaml
# k8s/base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aixg-config
  namespace: aixg-platform
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  API_PORT: "4000"
  GRAPHQL_PLAYGROUND: "false"
```

#### Secrets (use sealed-secrets in production)
```yaml
# k8s/base/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: aixg-secrets
  namespace: aixg-platform
type: Opaque
data:
  DATABASE_URL: <base64-encoded>
  REDIS_URL: <base64-encoded>
  OPENAI_API_KEY: <base64-encoded>
  JWT_SECRET: <base64-encoded>
```

#### Deployment
```yaml
# k8s/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aixg-platform
  namespace: aixg-platform
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: aixg-platform
  template:
    metadata:
      labels:
        app: aixg-platform
        version: v2.0.0
    spec:
      containers:
      - name: api-gateway
        image: ghcr.io/your-org/aixg-platform:v2.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 4000
          name: http
        envFrom:
        - configMapRef:
            name: aixg-config
        - secretRef:
            name: aixg-secrets
        resources:
          requests:
            memory: "1Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
```

#### Service
```yaml
# k8s/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: aixg-platform-service
  namespace: aixg-platform
spec:
  type: ClusterIP
  selector:
    app: aixg-platform
  ports:
  - port: 80
    targetPort: 4000
    protocol: TCP
    name: http
```

#### Ingress
```yaml
# k8s/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: aixg-platform-ingress
  namespace: aixg-platform
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.aixg.io
    secretName: aixg-tls
  rules:
  - host: api.aixg.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: aixg-platform-service
            port:
              number: 80
```

#### HorizontalPodAutoscaler
```yaml
# k8s/base/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aixg-platform-hpa
  namespace: aixg-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aixg-platform
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

### 3.3 Kubernetes Deployment Commands

```bash
# Apply all manifests
kubectl apply -f k8s/base/

# Check deployment status
kubectl get all -n aixg-platform

# View logs
kubectl logs -f deployment/aixg-platform -n aixg-platform

# Scale deployment
kubectl scale deployment/aixg-platform --replicas=5 -n aixg-platform

# Port forward for local testing
kubectl port-forward svc/aixg-platform-service 4000:80 -n aixg-platform

# Execute command in pod
kubectl exec -it deployment/aixg-platform -n aixg-platform -- /bin/sh

# Delete resources
kubectl delete -f k8s/base/
```

---

## 4. Testing Strategy

### 4.1 Test Structure

```
test/
├── unit/                      # Unit tests
│   ├── domain/
│   ├── application/
│   └── infrastructure/
├── integration/               # Integration tests
│   ├── api/
│   ├── database/
│   └── external-services/
├── e2e/                       # End-to-end tests
│   ├── user-workflows/
│   └── api-flows/
├── performance/               # Performance tests
│   ├── load-test.yml
│   └── stress-test.js
└── utils/                     # Test utilities
    ├── factories/
    ├── fixtures/
    └── helpers/
```

### 4.2 Test Configuration

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
};
```

### 4.3 Test Examples

#### Unit Test
```typescript
// test/unit/domain/hebrew-morphology.spec.ts
import { HebrewMorphologyAnalyzer } from '@/ai-coaching/domain/value-objects/hebrew-morphology';

describe('HebrewMorphologyAnalyzer', () => {
  let analyzer: HebrewMorphologyAnalyzer;

  beforeEach(() => {
    analyzer = new HebrewMorphologyAnalyzer();
  });

  describe('analyzeMorphology', () => {
    it('should analyze Hebrew text correctly', () => {
      const text = 'ניתוח טקטי של המשחק';
      const result = analyzer.analyzeMorphology(text);

      expect(result).toHaveLength(4);
      expect(result[0].word).toBe('ניתוח');
      expect(result[0].partOfSpeech).toBe('noun');
    });

    it('should extract football terms', () => {
      const text = 'מערך הגנתי חזק';
      const terms = analyzer.extractFootballTerms(text);

      expect(terms).toHaveLength(2);
      expect(terms[0].hebrew).toBe('מערך');
      expect(terms[1].hebrew).toBe('הגנתי');
    });
  });
});
```

#### Integration Test
```typescript
// test/integration/api/coaching-api.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('AI Coaching API (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/coaching/hebrew-insight', () => {
    it('should generate Hebrew coaching insight', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/coaching/hebrew-insight')
        .send({
          text: 'ניתוח טקטי של המשחק',
          context: {
            matchPhase: 'half_time',
            teamId: 'team_123'
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('hebrewText');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body.confidence).toBeGreaterThan(0.8);
    });
  });
});
```

#### E2E Test (Playwright)
```typescript
// test/e2e/coaching-dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Hebrew Coaching Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/coaching/dashboard');
    // Assume user is logged in
  });

  test('should display Hebrew insights in RTL layout', async ({ page }) => {
    // Wait for insights to load
    await page.waitForSelector('[data-testid="insight-panel"]');

    // Check RTL direction
    const insightPanel = page.locator('[data-testid="insight-panel"]');
    await expect(insightPanel).toHaveAttribute('dir', 'rtl');

    // Verify Hebrew text is displayed
    const hebrewInsight = page.locator('.hebrew-insight').first();
    await expect(hebrewInsight).toBeVisible();
    await expect(hebrewInsight).toContainText(/[\u0590-\u05FF]/); // Hebrew characters
  });

  test('should generate new insight on button click', async ({ page }) => {
    await page.click('[data-testid="generate-insight-btn"]');

    // Wait for new insight
    await page.waitForSelector('[data-testid="new-insight"]', { timeout: 5000 });

    // Verify insight appears
    const newInsight = page.locator('[data-testid="new-insight"]');
    await expect(newInsight).toBeVisible();
  });
});
```

### 4.4 Test Execution Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode
npm run test:watch

# Performance tests
npm run test:performance
npm run test:load

# Stress tests
npm run test:stress
```

---

## 5. CI/CD Pipeline

### 5.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20.x'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Build and Test
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test:unit -- --coverage

      - name: Integration tests
        run: npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  # Build Docker Image
  build-image:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

  # Deploy to Staging
  deploy-staging:
    needs: build-image
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure kubeconfig
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Deploy to staging
        run: |
          kubectl set image deployment/aixg-platform \
            api-gateway=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -n aixg-staging

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/aixg-platform -n aixg-staging

      - name: Run smoke tests
        run: npm run test:smoke:staging

  # Deploy to Production
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to production
        run: |
          # Production deployment with canary strategy
          kubectl apply -f k8s/production/
```

---

## 6. Monitoring & Observability

### 6.1 Prometheus Metrics

```typescript
// src/shared/infrastructure/monitoring/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestDuration: Histogram;
  private readonly hebrewInsightsGenerated: Counter;
  private readonly gpuUtilization: Gauge;

  constructor() {
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code']
    });

    this.hebrewInsightsGenerated = new Counter({
      name: 'hebrew_insights_generated_total',
      help: 'Total number of Hebrew insights generated',
      labelNames: ['type', 'success']
    });

    this.gpuUtilization = new Gauge({
      name: 'gpu_utilization_percent',
      help: 'GPU utilization percentage'
    });
  }

  getMetrics(): string {
    return register.metrics();
  }
}
```

### 6.2 Grafana Dashboards

```json
// monitoring/grafana-dashboards/aixg-platform.json
{
  "dashboard": {
    "title": "AixG Platform Monitoring",
    "panels": [
      {
        "title": "API Response Time (P95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "Hebrew Insights Generated",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(hebrew_insights_generated_total[5m])"
          }
        ]
      },
      {
        "title": "GPU Utilization",
        "type": "gauge",
        "targets": [
          {
            "expr": "gpu_utilization_percent"
          }
        ]
      }
    ]
  }
}
```

---

## 7. Production Deployment

### 7.1 Pre-Deployment Checklist

```markdown
## Production Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved (0 errors)
- [ ] Test coverage >= 75%
- [ ] All CI/CD checks passing
- [ ] Code review approved
- [ ] Security audit completed

### Configuration
- [ ] Environment variables configured
- [ ] Secrets properly sealed
- [ ] Database migrations tested
- [ ] API rate limits configured
- [ ] CORS settings validated

### Infrastructure
- [ ] Kubernetes cluster ready
- [ ] Load balancer configured
- [ ] SSL certificates installed
- [ ] Monitoring dashboards setup
- [ ] Alerting rules configured

### Performance
- [ ] Load testing completed
- [ ] Performance benchmarks met
- [ ] Cache warming strategy ready
- [ ] CDN configuration validated

### Security
- [ ] Penetration testing completed
- [ ] OWASP compliance verified
- [ ] Secrets rotation tested
- [ ] Backup procedures validated
- [ ] Disaster recovery plan ready

### Rollout Strategy
- [ ] Blue-green deployment ready
- [ ] Canary deployment configured
- [ ] Rollback procedure documented
- [ ] Communication plan prepared
```

### 7.2 Deployment Procedure

```bash
#!/bin/bash
# scripts/deploy-production.sh

set -e

echo "🚀 Starting Production Deployment"

# 1. Pre-flight checks
echo "✅ Running pre-flight checks..."
./scripts/pre-flight-checks.sh

# 2. Backup current state
echo "💾 Creating backup..."
./scripts/backup-production.sh

# 3. Apply database migrations
echo "🗄️  Applying database migrations..."
kubectl exec -it deployment/aixg-platform -n aixg-production -- npm run db:migrate

# 4. Deploy new version (blue-green)
echo "🎯 Deploying new version..."
kubectl apply -f k8s/production/blue-green/

# 5. Wait for health checks
echo "⏳ Waiting for health checks..."
kubectl wait --for=condition=available --timeout=300s \
  deployment/aixg-platform-green -n aixg-production

# 6. Run smoke tests
echo "🧪 Running smoke tests..."
npm run test:smoke:production

# 7. Switch traffic to green
echo "🔄 Switching traffic to new version..."
kubectl patch service aixg-platform-service -n aixg-production \
  -p '{"spec":{"selector":{"version":"green"}}}'

# 8. Monitor for 10 minutes
echo "👀 Monitoring new deployment..."
sleep 600

# 9. Check error rates
ERROR_RATE=$(kubectl exec -it deployment/aixg-platform-green -n aixg-production -- \
  curl -s localhost:4000/metrics | grep error_rate | awk '{print $2}')

if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
  echo "❌ Error rate too high! Rolling back..."
  ./scripts/rollback-production.sh
  exit 1
fi

# 10. Cleanup old version
echo "🧹 Cleaning up old version..."
kubectl delete deployment aixg-platform-blue -n aixg-production

echo "✅ Deployment completed successfully!"
```

### 7.3 Rollback Procedure

```bash
#!/bin/bash
# scripts/rollback-production.sh

set -e

echo "⚠️  Starting Production Rollback"

# 1. Switch traffic back to blue
kubectl patch service aixg-platform-service -n aixg-production \
  -p '{"spec":{"selector":{"version":"blue"}}}'

# 2. Delete green deployment
kubectl delete deployment aixg-platform-green -n aixg-production

# 3. Verify blue deployment health
kubectl wait --for=condition=available --timeout=60s \
  deployment/aixg-platform-blue -n aixg-production

echo "✅ Rollback completed"
```

---

*Documentation Version: 2.0.0*
*Last Updated: January 2025*
*Next Review: After Phase 8 completion*
