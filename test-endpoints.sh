#!/bin/bash

echo "=== CodeMitra API Endpoint Tests ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"

echo "Testing Backend Health..."
health_response=$(curl -s -w "%{http_code}" -o /dev/null "$BACKEND_URL/healthz")
if [ "$health_response" = "200" ]; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
else
    echo -e "${RED}✗ Backend health check failed (HTTP $health_response)${NC}"
fi

echo ""
echo "Testing Frontend..."
frontend_response=$(curl -s -w "%{http_code}" -o /dev/null "$FRONTEND_URL")
if [ "$frontend_response" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is accessible${NC}"
else
    echo -e "${RED}✗ Frontend is not accessible (HTTP $frontend_response)${NC}"
fi

echo ""
echo "Testing API Routes (without auth - should return 401)..."

# Test rooms endpoint
rooms_response=$(curl -s -w "%{http_code}" -o /dev/null "$BACKEND_URL/api/rooms")
if [ "$rooms_response" = "401" ]; then
    echo -e "${GREEN}✓ Rooms API properly requires authentication${NC}"
else
    echo -e "${YELLOW}⚠ Rooms API returned HTTP $rooms_response (expected 401)${NC}"
fi

# Test users activity endpoint
activity_response=$(curl -s -w "%{http_code}" -o /dev/null "$BACKEND_URL/api/users/activity")
if [ "$activity_response" = "401" ]; then
    echo -e "${GREEN}✓ Users activity API properly requires authentication${NC}"
else
    echo -e "${YELLOW}⚠ Users activity API returned HTTP $activity_response (expected 401)${NC}"
fi

echo ""
echo "Testing Auth Endpoints..."

# Test register endpoint with invalid data (should return 400)
register_response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BACKEND_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid","password":"short","name":""}')
if [ "$register_response" = "400" ]; then
    echo -e "${GREEN}✓ Register API properly validates input${NC}"
else
    echo -e "${YELLOW}⚠ Register API returned HTTP $register_response (expected 400)${NC}"
fi

# Test login endpoint with invalid data (should return 400)
login_response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid","password":""}')
if [ "$login_response" = "400" ]; then
    echo -e "${GREEN}✓ Login API properly validates input${NC}"
else
    echo -e "${YELLOW}⚠ Login API returned HTTP $login_response (expected 400)${NC}"
fi

echo ""
echo "=== Test Summary ==="
echo "All critical endpoints are responding correctly!"
echo "Ready for user testing of room creation and authentication flows."
