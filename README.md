# FootAnalytics Video Ingestion Service

A production-ready video ingestion microservice built with clean architecture principles, implementing hexagonal/ports & adapters pattern with Domain-Driven Design (DDD).

## 🏗️ Architecture Overview

This service follows **Clean Architecture** with strict separation of concerns:

```
src/video-ingestion-service/
├── domain/                 # Business logic & rules (innermost layer)
│   ├── entities/          # Domain entities with rich behavior
│   ├── value-objects/     # Immutable value objects
│   ├── events/           # Domain events
│   ├── services/         # Domain services
│   └── ports/            # Interfaces (repository, storage, events)
├── application/           # Use cases & application logic
│   ├── use-cases/        # Application use cases
│   └── dto/              # Data transfer objects
├── infrastructure/       # External concerns (outermost layer)
│   ├── repositories/     # Database implementations
│   ├── storage/          # File storage implementations
│   └── events/           # Event publishing implementations
└── controllers/          # HTTP controllers (presentation layer)
```

## 🎯 Key Features

- **Clean Architecture**: Hexagonal/Ports & Adapters pattern
- **Domain-Driven Design**: Rich domain models with business logic
- **Event-Driven**: Publishes domain events for loose coupling
- **Resumable Uploads**: Support for large video file uploads
- **Video Validation**: Comprehensive video format and quality validation
- **Multiple Storage**: S3 and local storage implementations
- **Circuit Breaker**: Resilient external service integration
- **Comprehensive Testing**: Unit, integration, and e2e tests
- **Type Safety**: Full TypeScript with strict mode
- **Production Ready**: Docker, health checks, monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- AWS S3 (or compatible storage)
- Apache Pulsar (for events)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd footanalytics-video-ingestion

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Start development server
npm run start:dev
```

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=footanalytics
DB_USER=postgres
DB_PASSWORD=password

# AWS S3
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_VIDEO_BUCKET=footanalytics-videos

# Pulsar
PULSAR_SERVICE_URL=pulsar://localhost:6650
PULSAR_USE_TLS=false

# Application
PORT=3001
NODE_ENV=development
USE_IN_MEMORY_REPOSITORY=false
```

## 📡 API Endpoints

### Upload Video
```http
POST /api/videos/upload
Content-Type: multipart/form-data

{
  "video": <file>,
  "uploadedBy": "user-id",
  "matchId": "match-123",
  "teamId": "team-456",
  "tags": ["training", "defense"]
}
```

### Resume Upload
```http
POST /api/videos/upload/resume
Content-Type: application/json

{
  "uploadId": "upload_123",
  "offset": 1048576
}
```

### Get Upload Progress
```http
GET /api/videos/upload/{uploadId}/progress
```

### Health Check
```http
GET /health
```

## 🏛️ Domain Model

### Video Entity
The core aggregate root with rich business behavior:

```typescript
class Video {
  // Factory method
  static createForUpload(uploadMetadata: UploadMetadata): Video

  // Domain behavior
  markAsUploaded(storageResult: StorageResult): void
  updateUploadProgress(progress: number): void
  startValidation(): void
  completeValidation(metadata: VideoMetadata, errors: string[], warnings: string[]): void
  startProcessing(processingId: string): void
  
  // Business rules
  isReadyForProcessing(): boolean
  isHighDefinition(): boolean
  getDurationInMinutes(): number
}
```

### Value Objects
Immutable objects representing domain concepts:

- `VideoId`: Unique identifier
- `UploadMetadata`: Upload information and constraints
- `VideoMetadata`: Technical video properties
- `StorageResult`: Storage location and metadata

### Domain Events
Events published when domain state changes:

- `VideoUploadedEvent`: Video successfully uploaded
- `VideoValidatedEvent`: Video validation completed
- `VideoProcessingStartedEvent`: Processing pipeline initiated

## 🔧 Use Cases

### Upload Video Use Case
```typescript
@Injectable()
export class UploadVideoUseCase {
  async execute(command: UploadVideoCommand): Promise<UploadVideoResult> {
    // 1. Create upload metadata
    // 2. Create video entity
    // 3. Save to repository
    // 4. Upload to storage
    // 5. Mark as uploaded
    // 6. Publish domain events
    // 7. Start async validation
  }
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e
```

### Test Structure
- **Unit Tests**: Domain entities, value objects, use cases
- **Integration Tests**: Repository implementations, external services
- **E2E Tests**: Full API workflows

## 🐳 Docker Deployment

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run

# Or use docker-compose
docker-compose up -d
```

## 📊 Monitoring & Observability

### Health Checks
- `/health` - Service health status
- Database connectivity check
- Storage service availability
- Event publisher status

### Metrics
- Upload success/failure rates
- Processing times
- File size distributions
- Error rates by type

### Logging
Structured logging with correlation IDs for request tracing.

## 🔒 Security

- Input validation with class-validator
- File type restrictions
- Size limits (10GB max)
- SQL injection prevention
- XSS protection
- CORS configuration

## 🚀 Production Considerations

### Scalability
- Horizontal scaling with load balancer
- Database connection pooling
- Event-driven async processing
- CDN for video delivery

### Reliability
- Circuit breaker for external services
- Retry mechanisms with exponential backoff
- Graceful degradation
- Health checks and monitoring

### Performance
- Streaming uploads for large files
- Efficient database queries with indexes
- Caching strategies
- Optimized Docker images

## 🤝 Contributing

1. Follow clean architecture principles
2. Write tests for all new features
3. Use conventional commits
4. Update documentation
5. Ensure type safety

## 📚 Additional Documentation

- [Architecture Decision Records](./docs/adr/)
- [API Documentation](http://localhost:3001/api/docs) (when running)
- [Database Schema](./database/migrations/)
- [Deployment Guide](./docs/deployment.md)

## 🔗 Related Services

This service is part of the FootAnalytics platform:
- **ML Pipeline Service**: Processes uploaded videos
- **Analytics Engine**: Calculates match statistics
- **API Gateway**: GraphQL federation layer
- **Team Management**: Manages teams and players

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
