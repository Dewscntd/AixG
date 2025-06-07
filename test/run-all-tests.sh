#!/bin/bash

# FootAnalytics Comprehensive Test Runner
# Executes all test suites in the correct order with proper setup and teardown

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV=${TEST_ENV:-"test"}
PARALLEL_JOBS=${PARALLEL_JOBS:-4}
COVERAGE_THRESHOLD=${COVERAGE_THRESHOLD:-90}
SKIP_SLOW_TESTS=${SKIP_SLOW_TESTS:-false}
SKIP_CHAOS_TESTS=${SKIP_CHAOS_TESTS:-true}

# Test results directory
RESULTS_DIR="test-results"
mkdir -p $RESULTS_DIR

# Logging
LOG_FILE="$RESULTS_DIR/test-run-$(date +%Y%m%d-%H%M%S).log"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1" | tee -a $LOG_FILE
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1" | tee -a $LOG_FILE
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1" | tee -a $LOG_FILE
}

# Cleanup function
cleanup() {
    log "Cleaning up test environment..."
    
    # Stop any running containers
    docker-compose -f docker-compose.test.yml down --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.perf.yml down --remove-orphans 2>/dev/null || true
    
    # Kill any remaining test processes
    pkill -f "jest" 2>/dev/null || true
    pkill -f "playwright" 2>/dev/null || true
    pkill -f "k6" 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Set up trap for cleanup
trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    log_success "All prerequisites are available"
}

# Setup test environment
setup_environment() {
    log "Setting up test environment..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "Installing dependencies..."
        npm ci
    fi
    
    # Create test database
    log "Setting up test database..."
    docker-compose -f docker-compose.test.yml up -d postgres redis
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 10
    
    # Run database migrations
    log "Running database migrations..."
    npm run db:migrate:test || {
        log_error "Database migration failed"
        exit 1
    }
    
    log_success "Test environment setup completed"
}

# Run unit tests
run_unit_tests() {
    log "Running unit tests..."
    
    npm run test:unit -- \
        --coverage \
        --coverageDirectory="$RESULTS_DIR/coverage/unit" \
        --coverageReporters=text,lcov,html \
        --maxWorkers=$PARALLEL_JOBS \
        --testResultsProcessor="jest-sonar-reporter" \
        --outputFile="$RESULTS_DIR/unit-test-results.xml" || {
        log_error "Unit tests failed"
        return 1
    }
    
    log_success "Unit tests completed"
}

# Run integration tests
run_integration_tests() {
    log "Running integration tests..."
    
    npm run test:integration -- \
        --coverageDirectory="$RESULTS_DIR/coverage/integration" \
        --testResultsProcessor="jest-sonar-reporter" \
        --outputFile="$RESULTS_DIR/integration-test-results.xml" || {
        log_error "Integration tests failed"
        return 1
    }
    
    log_success "Integration tests completed"
}

# Run contract tests
run_contract_tests() {
    log "Running contract tests..."
    
    npm run test:contract -- \
        --testResultsProcessor="jest-sonar-reporter" \
        --outputFile="$RESULTS_DIR/contract-test-results.xml" || {
        log_error "Contract tests failed"
        return 1
    }
    
    # Publish contracts if on main branch
    if [ "$CI" = "true" ] && [ "$GITHUB_REF" = "refs/heads/main" ]; then
        log "Publishing Pact contracts..."
        npm run pact:publish || log_warning "Failed to publish Pact contracts"
    fi
    
    log_success "Contract tests completed"
}

# Run E2E tests
run_e2e_tests() {
    log "Running E2E tests..."
    
    # Start full application stack
    docker-compose -f docker-compose.test.yml up -d
    
    # Wait for services
    npm run wait-for-services || {
        log_error "Services failed to start"
        return 1
    }
    
    # Install Playwright browsers if needed
    npx playwright install --with-deps
    
    # Run E2E tests
    npm run test:e2e || {
        log_error "E2E tests failed"
        return 1
    }
    
    log_success "E2E tests completed"
}

# Run performance tests
run_performance_tests() {
    if [ "$SKIP_SLOW_TESTS" = "true" ]; then
        log_warning "Skipping performance tests (SKIP_SLOW_TESTS=true)"
        return 0
    fi
    
    log "Running performance tests..."
    
    # Start performance test environment
    docker-compose -f docker-compose.perf.yml up -d
    
    # Wait for services
    npm run wait-for-services || {
        log_error "Performance test services failed to start"
        return 1
    }
    
    # Run load tests
    log "Running load tests..."
    npm run test:load || {
        log_error "Load tests failed"
        return 1
    }
    
    # Run stress tests
    log "Running stress tests..."
    npm run test:stress || {
        log_error "Stress tests failed"
        return 1
    }
    
    log_success "Performance tests completed"
}

# Run chaos engineering tests
run_chaos_tests() {
    if [ "$SKIP_CHAOS_TESTS" = "true" ]; then
        log_warning "Skipping chaos engineering tests (SKIP_CHAOS_TESTS=true)"
        return 0
    fi
    
    log "Running chaos engineering tests..."
    
    # Check if running in Kubernetes environment
    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not found, skipping chaos tests"
        return 0
    fi
    
    # Run chaos tests
    npm run test:chaos || {
        log_error "Chaos engineering tests failed"
        return 1
    }
    
    log_success "Chaos engineering tests completed"
}

# Generate test reports
generate_reports() {
    log "Generating test reports..."
    
    # Merge coverage reports
    if [ -d "$RESULTS_DIR/coverage" ]; then
        log "Merging coverage reports..."
        npx nyc merge "$RESULTS_DIR/coverage" "$RESULTS_DIR/coverage/merged-coverage.json"
        npx nyc report --reporter=html --reporter=text --temp-dir="$RESULTS_DIR/coverage" --report-dir="$RESULTS_DIR/coverage/merged"
    fi
    
    # Generate HTML test report
    log "Generating HTML test report..."
    cat > "$RESULTS_DIR/test-report.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>FootAnalytics Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background: #d4edda; border-color: #c3e6cb; }
        .error { background: #f8d7da; border-color: #f5c6cb; }
        .warning { background: #fff3cd; border-color: #ffeaa7; }
    </style>
</head>
<body>
    <div class="header">
        <h1>FootAnalytics Test Report</h1>
        <p>Generated: $(date)</p>
        <p>Environment: $TEST_ENV</p>
    </div>
    
    <div class="section">
        <h2>Test Summary</h2>
        <p>Check individual test result files for detailed information.</p>
    </div>
</body>
</html>
EOF
    
    log_success "Test reports generated"
}

# Main execution
main() {
    log "Starting FootAnalytics comprehensive test suite..."
    log "Configuration:"
    log "  - Environment: $TEST_ENV"
    log "  - Parallel jobs: $PARALLEL_JOBS"
    log "  - Coverage threshold: $COVERAGE_THRESHOLD%"
    log "  - Skip slow tests: $SKIP_SLOW_TESTS"
    log "  - Skip chaos tests: $SKIP_CHAOS_TESTS"
    
    # Track test results
    FAILED_TESTS=()
    
    # Run test phases
    check_prerequisites
    setup_environment
    
    # Unit tests
    if ! run_unit_tests; then
        FAILED_TESTS+=("unit")
    fi
    
    # Integration tests
    if ! run_integration_tests; then
        FAILED_TESTS+=("integration")
    fi
    
    # Contract tests
    if ! run_contract_tests; then
        FAILED_TESTS+=("contract")
    fi
    
    # E2E tests
    if ! run_e2e_tests; then
        FAILED_TESTS+=("e2e")
    fi
    
    # Performance tests
    if ! run_performance_tests; then
        FAILED_TESTS+=("performance")
    fi
    
    # Chaos tests
    if ! run_chaos_tests; then
        FAILED_TESTS+=("chaos")
    fi
    
    # Generate reports
    generate_reports
    
    # Summary
    log "Test execution completed"
    
    if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
        log_success "All tests passed! 🎉"
        exit 0
    else
        log_error "Failed test suites: ${FAILED_TESTS[*]}"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-all}" in
    "unit")
        check_prerequisites
        setup_environment
        run_unit_tests
        ;;
    "integration")
        check_prerequisites
        setup_environment
        run_integration_tests
        ;;
    "contract")
        check_prerequisites
        setup_environment
        run_contract_tests
        ;;
    "e2e")
        check_prerequisites
        setup_environment
        run_e2e_tests
        ;;
    "performance")
        check_prerequisites
        setup_environment
        run_performance_tests
        ;;
    "chaos")
        check_prerequisites
        setup_environment
        run_chaos_tests
        ;;
    "all"|*)
        main
        ;;
esac
