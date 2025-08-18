#!/bin/bash

echo "🔤 Enhanced Language Testing for CodeMitra"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:5001"
ROOM_ID="enhanced-lang-test-$(date +%s)"
TEST_USER_ID="test-user-$(date +%s)"

echo -e "${BLUE}🔧 Test Configuration:${NC}"
echo "Backend: $BACKEND_URL"
echo "Test Room ID: $ROOM_ID"
echo "Test User ID: $TEST_USER_ID"
echo ""

# Check if backend is running
echo -e "${BLUE}📡 Checking Backend...${NC}"
if ! curl -s "$BACKEND_URL/health" > /dev/null; then
    echo -e "${RED}❌ Backend is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running!${NC}"

# Function to run test
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "\n${YELLOW}🧪 Running: $test_name${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        return 1
    fi
}

# Function to create test room
create_test_room() {
    echo -e "\n${BLUE}🏠 Creating Test Room...${NC}"
    
    local room_response=$(curl -s -X POST "$BACKEND_URL/api/rooms" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"Enhanced Language Testing Room\",\"isPublic\":true,\"language\":\"javascript\"}")
    
    if echo "$room_response" | grep -q '"success".*true'; then
        echo -e "${GREEN}✅ Test room created successfully${NC}"
        # Extract room ID from response
        ROOM_ID=$(echo "$room_response" | grep -o '"[^"]*"' | head -1 | tr -d '"')
        echo "Room ID: $ROOM_ID"
        return 0
    else
        echo -e "${RED}❌ Failed to create test room${NC}"
        echo "Response: $room_response"
        return 1
    fi
}

# Function to test individual language
test_language() {
    local language=$1
    local test_name=$2
    
    echo -e "\n${PURPLE}🔤 Testing $language: $test_name${NC}"
    
    # Get test cases for the language
    local test_cases_response=$(curl -s "$BACKEND_URL/api/code/test-cases/$language" \
        -H "Content-Type: application/json")
    
    if echo "$test_cases_response" | grep -q '"success".*true'; then
        local test_count=$(echo "$test_cases_response" | grep -o '"count":[0-9]*' | cut -d':' -f2)
        echo -e "${GREEN}✅ Found $test_count test cases for $language${NC}"
        
        # Run comprehensive language testing
        local test_response=$(curl -s -X POST "$BACKEND_URL/api/code/test-languages" \
            -H "Content-Type: application/json" \
            -d "{\"roomId\":\"$ROOM_ID\",\"userId\":\"$TEST_USER_ID\"}")
        
        if echo "$test_response" | grep -q '"success".*true'; then
            echo -e "${GREEN}✅ $language comprehensive testing completed${NC}"
            
            # Extract results for this language
            local lang_results=$(echo "$test_response" | grep -o "\"$language\":{[^}]*}" | head -1)
            if [ -n "$lang_results" ]; then
                local passed=$(echo "$lang_results" | grep -o '"passedTests":[0-9]*' | cut -d':' -f2)
                local total=$(echo "$lang_results" | grep -o '"totalTests":[0-9]*' | cut -d':' -f2)
                local success_rate=$(echo "$lang_results" | grep -o '"successRate":[0-9.]*' | cut -d':' -f2)
                
                echo -e "${CYAN}📊 $language Results: $passed/$total tests passed (${success_rate}%)${NC}"
                
                if [ "$passed" -eq "$total" ]; then
                    return 0
                else
                    return 1
                fi
            fi
        else
            echo -e "${RED}❌ $language comprehensive testing failed${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Failed to get test cases for $language${NC}"
        return 1
    fi
}

# Function to test specific test case
test_specific_case() {
    local test_id=$1
    local language=$2
    
    echo -e "\n${CYAN}🎯 Testing Specific Case: $test_id ($language)${NC}"
    
    local test_response=$(curl -s -X POST "$BACKEND_URL/api/code/test-case/$test_id" \
        -H "Content-Type: application/json" \
        -d "{\"roomId\":\"$ROOM_ID\",\"userId\":\"$TEST_USER_ID\"}")
    
    if echo "$test_response" | grep -q '"success".*true'; then
        local passed=$(echo "$test_response" | grep -o '"passed":true\|"passed":false' | cut -d':' -f2)
        local test_name=$(echo "$test_response" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
        
        if [ "$passed" = "true" ]; then
            echo -e "${GREEN}✅ Test case '$test_name' passed${NC}"
            return 0
        else
            echo -e "${RED}❌ Test case '$test_name' failed${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Failed to execute test case $test_id${NC}"
        return 1
    fi
}

# Function to test basic code execution
test_basic_execution() {
    local language=$1
    local code=$2
    local expected_output=$3
    
    echo -e "\n${BLUE}▶️  Testing Basic Execution: $language${NC}"
    
    local execution_response=$(curl -s -X POST "$BACKEND_URL/api/code/execute" \
        -H "Content-Type: application/json" \
        -d "{\"code\":\"$code\",\"language\":\"$language\",\"roomId\":\"$ROOM_ID\",\"userId\":\"$TEST_USER_ID\"}")
    
    if echo "$execution_response" | grep -q '"success".*true'; then
        local output=$(echo "$execution_response" | grep -o '"output":"[^"]*"' | cut -d'"' -f4)
        local execution_time=$(echo "$execution_response" | grep -o '"executionTime":[0-9]*' | cut -d':' -f2)
        
        echo -e "${GREEN}✅ Execution successful (${execution_time}ms)${NC}"
        echo "Output: $output"
        
        if echo "$output" | grep -q "$expected_output"; then
            echo -e "${GREEN}✅ Output verification passed${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  Output verification failed (expected: $expected_output)${NC}"
            return 1
        fi
    else
        local error=$(echo "$execution_response" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
        echo -e "${RED}❌ Execution failed: $error${NC}"
        return 1
    fi
}

# Function to test error handling
test_error_handling() {
    local language=$1
    local code=$2
    local expected_error_type=$3
    
    echo -e "\n${BLUE}⚠️  Testing Error Handling: $language${NC}"
    
    local execution_response=$(curl -s -X POST "$BACKEND_URL/api/code/execute" \
        -H "Content-Type: application/json" \
        -d "{\"code\":\"$code\",\"language\":\"$language\",\"roomId\":\"$ROOM_ID\",\"userId\":\"$TEST_USER_ID\"}")
    
    if echo "$execution_response" | grep -q '"success".*false'; then
        local status=$(echo "$execution_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        local error=$(echo "$execution_response" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
        
        echo -e "${GREEN}✅ Error correctly detected${NC}"
        echo "Status: $status"
        echo "Error: $error"
        
        if [ "$status" = "$expected_error_type" ] || echo "$error" | grep -q "$expected_error_type"; then
            echo -e "${GREEN}✅ Error type verification passed${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  Error type verification failed (expected: $expected_error_type)${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Error not detected when expected${NC}"
        return 1
    fi
}

# Main test execution
echo -e "${BLUE}🚀 Starting Enhanced Language Testing...${NC}"

# Create test room
if ! create_test_room; then
    echo -e "${RED}❌ Cannot proceed without test room${NC}"
    exit 1
fi

# Test results tracking
total_tests=0
passed_tests=0

# Test 1: JavaScript Basic Execution
echo -e "\n${BLUE}🔍 Test 1: JavaScript Basic Execution${NC}"
if test_basic_execution "javascript" 'console.log("Hello from JavaScript!");' "Hello from JavaScript"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 2: Python Basic Execution
echo -e "\n${BLUE}🔍 Test 2: Python Basic Execution${NC}"
if test_basic_execution "python" 'print("Hello from Python!")' "Hello from Python"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 3: Java Basic Execution
echo -e "\n${BLUE}🔍 Test 3: Java Basic Execution${NC}"
java_code='public class Main { public static void main(String[] args) { System.out.println("Hello from Java!"); } }'
if test_basic_execution "java" "$java_code" "Hello from Java"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 4: C++ Basic Execution
echo -e "\n${BLUE}🔍 Test 4: C++ Basic Execution${NC}"
cpp_code='#include <iostream>\nint main() { std::cout << "Hello from C++!" << std::endl; return 0; }'
if test_basic_execution "cpp" "$cpp_code" "Hello from C++"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 5: C Basic Execution
echo -e "\n${BLUE}🔍 Test 5: C Basic Execution${NC}"
c_code='#include <stdio.h>\nint main() { printf("Hello from C!\\n"); return 0; }'
if test_basic_execution "c" "$c_code" "Hello from C"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 6: PHP Basic Execution
echo -e "\n${BLUE}🔍 Test 6: PHP Basic Execution${NC}"
if test_basic_execution "php" '<?php echo "Hello from PHP!"; ?>' "Hello from PHP"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 7: JavaScript Error Handling
echo -e "\n${BLUE}🔍 Test 7: JavaScript Error Handling${NC}"
if test_error_handling "javascript" 'console.log("Hello";' "SyntaxError"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 8: Python Error Handling
echo -e "\n${BLUE}🔍 Test 8: Python Error Handling${NC}"
if test_error_handling "python" 'print(undefined_variable)' "NameError"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 9: Java Compilation Error
echo -e "\n${BLUE}🔍 Test 9: Java Compilation Error${NC}"
java_error_code='public class Main { public static void main(String[] args) { System.out.println("Hello") } }'
if test_error_handling "java" "$java_error_code" "compilation_error"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 10: C++ Compilation Error
echo -e "\n${BLUE}🔍 Test 10: C++ Compilation Error${NC}"
cpp_error_code='#include <iostream>\nint main() { std::cout << "Hello" << std::endl return 0; }'
if test_error_handling "cpp" "$cpp_error_code" "compilation_error"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 11: Comprehensive JavaScript Testing
echo -e "\n${BLUE}🔍 Test 11: Comprehensive JavaScript Testing${NC}"
if test_language "javascript" "Comprehensive Test Suite"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 12: Comprehensive Python Testing
echo -e "\n${BLUE}🔍 Test 12: Comprehensive Python Testing${NC}"
if test_language "python" "Comprehensive Test Suite"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 13: Comprehensive Java Testing
echo -e "\n${BLUE}🔍 Test 13: Comprehensive Java Testing${NC}"
if test_language "java" "Comprehensive Test Suite"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 14: Comprehensive C++ Testing
echo -e "\n${BLUE}🔍 Test 14: Comprehensive C++ Testing${NC}"
if test_language "cpp" "Comprehensive Test Suite"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 15: Comprehensive C Testing
echo -e "\n${BLUE}🔍 Test 15: Comprehensive C Testing${NC}"
if test_language "c" "Comprehensive Test Suite"; then
    ((passed_tests++))
fi
((total_tests++))

# Test 16: Comprehensive PHP Testing
echo -e "\n${BLUE}🔍 Test 16: Comprehensive PHP Testing${NC}"
if test_language "php" "Comprehensive Test Suite"; then
    ((passed_tests++))
fi
((total_tests++))

# Summary
echo -e "\n${BLUE}📋 Enhanced Language Testing Summary${NC}"
echo "=========================================="
echo "Total Tests: $total_tests"
echo "Passed: $passed_tests"
echo "Failed: $((total_tests - passed_tests))"
echo "Success Rate: $(( (passed_tests * 100) / total_tests ))%"

# Performance assessment
echo -e "\n${BLUE}📈 Language Performance Assessment${NC}"
echo "======================================"

local success_rate=$(( (passed_tests * 100) / total_tests ))
if [ $success_rate -eq 100 ]; then
    echo -e "${GREEN}🎉 Perfect! All language tests passed${NC}"
    echo "Your CodeMitra system supports all 6 languages flawlessly!"
elif [ $success_rate -ge 90 ]; then
    echo -e "${GREEN}✅ Excellent! Most language tests passed${NC}"
    echo "Minor issues detected, but overall language support is solid."
elif [ $success_rate -ge 75 ]; then
    echo -e "${YELLOW}⚠️  Good! Many language tests passed${NC}"
    echo "Several issues detected, review and fix as needed."
else
    echo -e "${RED}❌ Poor! Many language tests failed${NC}"
    echo "Significant language support issues detected, immediate attention required."
fi

echo ""
echo -e "${GREEN}🎉 Enhanced Language Testing Complete!${NC}"
echo ""
echo "Next Steps:"
echo "1. Review any failed tests above"
echo "2. Check backend logs for detailed error information"
echo "3. Verify language runtimes are properly installed"
echo "4. Test with more complex code examples"
echo "5. Move to Phase 5 (Advanced Features) if desired"
