#!/bin/bash

# 🧪 FootAnalytics Test Runner Script
# Comprehensive testing execution with proper setup and teardown

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_RESULTS_DIR="test-results"
COVERAGE_DIR="coverage"
LOG_FILE="$TEST_RESULTS_DIR/test-execution.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Setup test environment
setup_test_env() {
    log "Setting up test environment..."
    
    # Create test results directory
    mkdir -p "$TEST_RESULTS_DIR"
    mkdir -p "$COVERAGE_DIR"
    
    # Clear previous logs
    > "$LOG_FILE"
    
    # Set test environment variables
    export NODE_ENV=test
    export UPDATE_SNAPSHOTS=${UPDATE_SNAPSHOTS:-false}
    export JEST_TIMEOUT=${JEST_TIMEOUT:-30000}
    
    success "Test environment setup complete"
}

# Run unit tests
run_unit_tests() {
    log "Running unit tests..."
    
    if npm run test:unit 2>&1 | tee -a "$LOG_FILE"; then
        success "Unit tests passed"
        return 0
    else
        error "Unit tests failed"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    log "Running integration tests..."
    
    # Check if Docker is available for testcontainers
    if ! command -v docker &> /dev/null; then
        warning "Docker not found. Skipping integration tests."
        return 0
    fi
    
    if npm run test:integration 2>&1 | tee -a "$LOG_FILE"; then
        success "Integration tests passed"
        return 0
    else
        error "Integration tests failed"
        return 1
    fi
}

# Run contract tests
run_contract_tests() {
    log "Running contract tests..."
    
    if npm run test:contract 2>&1 | tee -a "$LOG_FILE"; then
        success "Contract tests passed"
        return 0
    else
        error "Contract tests failed"
        return 1
    fi
}

# Run property-based tests
run_property_tests() {
    log "Running property-based tests..."
    
    if npm run test:property 2>&1 | tee -a "$LOG_FILE"; then
        success "Property-based tests passed"
        return 0
    else
        error "Property-based tests failed"
        return 1
    fi
}

# Run snapshot tests
run_snapshot_tests() {
    log "Running snapshot tests..."
    
    if npm run test:snapshot 2>&1 | tee -a "$LOG_FILE"; then
        success "Snapshot tests passed"
        return 0
    else
        error "Snapshot tests failed"
        return 1
    fi
}

# Run end-to-end tests
run_e2e_tests() {
    log "Running end-to-end tests..."
    
    if npm run test:e2e 2>&1 | tee -a "$LOG_FILE"; then
        success "End-to-end tests passed"
        return 0
    else
        error "End-to-end tests failed"
        return 1
    fi
}

# Run performance tests
run_performance_tests() {
    log "Running performance tests..."
    
    # Check if performance testing is enabled
    if [[ "${RUN_PERFORMANCE_TESTS}" != "true" ]]; then
        warning "Performance tests skipped (set RUN_PERFORMANCE_TESTS=true to enable)"
        return 0
    fi
    
    if npm run test:performance 2>&1 | tee -a "$LOG_FILE"; then
        success "Performance tests passed"
        return 0
    else
        error "Performance tests failed"
        return 1
    fi
}

# Generate coverage report
generate_coverage() {
    log "Generating coverage report..."
    
    if npm run test:coverage 2>&1 | tee -a "$LOG_FILE"; then
        success "Coverage report generated"
        
        # Check coverage thresholds
        if [[ -f "$COVERAGE_DIR/coverage-summary.json" ]]; then
            log "Coverage summary:"
            cat "$COVERAGE_DIR/coverage-summary.json" | jq '.total' 2>/dev/null || true
        fi
        
        return 0
    else
        error "Coverage generation failed"
        return 1
    fi
}

# Run security tests
run_security_tests() {
    log "Running security tests..."
    
    # Check if security testing is enabled
    if [[ "${RUN_SECURITY_TESTS}" != "true" ]]; then
        warning "Security tests skipped (set RUN_SECURITY_TESTS=true to enable)"
        return 0
    fi
    
    if npm run test:security 2>&1 | tee -a "$LOG_FILE"; then
        success "Security tests passed"
        return 0
    else
        error "Security tests failed"
        return 1
    fi
}

# Cleanup test environment
cleanup_test_env() {
    log "Cleaning up test environment..."
    
    # Stop any running test containers
    if command -v docker &> /dev/null; then
        docker ps -q --filter "label=testcontainer" | xargs -r docker stop 2>/dev/null || true
    fi
    
    # Clean up temporary files
    find . -name "*.tmp" -type f -delete 2>/dev/null || true
    
    success "Test environment cleanup complete"
}

# Main execution
main() {
    local test_type="${1:-all}"
    local exit_code=0
    
    log "🧪 Starting FootAnalytics test execution (type: $test_type)"
    
    # Setup
    setup_test_env
    
    # Run tests based on type
    case "$test_type" in
        "unit")
            run_unit_tests || exit_code=1
            ;;
        "integration")
            run_integration_tests || exit_code=1
            ;;
        "contract")
            run_contract_tests || exit_code=1
            ;;
        "property")
            run_property_tests || exit_code=1
            ;;
        "snapshot")
            run_snapshot_tests || exit_code=1
            ;;
        "e2e")
            run_e2e_tests || exit_code=1
            ;;
        "performance")
            run_performance_tests || exit_code=1
            ;;
        "security")
            run_security_tests || exit_code=1
            ;;
        "coverage")
            generate_coverage || exit_code=1
            ;;
        "all")
            run_unit_tests || exit_code=1
            run_integration_tests || exit_code=1
            run_contract_tests || exit_code=1
            run_property_tests || exit_code=1
            run_snapshot_tests || exit_code=1
            generate_coverage || exit_code=1
            ;;
        "ci")
            run_unit_tests || exit_code=1
            run_integration_tests || exit_code=1
            run_contract_tests || exit_code=1
            generate_coverage || exit_code=1
            run_security_tests || exit_code=1
            ;;
        *)
            error "Unknown test type: $test_type"
            echo "Usage: $0 [unit|integration|contract|property|snapshot|e2e|performance|security|coverage|all|ci]"
            exit 1
            ;;
    esac
    
    # Cleanup
    cleanup_test_env
    
    # Final report
    if [[ $exit_code -eq 0 ]]; then
        success "🎉 All tests completed successfully!"
        log "Test results available in: $TEST_RESULTS_DIR"
        log "Coverage report available in: $COVERAGE_DIR"
    else
        error "💥 Some tests failed. Check logs for details."
        log "Full log available at: $LOG_FILE"
    fi
    
    exit $exit_code
}

# Handle script interruption
trap cleanup_test_env EXIT

# Run main function with all arguments
main "$@"
