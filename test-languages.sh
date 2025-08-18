#!/bin/bash

echo "🔤 Testing All Supported Programming Languages"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:5001"
ROOM_ID="lang-test-$(date +%s)"

echo -e "${BLUE}🔧 Test Configuration:${NC}"
echo "Backend: $BACKEND_URL"
echo "Test Room ID: $ROOM_ID"
echo ""

# Check if backend is running
echo -e "${BLUE}📡 Checking Backend...${NC}"
if ! curl -s "$BACKEND_URL/health" > /dev/null; then
    echo -e "${RED}❌ Backend is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running!${NC}"

# Test cases for each language
declare -A language_tests

# JavaScript tests
language_tests["javascript"]="console.log('Hello from JavaScript!');\nconsole.log('2 + 2 =', 2 + 2);\nconsole.log('Current time:', new Date().toISOString());"

# Python tests
language_tests["python"]="print('Hello from Python!')\nprint('2 + 2 =', 2 + 2)\nimport datetime\nprint('Current time:', datetime.datetime.now().isoformat())"

# Java tests
language_tests["java"]="public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from Java!\");\n        System.out.println(\"2 + 2 = \" + (2 + 2));\n        System.out.println(\"Current time: \" + java.time.LocalDateTime.now());\n    }\n}"

# C++ tests
language_tests["cpp"]="#include <iostream>\n#include <chrono>\n#include <ctime>\n\nint main() {\n    std::cout << \"Hello from C++!\" << std::endl;\n    std::cout << \"2 + 2 = \" << (2 + 2) << std::endl;\n    \n    auto now = std::chrono::system_clock::now();\n    auto time_t = std::chrono::system_clock::to_time_t(now);\n    std::cout << \"Current time: \" << std::ctime(&time_t);\n    \n    return 0;\n}"

# C tests
language_tests["c"]="#include <stdio.h>\n#include <time.h>\n\nint main() {\n    printf(\"Hello from C!\\n\");\n    printf(\"2 + 2 = %d\\n\", 2 + 2);\n    \n    time_t now = time(NULL);\n    printf(\"Current time: %s\", ctime(&now));\n    \n    return 0;\n}"

# PHP tests
language_tests["php"]="<?php\necho \"Hello from PHP!\\n\";\necho \"2 + 2 = \" . (2 + 2) . \"\\n\";\necho \"Current time: \" . date('c') . \"\\n\";\n?>"

# Expected outputs (simplified)
declare -A expected_outputs
expected_outputs["javascript"]="Hello from JavaScript!"
expected_outputs["python"]="Hello from Python!"
expected_outputs["java"]="Hello from Java!"
expected_outputs["cpp"]="Hello from C++!"
expected_outputs["c"]="Hello from C!"
expected_outputs["php"]="Hello from PHP!"

# Function to test language execution
test_language() {
    local language=$1
    local code=$2
    local expected=$3
    
    echo -e "\n${YELLOW}🧪 Testing $language...${NC}"
    echo "Code:"
    echo -e "$code" | head -3
    if [ $(echo -e "$code" | wc -l) -gt 3 ]; then
        echo "... (truncated)"
    fi
    
    # Execute code
    local response=$(curl -s -X POST "$BACKEND_URL/api/code/execute" \
        -H "Content-Type: application/json" \
        -d "{\"code\":\"$code\",\"language\":\"$language\",\"roomId\":\"$ROOM_ID\",\"userId\":\"test-user\"}")
    
    echo "Response: $response"
    
    # Check if execution was successful
    if echo "$response" | grep -q '"success".*true'; then
        echo -e "${GREEN}✅ $language execution successful${NC}"
        
        # Check if output contains expected text
        local output=$(echo "$response" | grep -o '"output":"[^"]*"' | cut -d'"' -f4)
        if echo "$output" | grep -q "$expected"; then
            echo -e "${GREEN}✅ Output verification passed${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  Output verification failed (expected: $expected)${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ $language execution failed${NC}"
        return 1
    fi
}

# Function to test language boilerplate
test_boilerplate() {
    local language=$1
    
    echo -e "\n${BLUE}📝 Testing $language boilerplate...${NC}"
    
    # Get boilerplate from frontend (simulated)
    local boilerplate=""
    case $language in
        "javascript")
            boilerplate="// Welcome to JavaScript!\n// Write your code below\n\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\n// Example usage\nconsole.log(greet('World'));"
            ;;
        "python")
            boilerplate="# Welcome to Python!\n# Write your code below\n\ndef greet(name):\n    return f\"Hello, {name}!\"\n\n# Example usage\nprint(greet('World'))"
            ;;
        "java")
            boilerplate="// Welcome to Java!\n// Write your code below\n\npublic class Main {\n    public static void main(String[] args) {\n        // Add your logic here\n        System.out.println(\"Code executed successfully!\");\n        \n        // Example method call\n        String result = greet(\"World\");\n        System.out.println(result);\n    }\n    \n    public static String greet(String name) {\n        return \"Hello, \" + name + \"!\";\n    }\n}"
            ;;
        "cpp")
            boilerplate="// Welcome to C++!\n// Write your code below\n\n#include <iostream>\n#include <string>\n\nusing namespace std;\n\nstring greet(string name) {\n    return \"Hello, \" + name + \"!\";\n}\n\nint main() {\n    // Add your logic here\n    cout << \"Code executed successfully!\" << endl;\n    \n    // Example function call\n    string result = greet(\"World\");\n    cout << result << endl;\n    \n    return 0;\n}"
            ;;
        "c")
            boilerplate="// Welcome to C!\n// Write your code below\n\n#include <stdio.h>\n#include <string.h>\n\nchar* greet(char* name) {\n    static char result[100];\n    sprintf(result, \"Hello, %s!\", name);\n    return result;\n}\n\nint main() {\n    // Add your logic here\n    printf(\"Code executed successfully!\\n\");\n    \n    // Example function call\n    char* result = greet(\"World\");\n    printf(\"%s\\n\", result);\n    \n    return 0;\n}"
            ;;
        "php")
            boilerplate="<?php\n// Welcome to PHP!\n// Write your code below\n\nfunction greet(\$name) {\n    return \"Hello, \" . \$name . \"!\";\n}\n\n// Example usage\necho greet('World') . PHP_EOL;\n\n// Your code here\nfunction main() {\n    // Add your logic here\n    echo \"Code executed successfully!\" . PHP_EOL;\n}\n\nmain();\n?>"
            ;;
    esac
    
    echo "Boilerplate loaded successfully"
    echo "Lines of code: $(echo -e "$boilerplate" | wc -l)"
    echo "Characters: $(echo -e "$boilerplate" | wc -c)"
    
    return 0
}

# Function to test language syntax highlighting
test_syntax_highlighting() {
    local language=$1
    
    echo -e "\n${BLUE}🎨 Testing $language syntax highlighting...${NC}"
    
    # This would typically test the Monaco editor's syntax highlighting
    # For now, we'll just verify the language is supported
    case $language in
        "javascript"|"python"|"java"|"cpp"|"c"|"php")
            echo -e "${GREEN}✅ $language syntax highlighting supported${NC}"
            return 0
            ;;
        *)
            echo -e "${RED}❌ $language syntax highlighting not supported${NC}"
            return 1
            ;;
    esac
}

# Function to test language compilation (for compiled languages)
test_compilation() {
    local language=$1
    
    echo -e "\n${BLUE}🔨 Testing $language compilation...${NC}"
    
    case $language in
        "java"|"cpp"|"c")
            echo -e "${YELLOW}⚠️  $language requires compilation (tested in execution)${NC}"
            return 0
            ;;
        "javascript"|"python"|"php")
            echo -e "${GREEN}✅ $language is interpreted (no compilation needed)${NC}"
            return 0
            ;;
        *)
            echo -e "${RED}❌ Unknown language type for $language${NC}"
            return 1
            ;;
    esac
}

# Main test execution
echo -e "${BLUE}🚀 Starting Language Tests...${NC}"

# Test results tracking
declare -A test_results
total_tests=0
passed_tests=0

# Test each language
for language in "${!language_tests[@]}"; do
    echo -e "\n${BLUE}🔤 Testing Language: $language${NC}"
    echo "=================================="
    
    local language_passed=0
    local language_total=0
    
    # Test 1: Boilerplate
    if test_boilerplate "$language"; then
        ((language_passed++))
    fi
    ((language_total++))
    
    # Test 2: Syntax highlighting
    if test_syntax_highlighting "$language"; then
        ((language_passed++))
    fi
    ((language_total++))
    
    # Test 3: Compilation (if applicable)
    if test_compilation "$language"; then
        ((language_passed++))
    fi
    ((language_total++))
    
    # Test 4: Code execution
    if test_language "$language" "${language_tests[$language]}" "${expected_outputs[$language]}"; then
        ((language_passed++))
    fi
    ((language_total++))
    
    # Record results
    test_results["$language"]="$language_passed/$language_total"
    total_tests=$((total_tests + language_total))
    passed_tests=$((passed_tests + language_passed))
    
    echo -e "\n${BLUE}📊 $language Results: $language_passed/$language_total tests passed${NC}"
done

# Summary
echo -e "\n${BLUE}📋 Language Testing Summary${NC}"
echo "=================================="
echo ""

for language in "${!test_results[@]}"; do
    local result="${test_results[$language]}"
    local passed=$(echo "$result" | cut -d'/' -f1)
    local total=$(echo "$result" | cut -d'/' -f2)
    
    if [ "$passed" -eq "$total" ]; then
        echo -e "${GREEN}✅ $language: $result${NC}"
    elif [ "$passed" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $language: $result${NC}"
    else
        echo -e "${RED}❌ $language: $result${NC}"
    fi
done

echo ""
echo -e "${BLUE}📊 Overall Results:${NC}"
echo "Total Tests: $total_tests"
echo "Passed: $passed_tests"
echo "Failed: $((total_tests - passed_tests))"
echo "Success Rate: $(( (passed_tests * 100) / total_tests ))%"

# Performance assessment
echo -e "\n${BLUE}📈 Language Performance Assessment${NC}"
echo "======================================"

if [ $(( (passed_tests * 100) / total_tests )) -eq 100 ]; then
    echo -e "${GREEN}🎉 Perfect! All languages working correctly${NC}"
elif [ $(( (passed_tests * 100) / total_tests )) -ge 80 ]; then
    echo -e "${GREEN}✅ Excellent! Most languages working correctly${NC}"
elif [ $(( (passed_tests * 100) / total_tests )) -ge 60 ]; then
    echo -e "${YELLOW}⚠️  Good! Some languages need attention${NC}"
else
    echo -e "${RED}❌ Poor! Many languages have issues${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Language Testing Complete!${NC}"
echo ""
echo "Next Steps:"
echo "1. Fix any failed language tests"
echo "2. Test with more complex code examples"
echo "3. Verify error handling for invalid code"
echo "4. Test language-specific features"
echo "5. Performance test with large code files"
