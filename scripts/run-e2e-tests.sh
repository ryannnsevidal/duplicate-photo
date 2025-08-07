#!/bin/bash

# PixDupe E2E Test Runner
# Comprehensive end-to-end testing for the duplicate photo detection application

echo "🚀 PixDupe E2E Test Suite"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_TIMEOUT=60000
BASE_URL="http://localhost:8080"
TEST_MODE="demo"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if development server is running
check_server() {
    log_info "Checking if development server is running..."
    if curl -s "$BASE_URL" > /dev/null; then
        log_success "Development server is running at $BASE_URL"
        return 0
    else
        log_error "Development server is not running at $BASE_URL"
        return 1
    fi
}

# Start development server if needed
start_server() {
    log_info "Starting development server..."
    npm run dev &
    SERVER_PID=$!
    
    # Wait for server to be ready
    log_info "Waiting for server to be ready..."
    for i in {1..30}; do
        if curl -s "$BASE_URL" > /dev/null; then
            log_success "Development server is ready"
            return 0
        fi
        sleep 2
    done
    
    log_error "Failed to start development server"
    return 1
}

# Install Playwright browsers if needed
install_browsers() {
    log_info "Installing Playwright browsers..."
    npx playwright install chromium firefox webkit
    if [ $? -eq 0 ]; then
        log_success "Playwright browsers installed"
    else
        log_warning "Playwright browser installation had issues"
    fi
}

# Run specific test suite
run_test_suite() {
    local suite=$1
    local description=$2
    
    log_info "Running $description..."
    
    if [ "$suite" = "all" ]; then
        npx playwright test --timeout=$TEST_TIMEOUT
    else
        npx playwright test tests/e2e/$suite.spec.ts --timeout=$TEST_TIMEOUT
    fi
    
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        log_success "$description completed successfully"
    else
        log_error "$description failed with exit code $exit_code"
    fi
    
    return $exit_code
}

# Generate test report
generate_report() {
    log_info "Generating test report..."
    
    if [ -f "test-results/results.json" ]; then
        log_success "Test results saved to test-results/results.json"
    fi
    
    if [ -f "playwright-report/index.html" ]; then
        log_success "HTML report available at playwright-report/index.html"
        log_info "To view the report, run: npx playwright show-report"
    fi
}

# Cleanup function
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        log_info "Stopping development server..."
        kill $SERVER_PID 2>/dev/null
        wait $SERVER_PID 2>/dev/null
        log_success "Development server stopped"
    fi
}

# Main execution
main() {
    log_info "Starting PixDupe E2E Test Suite..."
    log_info "Base URL: $BASE_URL"
    log_info "Test Mode: $TEST_MODE"
    log_info "Timeout: ${TEST_TIMEOUT}ms"
    echo ""
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    # Check if we have the test files
    if [ ! -f "playwright.config.ts" ]; then
        log_error "Playwright configuration not found. Please run this from the project root."
        exit 1
    fi
    
    # Install browsers if needed
    install_browsers
    
    # Check if server is running, start if needed
    if ! check_server; then
        if ! start_server; then
            log_error "Cannot start development server. Exiting."
            exit 1
        fi
        SERVER_STARTED=true
    fi
    
    log_info "Starting test execution..."
    echo ""
    
    # Run test suites
    local overall_result=0
    
    # Parse command line arguments
    case "$1" in
        "auth")
            run_test_suite "auth" "Authentication Tests"
            overall_result=$?
            ;;
        "upload")
            run_test_suite "upload" "File Upload Tests"
            overall_result=$?
            ;;
        "admin")
            run_test_suite "admin" "Admin Dashboard Tests"
            overall_result=$?
            ;;
        "all"|"")
            log_info "Running all test suites..."
            
            run_test_suite "auth" "Authentication Tests"
            auth_result=$?
            
            run_test_suite "upload" "File Upload Tests" 
            upload_result=$?
            
            run_test_suite "admin" "Admin Dashboard Tests"
            admin_result=$?
            
            # Calculate overall result
            if [ $auth_result -eq 0 ] && [ $upload_result -eq 0 ] && [ $admin_result -eq 0 ]; then
                overall_result=0
            else
                overall_result=1
            fi
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [test-suite]"
            echo ""
            echo "Test Suites:"
            echo "  auth     - Authentication flow tests"
            echo "  upload   - File upload functionality tests"
            echo "  admin    - Admin dashboard tests"
            echo "  all      - Run all test suites (default)"
            echo "  help     - Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown test suite: $1"
            echo "Use '$0 help' to see available options"
            exit 1
            ;;
    esac
    
    # Generate report
    generate_report
    
    echo ""
    if [ $overall_result -eq 0 ]; then
        log_success "✅ All tests passed successfully!"
        log_info "The PixDupe application is working correctly."
    else
        log_error "❌ Some tests failed."
        log_info "Check the test output above and the HTML report for details."
    fi
    
    echo ""
    log_info "Test execution completed."
    exit $overall_result
}

# Run main function with all arguments
main "$@"
