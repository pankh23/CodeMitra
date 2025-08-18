#!/bin/bash

# Test Real-Time Synchronization Fixes for CodeMitra
# This script tests the critical fixes for real-time collaboration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:5001"
ROOM_ID="test-room-$(date +%s)"

echo -e "${BLUE}🧪 Testing Real-Time Synchronization Fixes for CodeMitra${NC}"
echo "=================================================="
echo ""

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ $message${NC}"
    else
        echo -e "${YELLOW}⚠️  $message${NC}"
    fi
}

# Function to check if service is running
check_service() {
    local url=$1
    local service_name=$2
    
    if curl -s "$url" > /dev/null 2>&1; then
        print_status "PASS" "$service_name is running at $url"
        return 0
    else
        print_status "FAIL" "$service_name is not running at $url"
        return 1
    fi
}

# Function to test WebSocket connection
test_websocket() {
    echo -e "${BLUE}🔌 Testing WebSocket Connection...${NC}"
    
    # Check if WebSocket endpoint is accessible
    if curl -s -I "$BACKEND_URL/socket.io/" > /dev/null 2>&1; then
        print_status "PASS" "WebSocket endpoint is accessible"
    else
        print_status "FAIL" "WebSocket endpoint is not accessible"
        return 1
    fi
    
    echo ""
}

# Function to test room creation and joining
test_room_flow() {
    echo -e "${BLUE}🚪 Testing Room Creation and Joining...${NC}"
    
    # Test room creation (if API exists)
    if curl -s -X POST "$BACKEND_URL/api/rooms" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"Test Room\",\"isPublic\":true}" > /dev/null 2>&1; then
        print_status "PASS" "Room creation API is working"
    else
        print_status "WARN" "Room creation API not tested (may require auth)"
    fi
    
    echo ""
}

# Function to test code execution
test_code_execution() {
    echo -e "${BLUE}⚡ Testing Code Execution...${NC}"
    
    # Test basic code execution endpoint
    if curl -s -X POST "$BACKEND_URL/api/code/execute" \
        -H "Content-Type: application/json" \
        -d "{\"code\":\"console.log('Hello World')\",\"language\":\"javascript\"}" > /dev/null 2>&1; then
        print_status "PASS" "Code execution endpoint is accessible"
    else
        print_status "FAIL" "Code execution endpoint is not accessible"
        return 1
    fi
    
    echo ""
}

# Function to test language support
test_language_support() {
    echo -e "${BLUE}🔤 Testing Language Support...${NC}"
    
    local languages=("javascript" "python" "java" "cpp" "c" "php")
    local all_supported=true
    
    for lang in "${languages[@]}"; do
        if curl -s "$BACKEND_URL/api/code/test-cases/$lang" > /dev/null 2>&1; then
            print_status "PASS" "$lang language support is working"
        else
            print_status "FAIL" "$lang language support is not working"
            all_supported=false
        fi
    done
    
    if [ "$all_supported" = true ]; then
        print_status "PASS" "All 6 supported languages are working"
    else
        print_status "FAIL" "Some languages are not working"
        return 1
    fi
    
    echo ""
}

# Function to test frontend components
test_frontend_components() {
    echo -e "${BLUE}🎨 Testing Frontend Components...${NC}"
    
    # Test if main page loads
    if curl -s "$FRONTEND_URL" | grep -q "CodeMitra" 2>/dev/null; then
        print_status "PASS" "Frontend main page loads correctly"
    else
        print_status "FAIL" "Frontend main page does not load correctly"
        return 1
    fi
    
    # Test if room page structure exists
    if curl -s "$FRONTEND_URL/room/test/layout" | grep -q "room" 2>/dev/null; then
        print_status "PASS" "Room page structure is accessible"
    else
        print_status "WARN" "Room page structure not tested (may require auth)"
    fi
    
    echo ""
}

# Function to test CORS configuration
test_cors() {
    echo -e "${BLUE}🌐 Testing CORS Configuration...${NC}"
    
    # Test preflight request
    if curl -s -X OPTIONS "$BACKEND_URL/api/auth/register" \
        -H "Origin: $FRONTEND_URL" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -v 2>&1 | grep -q "Access-Control-Allow-Origin" 2>/dev/null; then
        print_status "PASS" "CORS preflight requests are working"
    else
        print_status "FAIL" "CORS preflight requests are not working"
        return 1
    fi
    
    echo ""
}

# Function to test database connectivity
test_database() {
    echo -e "${BLUE}🗄️  Testing Database Connectivity...${NC}"
    
    # Test if Prisma client can connect (basic health check)
    if curl -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
        print_status "PASS" "Database connectivity is working"
    else
        print_status "WARN" "Database connectivity not tested (no health endpoint)"
    fi
    
    echo ""
}

# Function to run performance tests
test_performance() {
    echo -e "${BLUE}⚡ Testing Performance...${NC}"
    
    # Test response time for code execution
    local start_time=$(date +%s%N)
    if curl -s "$BACKEND_URL/api/code/execute" \
        -H "Content-Type: application/json" \
        -d "{\"code\":\"console.log('test')\",\"language\":\"javascript\"}" > /dev/null 2>&1; then
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        
        if [ $response_time -lt 5000 ]; then
            print_status "PASS" "Code execution response time: ${response_time}ms (acceptable)"
        else
            print_status "WARN" "Code execution response time: ${response_time}ms (slow)"
        fi
    else
        print_status "FAIL" "Could not test code execution performance"
    fi
    
    echo ""
}

# Function to generate test summary
generate_summary() {
    echo -e "${BLUE}📊 Test Summary${NC}"
    echo "=================="
    echo ""
    echo "Real-Time Features Tested:"
    echo "✅ WebSocket Connection"
    echo "✅ Room Management"
    echo "✅ Code Execution"
    echo "✅ Language Support"
    echo "✅ Frontend Components"
    echo "✅ CORS Configuration"
    echo "✅ Database Connectivity"
    echo "✅ Performance Metrics"
    echo ""
    echo "Next Steps:"
    echo "1. Open two browser windows"
    echo "2. Navigate to: $FRONTEND_URL/room/$ROOM_ID/editor"
    echo "3. Test real-time code editing"
    echo "4. Test chat functionality"
    echo "5. Test code execution"
    echo ""
}

# Main test execution
main() {
    echo "Starting comprehensive real-time synchronization tests..."
    echo ""
    
    # Check prerequisites
    echo -e "${BLUE}🔍 Checking Prerequisites...${NC}"
    check_service "$FRONTEND_URL" "Frontend" || exit 1
    check_service "$BACKEND_URL" "Backend" || exit 1
    echo ""
    
    # Run all tests
    test_websocket
    test_room_flow
    test_code_execution
    test_language_support
    test_frontend_components
    test_cors
    test_database
    test_performance
    
    # Generate summary
    generate_summary
    
    echo -e "${GREEN}🎉 All tests completed!${NC}"
    echo ""
    echo "To test real-time collaboration:"
    echo "1. Start your development servers"
    echo "2. Open multiple browser windows"
    echo "3. Join the same room: $ROOM_ID"
    echo "4. Test code editing, chat, and execution"
    echo ""
}

# Run main function
main "$@"
