#!/bin/bash

echo "🧪 Testing CORS Configuration..."

# Test 1: OPTIONS preflight request
echo "1. Testing OPTIONS preflight request..."
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v http://localhost:5001/api/auth/register

echo -e "\n\n"

# Test 2: Actual POST request
echo "2. Testing POST request..."
curl -X POST \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}' \
  -v http://localhost:5001/api/auth/register

echo -e "\n\n✅ CORS test completed!"
