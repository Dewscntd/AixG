# AixG Development Guide

🚀 Complete guide for setting up and developing the AixG AI-powered football video analysis platform.

## Quick Start

```bash
# 1. Clone and setup
git clone <repository-url>
cd AixG

# 2. Run the automated setup
./scripts/setup-dev.sh

# 3. Start development
npm run dev:all
```

## 📋 Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 8.0.0
- **Docker** & **Docker Compose**
- **Git**

## 🏗️ Project Structure

```
AixG/
├── src/                          # Backend microservices
│   ├── api-gateway/             # GraphQL Federation Gateway
│   ├── video-ingestion-service/ # Video upload & processing
│   ├── analytics-engine-service/# Match analytics & ML
│   ├── ai-coaching/             # Hebrew AI coaching system
│   ├── real-time-analysis-service/ # Live match analysis
│   └── shared/                  # Shared domain models
├── frontend/                    # Next.js frontend
├── infrastructure/              # K8s, Terraform, monitoring
├── prisma/                      # Database schema & migrations
├── docker-compose.development.yml # Development services
└── scripts/                     # Setup & deployment scripts
```

## 🛠️ Development Commands

### Environment Management
```bash
# Start all development services
npm run dev:services

# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Start everything (services + backend + frontend)
npm run dev:all

# Stop all services
npm run stop:services

# View service logs
npm run logs:services
```

### Database Management
```bash
# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Seed database with sample data
npm run db:seed

# Open Prisma Studio
npm run db:studio

# Reset database (⚠️ destroys all data)
npm run db:reset
```

### Testing
```bash
# Run all tests
npm run test:all

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Performance tests
npm run test:performance

# Watch mode for development
npm run test:watch
```

### Code Quality
```bash
# Lint and fix issues
npm run lint

# Format code
npm run format

# Type checking
npm run type-check

# Security audit
npm run test:security
```

## 🐳 Development Services

The `docker-compose.development.yml` provides:

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Main database |
| Redis | 6379 | Caching & sessions |
| MinIO | 9000/9001 | Object storage (S3-compatible) |
| Elasticsearch | 9200 | Search & logging |
| Kibana | 5601 | Log visualization |
| Grafana | 3002 | Metrics dashboard |
| Prometheus | 9090 | Metrics collection |

## 🌐 Application URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Backend API | http://localhost:3001 | - |
| Frontend | http://localhost:3000 | - |
| API Documentation | http://localhost:3001/api/docs | - |
| GraphQL Playground | http://localhost:3001/graphql | - |
| Grafana | http://localhost:3002 | admin/admin |
| Kibana | http://localhost:5601 | - |
| MinIO Console | http://localhost:9001 | minioadmin/minioadmin |
| Prisma Studio | http://localhost:5555 | - |

## 🔧 Configuration

### Environment Files

- `.env.development` - Development configuration
- `.env.staging` - Staging environment
- `.env.local` - Local overrides (git-ignored)

### Key Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/db"

# AI Services (add your keys to .env.local)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
PINECONE_API_KEY=your-pinecone-key

# Security
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

## 🚀 Development Workflow

### 1. Feature Development

```bash
# 1. Start services
npm run dev:services

# 2. Start development with hot reload
npm run dev:all

# 3. Make your changes
# 4. Tests are automatically run on save

# 5. Run manual tests before committing
npm run test:unit
npm run lint
npm run type-check
```

### 2. Database Changes

```bash
# 1. Modify prisma/schema.prisma
# 2. Create and apply migration
npm run db:migrate

# 3. Update seed data if needed
# Edit prisma/seed.ts
npm run db:seed
```

### 3. Frontend Development

```bash
# Frontend runs on http://localhost:3000
cd frontend
npm run dev

# The frontend connects to:
# - Backend API: http://localhost:3001
# - WebSocket: ws://localhost:3001
```

## 🎯 Architecture Patterns

### Domain-Driven Design (DDD)
- Each service has clear bounded contexts
- Rich domain models with business logic
- Repository pattern for data access

### Event-Driven Architecture
- CQRS pattern with command/query separation
- Event sourcing for audit trails
- Cross-service communication via events

### Clean Architecture
- Dependencies point inward to domain
- Framework-agnostic business logic
- Testable components at every layer

## 🧪 Testing Strategy

### Test Pyramid
1. **Unit Tests** (70%) - Fast, isolated component tests
2. **Integration Tests** (20%) - Service integration tests
3. **E2E Tests** (10%) - Full user workflow tests

### Specialized Testing
- **Contract Tests** - API contract verification
- **Performance Tests** - Load testing with Artillery/K6
- **Chaos Tests** - Resilience testing
- **Property Tests** - Fast-check for edge cases

## 📊 Monitoring & Observability

### Development Monitoring
- **Grafana Dashboards** - Application metrics
- **Kibana** - Log aggregation and search
- **Prometheus** - Time-series metrics
- **Health Checks** - Service availability

### Performance Profiling
```bash
# CPU profiling
npm run profile:cpu

# Memory profiling
npm run profile:memory

# Performance benchmarks
npm run test:performance
```

## 🐛 Debugging

### Backend Debugging
```bash
# Start with debugger attached
npm run start:debug

# Or use VS Code launch configuration
# Breakpoints work in TypeScript files
```

### Frontend Debugging
- React DevTools for component inspection
- Next.js built-in error overlay
- Browser developer tools

### Database Debugging
```bash
# Open Prisma Studio for data inspection
npm run db:studio

# View database logs
npm run logs:services | grep postgres
```

## 🔄 Common Development Tasks

### Adding a New Microservice
1. Create service directory in `src/`
2. Implement domain, application, infrastructure layers
3. Add service to docker-compose.development.yml
4. Update API gateway routing
5. Add tests and documentation

### Adding New Database Tables
1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Update seed data if needed
4. Regenerate Prisma client

### Adding AI Model Integration
1. Create model client in `infrastructure/external_model_clients/`
2. Implement model tier routing
3. Add configuration to environment files
4. Create integration tests

## 📚 Additional Resources

- [Architecture Documentation](./docs/README.md)
- [API Documentation](http://localhost:3001/api/docs)
- [Deployment Guide](./docs/deployment/README.md)
- [Performance Optimization](./docs/performance-optimization/README.md)

## 🆘 Troubleshooting

### Common Issues

#### "Docker is not running"
```bash
# Start Docker Desktop
open -a Docker
# Wait 30-60 seconds for startup
```

#### "Port already in use"
```bash
# Stop all services and restart
npm run stop:services
npm run dev:services
```

#### "Database connection failed"
```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# View database logs
docker logs aixg-postgres-dev
```

#### "TypeScript compilation errors"
```bash
# Clear TypeScript cache
rm -rf dist/
npm run type-check
```

#### "Frontend build fails"
```bash
cd frontend
rm -rf .next node_modules
npm install --legacy-peer-deps
npm run build
```

### Getting Help

1. Check service logs: `npm run logs:services`
2. Verify Docker containers: `docker ps`
3. Check database connectivity: `npm run db:studio`
4. Run health checks: `curl http://localhost:3001/health`

---

**Happy coding! 🎉**

For questions or issues, please check the [troubleshooting section](#-troubleshooting) or create an issue in the repository.