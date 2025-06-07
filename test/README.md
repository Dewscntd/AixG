# FootAnalytics Testing Strategy

This document outlines the comprehensive testing strategy for the FootAnalytics platform, covering all aspects from unit tests to chaos engineering.

## 🎯 Testing Philosophy

Our testing strategy follows the **Test Pyramid** principle with emphasis on:
- **Fast feedback loops** through comprehensive unit testing
- **Confidence through integration testing** of service interactions
- **User experience validation** via end-to-end testing
- **System resilience** through chaos engineering
- **Performance assurance** under realistic load conditions

## 📊 Test Coverage Goals

- **Unit Tests**: >95% code coverage for domain logic
- **Integration Tests**: >90% coverage for service interactions
- **E2E Tests**: 100% coverage of critical user journeys
- **Contract Tests**: 100% coverage of API contracts
- **Performance Tests**: All endpoints under load
- **Chaos Tests**: All failure scenarios covered

## 🏗️ Test Architecture

### Test Types

1. **Unit Tests** (`test/unit/`)
   - Domain logic testing
   - Business rule validation
   - Pure function testing
   - Mock-based isolation

2. **Integration Tests** (`test/integration/`)
   - Service-to-service communication
   - Database interactions
   - External API integration
   - Message queue operations

3. **Contract Tests** (`test/contract/`)
   - API contract validation with Pact
   - GraphQL schema compliance
   - Service interface agreements
   - Consumer-driven contracts

4. **End-to-End Tests** (`test/e2e/`)
   - Complete user workflows
   - Browser-based testing with Playwright
   - Cross-service functionality
   - UI/UX validation

5. **Performance Tests** (`test/performance/`)
   - Load testing with K6 and Artillery
   - Stress testing under extreme conditions
   - Scalability validation
   - Resource utilization monitoring

6. **Chaos Engineering** (`test/chaos/`)
   - System resilience testing
   - Failure scenario simulation
   - Recovery validation
   - Fault injection

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- kubectl (for chaos tests)
- Chrome/Chromium (for E2E tests)

### Installation

```bash
# Install dependencies
npm ci

# Setup test environment
docker-compose -f docker-compose.test.yml up -d

# Run database migrations
npm run db:migrate:test
```

### Running Tests

```bash
# Run all tests
./test/run-all-tests.sh

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:contract
npm run test:e2e
npm run test:performance
npm run test:chaos

# Run with coverage
npm run test:coverage

# Run in watch mode (development)
npm run test:watch
```

## 📋 Test Commands

### Unit Tests
```bash
npm run test:unit              # Run all unit tests
npm run test:unit:watch        # Watch mode for development
npm run test:unit:coverage     # With coverage report
npm run test:unit:domain       # Domain logic only
npm run test:unit:services     # Service layer only
```

### Integration Tests
```bash
npm run test:integration       # Run all integration tests
npm run test:integration:db    # Database integration only
npm run test:integration:api   # API integration only
npm run test:integration:mq    # Message queue integration
```

### Contract Tests
```bash
npm run test:contract          # Run contract tests
npm run pact:publish          # Publish contracts to broker
npm run pact:verify           # Verify provider contracts
```

### End-to-End Tests
```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e:headed       # Run with browser UI
npm run test:e2e:mobile       # Mobile viewport tests
npm run test:e2e:accessibility # Accessibility tests
```

### Performance Tests
```bash
npm run test:load             # Load testing
npm run test:stress           # Stress testing
npm run test:spike            # Spike testing
npm run test:volume           # Volume testing
```

### Chaos Engineering
```bash
npm run test:chaos            # All chaos tests
npm run test:chaos:network    # Network failure tests
npm run test:chaos:database   # Database failure tests
npm run test:chaos:memory     # Memory pressure tests
```

## 🔧 Configuration

### Environment Variables

```bash
# Test environment
TEST_ENV=test
NODE_ENV=test

# Database
DATABASE_URL=postgresql://test:test@localhost:5432/footanalytics_test
REDIS_URL=redis://localhost:6379

# Performance testing
LOAD_TEST_DURATION=300s
STRESS_TEST_VUS=500
PERFORMANCE_THRESHOLD_P95=2000

# Chaos testing
CHAOS_ENABLED=true
CHAOS_DURATION=300s
CHAOS_INTENSITY=0.3
```

### Test Configuration Files

- `jest.config.js` - Main Jest configuration
- `test/jest-unit.config.js` - Unit test specific config
- `test/jest-integration.config.js` - Integration test config
- `test/jest-e2e.config.js` - E2E test config
- `playwright.config.ts` - Playwright configuration
- `test/performance/load-test.yml` - Artillery load test config
- `test/chaos/*.yaml` - Chaos engineering scenarios

## 📊 Test Data Management

### Test Data Factory

The `TestDataFactory` provides consistent test data generation:

```typescript
import { TestDataFactory } from '@test-utils/test-data-factory';

// Generate test data
const match = TestDataFactory.createMatchData();
const player = TestDataFactory.createPlayerData();
const shot = TestDataFactory.createShotData();
```

### Test Fixtures

Static test data is stored in `test/fixtures/`:
- `sample-match.mp4` - Test video file
- `test-data.json` - Static test datasets
- `mock-responses/` - API response mocks

## 🎭 Mocking Strategy

### Service Mocks
- External API mocks in `test/mocks/`
- Database mocks for unit tests
- Message queue mocks
- File system mocks

### Test Doubles
- **Stubs**: For simple return values
- **Mocks**: For behavior verification
- **Spies**: For call tracking
- **Fakes**: For complex behavior simulation

## 📈 Continuous Integration

### GitHub Actions Workflow

The CI/CD pipeline (`/.github/workflows/ci-cd-testing.yml`) includes:

1. **Code Quality**: ESLint, Prettier, TypeScript checks
2. **Security**: CodeQL analysis, dependency audit
3. **Unit Tests**: Multi-version Node.js testing
4. **Integration Tests**: With real databases
5. **Contract Tests**: Pact verification
6. **E2E Tests**: Full browser testing
7. **Performance Tests**: Load and stress testing
8. **Chaos Tests**: Resilience validation
9. **Deployment**: Automated staging deployment

### Test Reporting

- **Coverage Reports**: HTML and LCOV formats
- **Test Results**: JUnit XML for CI integration
- **Performance Metrics**: K6 and Artillery reports
- **Chaos Results**: Litmus experiment outcomes

## 🔍 Debugging Tests

### Common Issues

1. **Flaky Tests**: Use `test.retry()` and proper waits
2. **Timeout Issues**: Increase timeouts for slow operations
3. **Database Conflicts**: Use transaction rollbacks
4. **Port Conflicts**: Use dynamic port allocation

### Debug Commands

```bash
# Debug specific test
npm run test:unit -- --testNamePattern="specific test"

# Debug with verbose output
npm run test:unit -- --verbose

# Debug E2E tests with browser
npm run test:e2e:debug

# Debug performance tests
npm run test:load -- --debug
```

## 📚 Best Practices

### Test Writing Guidelines

1. **AAA Pattern**: Arrange, Act, Assert
2. **Descriptive Names**: Clear test descriptions
3. **Single Responsibility**: One assertion per test
4. **Independent Tests**: No test dependencies
5. **Fast Execution**: Optimize for speed

### Performance Testing

1. **Realistic Load**: Use production-like data volumes
2. **Gradual Ramp-up**: Avoid sudden load spikes
3. **Monitor Resources**: Track CPU, memory, database
4. **Baseline Comparison**: Compare against previous runs

### Chaos Engineering

1. **Start Small**: Begin with low-impact experiments
2. **Monitor Closely**: Watch system behavior
3. **Have Rollback Plans**: Quick recovery procedures
4. **Document Findings**: Learn from failures

## 🛠️ Tools and Technologies

- **Jest**: Unit and integration testing framework
- **Playwright**: End-to-end browser testing
- **Pact**: Consumer-driven contract testing
- **K6**: Performance and load testing
- **Artillery**: Load testing and monitoring
- **Litmus**: Chaos engineering platform
- **TestContainers**: Integration test infrastructure
- **Faker.js**: Test data generation

## 📞 Support

For testing-related questions:
- Check the test documentation
- Review existing test examples
- Ask in the #testing Slack channel
- Create an issue in the repository

## 🔄 Maintenance

### Regular Tasks

- Update test dependencies monthly
- Review and update test data quarterly
- Analyze test performance metrics
- Update chaos engineering scenarios
- Maintain test environment infrastructure

### Test Metrics Monitoring

- Test execution time trends
- Coverage percentage tracking
- Flaky test identification
- Performance regression detection
- Chaos experiment success rates
