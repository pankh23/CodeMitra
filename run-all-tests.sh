#!/bin/bash

echo "🧪 CodeMitra Complete Testing Suite"
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test configuration
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:5001"
START_TIME=$(date +%s)

echo -e "${BLUE}🔧 Test Configuration:${NC}"
echo "Frontend: $FRONTEND_URL"
echo "Backend: $BACKEND_URL"
echo "Start Time: $(date)"
echo ""

# Test results tracking
declare -A test_results
total_tests=0
passed_tests=0
failed_tests=0

# Function to run test suite
run_test_suite() {
    local suite_name=$1
    local script_path=$2
    local description=$3
    
    echo -e "\n${PURPLE}🚀 Running Test Suite: $suite_name${NC}"
    echo "=========================================="
    echo "Description: $description"
    echo ""
    
    if [ -f "$script_path" ] && [ -x "$script_path" ]; then
        echo -e "${CYAN}Executing: $script_path${NC}"
        
        # Run the test script
        if "$script_path"; then
            echo -e "\n${GREEN}✅ $suite_name completed successfully${NC}"
            test_results["$suite_name"]="PASSED"
            ((passed_tests++))
        else
            echo -e "\n${RED}❌ $suite_name failed${NC}"
            test_results["$suite_name"]="FAILED"
            ((failed_tests++))
        fi
    else
        echo -e "${RED}❌ Test script not found or not executable: $script_path${NC}"
        test_results["$suite_name"]="NOT_FOUND"
        ((failed_tests++))
    fi
    
    ((total_tests++))
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking Prerequisites...${NC}"
    echo "================================"
    
    # Check if scripts exist
    local scripts=(
        "test-collaboration.sh"
        "test-performance.sh"
        "test-languages.sh"
        "test-cors.sh"
        "test-endpoints.sh"
    )
    
    local missing_scripts=()
    for script in "${scripts[@]}"; do
        if [ ! -f "$script" ]; then
            missing_scripts+=("$script")
        fi
    done
    
    if [ ${#missing_scripts[@]} -gt 0 ]; then
        echo -e "${RED}❌ Missing test scripts:${NC}"
        for script in "${missing_scripts[@]}"; do
            echo "  - $script"
        done
        echo ""
        echo "Please ensure all test scripts are present before running the test suite."
        return 1
    fi
    
    echo -e "${GREEN}✅ All test scripts found${NC}"
    
    # Check if services are running
    echo -e "\n${BLUE}📡 Checking Services...${NC}"
    
    local frontend_running=false
    local backend_running=false
    
    # Check frontend
    if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is running${NC}"
        frontend_running=true
    else
        echo -e "${RED}❌ Frontend is not running${NC}"
    fi
    
    # Check backend
    if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is running${NC}"
        backend_running=true
    else
        echo -e "${RED}❌ Backend is not running${NC}"
    fi
    
    if [ "$frontend_running" = true ] && [ "$backend_running" = true ]; then
        echo -e "\n${GREEN}✅ All services are running!${NC}"
        return 0
    else
        echo -e "\n${RED}❌ Some services are not running${NC}"
        echo "Please start the required services before running tests."
        return 1
    fi
}

# Function to display test progress
show_progress() {
    local current=$1
    local total=$2
    local suite_name=$3
    
    local percentage=$(( (current * 100) / total ))
    local filled=$(( (percentage * 40) / 100 ))
    local empty=$(( 40 - filled ))
    
    printf "\r${CYAN}[%s] Progress: [%s%s] %d%% (%d/%d) - %s${NC}" \
        "$(date '+%H:%M:%S')" \
        "$(printf '█%.0s' $(seq 1 $filled))" \
        "$(printf '░%.0s' $(seq 1 $empty))" \
        "$percentage" \
        "$current" \
        "$total" \
        "$suite_name"
}

# Function to display final results
display_results() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    
    echo -e "\n${BLUE}📊 Final Test Results${NC}"
    echo "========================"
    echo ""
    
    # Individual test results
    for suite in "${!test_results[@]}"; do
        local result="${test_results[$suite]}"
        case $result in
            "PASSED")
                echo -e "${GREEN}✅ $suite: PASSED${NC}"
                ;;
            "FAILED")
                echo -e "${RED}❌ $suite: FAILED${NC}"
                ;;
            "NOT_FOUND")
                echo -e "${YELLOW}⚠️  $suite: NOT_FOUND${NC}"
                ;;
        esac
    done
    
    echo ""
    echo -e "${BLUE}📈 Summary Statistics${NC}"
    echo "========================"
    echo "Total Test Suites: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $failed_tests"
    echo "Success Rate: $(( (passed_tests * 100) / total_tests ))%"
    echo "Total Duration: ${duration}s"
    
    # Performance assessment
    echo -e "\n${BLUE}📊 Performance Assessment${NC}"
    echo "=============================="
    
    local success_rate=$(( (passed_tests * 100) / total_tests ))
    if [ $success_rate -eq 100 ]; then
        echo -e "${GREEN}🎉 Perfect! All test suites passed${NC}"
        echo "Your CodeMitra system is working flawlessly!"
    elif [ $success_rate -ge 80 ]; then
        echo -e "${GREEN}✅ Excellent! Most test suites passed${NC}"
        echo "Minor issues detected, but overall system is solid."
    elif [ $success_rate -ge 60 ]; then
        echo -e "${YELLOW}⚠️  Good! Some test suites passed${NC}"
        echo "Several issues detected, review and fix as needed."
    else
        echo -e "${RED}❌ Poor! Many test suites failed${NC}"
        echo "Significant issues detected, immediate attention required."
    fi
}

# Function to generate test report
generate_report() {
    local report_file="test-report-$(date +%Y%m%d-%H%M%S).txt"
    
    echo -e "\n${BLUE}📝 Generating Test Report...${NC}"
    
    {
        echo "CodeMitra Test Report"
        echo "====================="
        echo "Generated: $(date)"
        echo "Duration: $(( $(date +%s) - START_TIME ))s"
        echo ""
        
        echo "Test Results:"
        echo "-------------"
        for suite in "${!test_results[@]}"; do
            echo "$suite: ${test_results[$suite]}"
        done
        
        echo ""
        echo "Summary:"
        echo "--------"
        echo "Total: $total_tests"
        echo "Passed: $passed_tests"
        echo "Failed: $failed_tests"
        echo "Success Rate: $(( (passed_tests * 100) / total_tests ))%"
        
    } > "$report_file"
    
    echo -e "${GREEN}✅ Test report saved to: $report_file${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting CodeMitra Complete Testing Suite${NC}"
    echo ""
    
    # Check prerequisites
    if ! check_prerequisites; then
        echo -e "${RED}❌ Prerequisites not met. Exiting.${NC}"
        exit 1
    fi
    
    echo -e "\n${GREEN}✅ Prerequisites met. Starting tests...${NC}"
    echo ""
    
    # Define test suites
    local test_suites=(
        "Collaboration Testing|test-collaboration.sh|Real-time collaborative editing features"
        "Performance Testing|test-performance.sh|System performance under load"
        "Language Testing|test-languages.sh|All 6 supported programming languages"
        "CORS Testing|test-cors.sh|Cross-origin resource sharing configuration"
        "Endpoint Testing|test-endpoints.sh|API endpoint functionality"
    )
    
    local current=0
    local total=${#test_suites[@]}
    
    # Run each test suite
    for suite in "${test_suites[@]}"; do
        IFS='|' read -r suite_name script_path description <<< "$suite"
        
        current=$((current + 1))
        show_progress $current $total "$suite_name"
        
        run_test_suite "$suite_name" "$script_path" "$description"
        
        # Small delay between tests
        sleep 2
    done
    
    echo ""
    echo -e "${GREEN}🎉 All test suites completed!${NC}"
    
    # Display results
    display_results
    
    # Generate report
    generate_report
    
    echo ""
    echo -e "${BLUE}🚀 Testing Complete!${NC}"
    echo ""
    echo "Next Steps:"
    if [ $failed_tests -gt 0 ]; then
        echo "1. Review failed test results above"
        echo "2. Check the generated test report"
        echo "3. Fix identified issues"
        echo "4. Re-run specific test suites as needed"
    else
        echo "1. 🎉 All tests passed! Your system is ready."
        echo "2. Review the test report for detailed results"
        echo "3. Consider running performance tests in production environment"
        echo "4. Set up automated testing for CI/CD pipeline"
    fi
}

# Run main function
main "$@"
