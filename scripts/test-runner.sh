#!/bin/bash

# PIX DUPE DETECT - Comprehensive Test Runner
# Runs the complete test suite with proper setup and teardown

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_RESULTS_DIR="$PROJECT_DIR/test-results"
SERVER_PID=""
TEST_TYPE="${1:-all}"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Cleanup function
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        log_info "Stopping development server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
    
    # Clean up any remaining processes
    pkill -f "vite" 2>/dev/null || true
    pkill -f "playwright" 2>/dev/null || true
    
    log_info "Cleanup complete"
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Main execution
main() {
    cd "$PROJECT_DIR"
    
    log_info "🚀 Starting PIX DUPE DETECT Test Suite..."
    log_info "Test type: $TEST_TYPE"
    log_info "Project directory: $PROJECT_DIR"
    
    # Create test results directory
    mkdir -p "$TEST_RESULTS_DIR"
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        log_info "Installing npm dependencies..."
        npm ci
    fi
    
    # Install Playwright browsers if needed
    if [ ! -d "$HOME/.cache/ms-playwright" ]; then
        log_info "Installing Playwright browsers..."
        npx playwright install
        
        # Install system dependencies if on Linux
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            log_info "Installing Playwright system dependencies..."
            sudo npx playwright install-deps 2>/dev/null || log_warning "Could not install system dependencies (may require sudo)"
        fi
    fi
    
    # Run type checking
    log_info "🔍 Running type checks..."
    npm run type-check
    log_success "Type checking passed"
    
    # Run linting
    log_info "🧹 Running ESLint..."
    npm run lint
    log_success "Linting passed"
    
    # Run unit tests if requested
    if [[ "$TEST_TYPE" == "all" || "$TEST_TYPE" == "unit" ]]; then
        log_info "🧪 Running unit tests..."
        npm run test:unit
        log_success "Unit tests passed"
    fi
    
    # Run E2E tests if requested
    if [[ "$TEST_TYPE" == "all" || "$TEST_TYPE" == "e2e" || "$TEST_TYPE" == "auth" || "$TEST_TYPE" == "upload" || "$TEST_TYPE" == "admin" ]]; then
        log_info "🎭 Setting up E2E tests..."
        
        # Check if server is already running
        if curl -s http://localhost:8080 > /dev/null 2>&1; then
            log_warning "Development server already running on port 8080"
        else
            log_info "Starting development server..."
            npm run dev &
            SERVER_PID=$!
            
            # Wait for server to be ready
            log_info "Waiting for server to be ready..."
            for i in {1..30}; do
                if curl -s http://localhost:8080 > /dev/null 2>&1; then
                    log_success "Development server is ready"
                    break
                fi
                if [ $i -eq 30 ]; then
                    log_error "Server failed to start within 30 seconds"
                    exit 1
                fi
                sleep 1
            done
        fi
        
        # Run specific E2E test suites based on test type
        case "$TEST_TYPE" in
            "auth")
                log_info "🔐 Running authentication tests..."
                npx playwright test auth --reporter=line,html
                ;;
            "upload")
                log_info "📁 Running upload tests..."
                npx playwright test upload --reporter=line,html
                ;;
            "admin")
                log_info "🛡️ Running admin tests..."
                npx playwright test admin --reporter=line,html
                ;;
            "e2e"|"all")
                log_info "🎭 Running all E2E tests..."
                npx playwright test --reporter=line,html
                ;;
        esac
        
        log_success "E2E tests completed"
        
        # Generate test report
        if [ -f "$TEST_RESULTS_DIR/html-report/index.html" ]; then
            log_info "📊 Test report available at: $TEST_RESULTS_DIR/html-report/index.html"
        fi
    fi
    
    # Build test (verify application builds correctly)
    if [[ "$TEST_TYPE" == "all" || "$TEST_TYPE" == "build" ]]; then
        log_info "🔨 Testing production build..."
        npm run build
        log_success "Production build successful"
    fi
    
    log_success "🎉 All tests completed successfully!"
    
    # Summary
    echo ""
    echo "=========================================="
    echo "           TEST SUMMARY"
    echo "=========================================="
    echo "✅ Type checking: PASSED"
    echo "✅ Linting: PASSED"
    
    if [[ "$TEST_TYPE" == "all" || "$TEST_TYPE" == "unit" ]]; then
        echo "✅ Unit tests: PASSED"
    fi
    
    if [[ "$TEST_TYPE" == "all" || "$TEST_TYPE" == "e2e" || "$TEST_TYPE" == "auth" || "$TEST_TYPE" == "upload" || "$TEST_TYPE" == "admin" ]]; then
        echo "✅ E2E tests: PASSED"
    fi
    
    if [[ "$TEST_TYPE" == "all" || "$TEST_TYPE" == "build" ]]; then
        echo "✅ Production build: PASSED"
    fi
    
    echo "=========================================="
    echo ""
    echo "🚀 PIX DUPE DETECT is ready for deployment!"
}

# Help function
show_help() {
    echo "PIX DUPE DETECT Test Runner"
    echo ""
    echo "Usage: $0 [test_type]"
    echo ""
    echo "Test types:"
    echo "  all     - Run all tests (default)"
    echo "  unit    - Run unit tests only"
    echo "  e2e     - Run E2E tests only"
    echo "  auth    - Run authentication E2E tests"
    echo "  upload  - Run upload E2E tests"
    echo "  admin   - Run admin E2E tests"
    echo "  build   - Test production build only"
    echo "  help    - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Run all tests"
    echo "  $0 e2e          # Run E2E tests only"
    echo "  $0 auth         # Run auth tests only"
}

# Check for help
if [[ "$TEST_TYPE" == "help" || "$TEST_TYPE" == "-h" || "$TEST_TYPE" == "--help" ]]; then
    show_help
    exit 0
fi

# Run main function
main
