# FootAnalytics API Gateway

A production-ready **GraphQL API Gateway** implementing **Apollo Federation** for the FootAnalytics platform. Built with **clean architecture principles**, **maximum performance**, and **enterprise-grade security**.

## 🏗️ Architecture Overview

The API Gateway implements **Apollo Federation** with comprehensive features:

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Port 4000)                 │
├─────────────────────────────────────────────────────────────┤
│  Apollo Federation Gateway                                  │
│  ├── Schema Composition & Routing                          │
│  ├── Authentication & Authorization                        │
│  ├── Rate Limiting & Query Complexity                      │
│  ├── DataLoader (N+1 Prevention)                          │
│  ├── Real-time Subscriptions                              │
│  ├── Caching & Performance                                 │
│  └── Monitoring & Metrics                                  │
├─────────────────────────────────────────────────────────────┤
│  Federated Subgraphs                                       │
│  ├── Analytics Service (Port 3000)                        │
│  ├── Video Ingestion Service (Port 3001)                  │
│  ├── ML Pipeline Service (Port 8000)                      │
│  └── Team Management Service (Port 3002)                  │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure                                            │
│  ├── Redis (Caching & Pub/Sub)                            │
│  ├── TimescaleDB (Analytics Data)                         │
│  ├── PostgreSQL (Application Data)                        │
│  ├── Apache Pulsar (Event Streaming)                      │
│  └── MinIO (Object Storage)                               │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Key Features

### 🔐 **Enterprise Security**
- **JWT Authentication** with token refresh and revocation
- **Role-based Authorization** with fine-grained permissions
- **Field-level Security** with GraphQL directives
- **Rate Limiting** with Redis-backed counters
- **Query Complexity Analysis** to prevent DoS attacks

### ⚡ **Maximum Performance**
- **DataLoader Pattern** for N+1 query prevention
- **Redis Caching** with intelligent invalidation
- **Query Optimization** with complexity analysis
- **Connection Pooling** and resource management
- **Compression** and response optimization

### 🔄 **Real-time Capabilities**
- **GraphQL Subscriptions** over WebSocket
- **Redis Pub/Sub** for scalable real-time updates
- **Live Match Analytics** streaming
- **Video Processing** progress updates

### 📊 **Comprehensive Monitoring**
- **Performance Metrics** collection and analysis
- **Error Tracking** with structured logging
- **Health Checks** for all services
- **Distributed Tracing** with correlation IDs
- **Grafana Dashboards** for visualization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Redis
- PostgreSQL/TimescaleDB

### Development Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Start Infrastructure**
```bash
docker-compose -f docker-compose.gateway.yml up -d redis timescaledb postgres pulsar minio
```

3. **Start Services**
```bash
# Terminal 1 - Analytics Service
npm run start:analytics

# Terminal 2 - Video Ingestion Service  
npm run start:video-ingestion

# Terminal 3 - API Gateway
npm run start:dev
```

4. **Access GraphQL Playground**
```
http://localhost:4000/graphql
```

### Production Deployment

```bash
# Build and start all services
docker-compose -f docker-compose.gateway.yml up -d

# Check service health
curl http://localhost:4000/graphql?query={healthCheck{status}}
```

## 📡 GraphQL API

### **Authentication**
```graphql
mutation {
  authenticate(email: "user@example.com", password: "password") {
    success
    token
    user {
      id
      email
      roles
    }
    expiresAt
  }
}
```

### **Match Analytics**
```graphql
query {
  getMatchAnalytics(matchId: "match_123") {
    homeTeam {
      xG
      possession
      shots
    }
    awayTeam {
      xG
      possession
      shots
    }
    events {
      type
      timestamp
      playerId
    }
  }
}
```

### **Real-time Subscriptions**
```graphql
subscription {
  matchAnalyticsUpdated(matchId: "match_123") {
    homeTeam {
      xG
      possession
    }
    awayTeam {
      xG
      possession
    }
  }
}
```

### **Video Management**
```graphql
mutation {
  uploadVideo(
    file: $file
    metadata: {
      matchId: "match_123"
      teamId: "team_456"
      description: "First half highlights"
    }
  ) {
    id
    status
    processingJobs {
      type
      status
      progress
    }
  }
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=4000
NODE_ENV=production

# GraphQL Configuration
GRAPHQL_PLAYGROUND=false
GRAPHQL_INTROSPECTION=false

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Service URLs
ANALYTICS_SERVICE_URL=http://localhost:3000/graphql
VIDEO_INGESTION_SERVICE_URL=http://localhost:3001/graphql
ML_PIPELINE_SERVICE_URL=http://localhost:8000/graphql

# Security
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=900000

# Monitoring
METRICS_ENABLED=true
TRACING_ENABLED=true
```

## 🛡️ Security Features

### **Authentication Directives**
```graphql
type Query {
  sensitiveData: String @auth(requires: ADMIN)
  teamData: String @auth(requires: USER, teamAccess: true)
  publicData: String # No auth required
}
```

### **Rate Limiting**
```graphql
type Query {
  expensiveOperation: String @rateLimit(max: 10, window: 60)
}
```

### **Caching**
```graphql
type Query {
  cachedData: String @cache(ttl: 300, scope: TEAM, tags: ["analytics"])
}
```

## 📈 Performance Optimization

### **DataLoader Usage**
- Automatic batching of database queries
- Request-scoped caching
- N+1 query prevention
- Efficient data loading across services

### **Caching Strategy**
- **Public Cache**: Shared data (league standings)
- **Team Cache**: Team-specific data
- **Private Cache**: User-specific data
- **Tag-based Invalidation**: Smart cache updates

### **Query Optimization**
- Complexity analysis and limits
- Depth limiting
- Timeout protection
- Resource usage monitoring

## 🔍 Monitoring & Observability

### **Health Checks**
```bash
# Basic health check
curl http://localhost:4000/graphql?query={healthCheck{status}}

# Detailed health check
curl http://localhost:4000/graphql?query={detailedHealthCheck{services{name,status}}}
```

### **Metrics Dashboard**
- Request rates and latency
- Error rates by operation
- Cache hit rates
- Memory and CPU usage
- Active connections

### **Logging**
- Structured JSON logging
- Correlation ID tracking
- Performance metrics
- Error tracking with stack traces

## 🧪 Testing

### **Unit Tests**
```bash
npm test
```

### **Integration Tests**
```bash
npm run test:e2e
```

### **Load Testing**
```bash
# Using Artillery
npm run test:load
```

## 📚 API Documentation

- **GraphQL Playground**: `http://localhost:4000/graphql`
- **Schema Documentation**: Auto-generated from GraphQL schema
- **API Examples**: See `examples/` directory
- **Postman Collection**: Available in `docs/postman/`

## 🔄 Development Workflow

1. **Schema First**: Define GraphQL schemas
2. **Code Generation**: Generate TypeScript types
3. **Implementation**: Implement resolvers and services
4. **Testing**: Unit and integration tests
5. **Documentation**: Update API docs

## 📦 Deployment

### **Docker**
```bash
docker build -t footanalytics-gateway .
docker run -p 4000:4000 footanalytics-gateway
```

### **Kubernetes**
```bash
kubectl apply -f infrastructure/k8s/api-gateway/
```

### **Monitoring**
- Prometheus metrics endpoint: `/metrics`
- Health check endpoint: `/health`
- GraphQL endpoint: `/graphql`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for FootAnalytics - The future of football analytics is federated!** ⚽📊
