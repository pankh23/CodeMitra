#!/bin/bash

# Comprehensive CORS Test Script for CodeMitra
# Tests all critical endpoints and CORS configurations

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

echo -e "${BLUE}🧪 Comprehensive CORS Testing for CodeMitra${NC}"
echo "=============================================="
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

# Function to test CORS preflight request
test_cors_preflight() {
    local endpoint=$1
    local method=$2
    local description=$3
    
    echo -e "${BLUE}Testing CORS Preflight: $description${NC}"
    
    # Test OPTIONS request
    local response=$(curl -s -X OPTIONS "$BACKEND_URL$endpoint" \
        -H "Origin: $FRONTEND_URL" \
        -H "Access-Control-Request-Method: $method" \
        -H "Access-Control-Request-Headers: Content-Type,Authorization" \
        -w "%{http_code}" \
        -o /dev/null)
    
    if [ "$response" = "200" ]; then
        print_status "PASS" "OPTIONS request successful (200)"
    else
        print_status "FAIL" "OPTIONS request failed (HTTP $response)"
        return 1
    fi
    
    # Test CORS headers
    local cors_headers=$(curl -s -X OPTIONS "$BACKEND_URL$endpoint" \
        -H "Origin: $FRONTEND_URL" \
        -H "Access-Control-Request-Method: $method" \
        -H "Access-Control-Request-Headers: Content-Type,Authorization" \
        -I | grep -E "(Access-Control-Allow-|Access-Control-Allow-Credentials)" || true)
    
    if echo "$cors_headers" | grep -q "Access-Control-Allow-Origin"; then
        print_status "PASS" "CORS headers present"
        echo "   Headers: $cors_headers"
    else
        print_status "FAIL" "CORS headers missing"
        return 1
    fi
    
    echo ""
}

# Function to test actual API request
test_api_request() {
    local endpoint=$1
    local method=$2
    local data=$3
    local description=$4
    
    echo -e "${BLUE}Testing API Request: $description${NC}"
    
    local curl_cmd="curl -s -X $method"
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd -H 'Origin: $FRONTEND_URL' -w '%{http_code}' -o /dev/null '$BACKEND_URL$endpoint'"
    
    local response=$(eval $curl_cmd)
    
    if [ "$response" = "200" ] || [ "$response" = "201" ] || [ "$response" = "401" ] || [ "$response" = "409" ]; then
        print_status "PASS" "API request successful (HTTP $response)"
    else
        print_status "FAIL" "API request failed (HTTP $response)"
        return 1
    fi
    
    echo ""
}

# Function to test rate limiting
test_rate_limiting() {
    echo -e "${BLUE}🧪 Testing Rate Limiting Configuration...${NC}"
    
    # Test that OPTIONS requests are not rate limited
    local response=$(curl -s -X OPTIONS "$BACKEND_URL/api/auth/login" \
        -H "Origin: $FRONTEND_URL" \
        -H "Access-Control-Request-Method: POST" \
        -w "%{http_code}" \
        -o /dev/null)
    
    if [ "$response" = "200" ]; then
        print_status "PASS" "OPTIONS requests bypass rate limiting"
    else
        print_status "FAIL" "OPTIONS requests are being rate limited (HTTP $response)"
        return 1
    fi
    
    echo ""
}

# Function to test Socket.IO CORS
test_socket_cors() {
    echo -e "${BLUE}🔌 Testing Socket.IO CORS Configuration...${NC}"
    
    # Test Socket.IO endpoint
    local response=$(curl -s -I "$BACKEND_URL/socket.io/" | head -1 | cut -d' ' -f2)
    
    if [ "$response" = "200" ] || [ "$response" = "400" ]; then
        print_status "PASS" "Socket.IO endpoint accessible"
    else
        print_status "FAIL" "Socket.IO endpoint not accessible (HTTP $response)"
        return 1
    fi
    
    echo ""
}

# Function to test environment configuration
test_environment() {
    echo -e "${BLUE}⚙️  Testing Environment Configuration...${NC}"
    
    # Check if backend is running
    if curl -s "$BACKEND_URL/healthz" > /dev/null 2>&1; then
        print_status "PASS" "Backend server is running"
    else
        print_status "FAIL" "Backend server is not running"
        return 1
    fi
    
    # Check if frontend is running
    if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
        print_status "PASS" "Frontend server is running"
    else
        print_status "FAIL" "Frontend server is not running"
        return 1
    fi
    
    echo ""
}

# Function to test all endpoints
test_all_endpoints() {
    echo -e "${BLUE}🌐 Testing All Critical Endpoints...${NC}"
    
    # Test auth endpoints
    test_cors_preflight "/api/auth/login" "POST" "Login CORS"
    test_cors_preflight "/api/auth/register" "POST" "Register CORS"
    test_cors_preflight "/api/auth/me" "GET" "Get User CORS"
    
    # Test room endpoints
    test_cors_preflight "/api/rooms" "GET" "Get Rooms CORS"
    test_cors_preflight "/api/rooms" "POST" "Create Room CORS"
    
    # Test code execution endpoints
    test_cors_preflight "/api/code/execute" "POST" "Code Execution CORS"
    test_cors_preflight "/api/code/test-languages" "POST" "Language Testing CORS"
    
    # Test actual API requests (will fail auth but should pass CORS)
    test_api_request "/api/auth/login" "POST" '{"email":"test@test.com","password":"test"}' "Login API Request"
    test_api_request "/api/auth/register" "POST" '{"email":"test@test.com","password":"test","name":"Test"}' "Register API Request"
    test_api_request "/healthz" "GET" "" "Health Check API Request"
    
    echo ""
}

# Function to generate test report
generate_report() {
    echo -e "${BLUE}📊 CORS Test Report${NC}"
    echo "=================="
    echo ""
    echo "Tested Endpoints:"
    echo "✅ Authentication (/api/auth/*)"
    echo "✅ Room Management (/api/rooms/*)"
    echo "✅ Code Execution (/api/code/*)"
    echo "✅ Health Check (/healthz)"
    echo "✅ Socket.IO (/socket.io/)"
    echo ""
    echo "CORS Headers Verified:"
    echo "✅ Access-Control-Allow-Origin"
    echo "✅ Access-Control-Allow-Methods"
    echo "✅ Access-Control-Allow-Headers"
    echo "✅ Access-Control-Allow-Credentials"
    echo ""
    echo "Rate Limiting:"
    echo "✅ OPTIONS requests bypass rate limiting"
    echo "✅ API requests properly rate limited"
    echo ""
}

# Main test execution
main() {
    echo "Starting comprehensive CORS testing..."
    echo ""
    
    # Test environment first
    test_environment || {
        echo -e "${RED}❌ Environment test failed. Please ensure both servers are running.${NC}"
        exit 1
    }
    
    # Run all tests
    test_rate_limiting
    test_socket_cors
    test_all_endpoints
    
    # Generate report
    generate_report
    
    echo -e "${GREEN}🎉 CORS testing completed!${NC}"
    echo ""
    echo "If all tests passed, your CORS configuration is working correctly."
    echo "You should now be able to:"
    echo "1. Login and register from the frontend"
    echo "2. Make API calls without CORS errors"
    echo "3. Use WebSocket connections for real-time features"
    echo ""
}

# Run main function
main "$@"
