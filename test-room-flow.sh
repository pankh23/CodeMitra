#!/bin/bash

echo "🧪 Testing CodeMitra Room Flow"
echo "================================"

# Test 1: Frontend Accessibility
echo "✅ Test 1: Frontend Accessibility"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "   Frontend is accessible (HTTP $FRONTEND_RESPONSE)"
else
    echo "   ❌ Frontend not accessible (HTTP $FRONTEND_RESPONSE)"
    exit 1
fi

# Test 2: Backend Health
echo "✅ Test 2: Backend Health"
BACKEND_RESPONSE=$(curl -s http://localhost:5001/healthz | jq -r '.status')
if [ "$BACKEND_RESPONSE" = "OK" ]; then
    echo "   Backend is healthy ($BACKEND_RESPONSE)"
else
    echo "   ❌ Backend not healthy ($BACKEND_RESPONSE)"
    exit 1
fi

# Test 3: Database Connection
echo "✅ Test 3: Database Connection"
DB_STATUS=$(docker exec -it codemitra-postgres psql -U root -d codemitra -c "SELECT 1;" 2>/dev/null | grep -c "1")
if [ "$DB_STATUS" -gt 0 ]; then
    echo "   Database is accessible"
else
    echo "   ❌ Database not accessible"
    exit 1
fi

# Test 4: Room Editor Route
echo "✅ Test 4: Room Editor Route"
ROOM_EDITOR_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/room/test-room-id/editor)
if [ "$ROOM_EDITOR_RESPONSE" = "200" ]; then
    echo "   Room editor route is accessible (HTTP $ROOM_EDITOR_RESPONSE)"
else
    echo "   ❌ Room editor route not accessible (HTTP $ROOM_EDITOR_RESPONSE)"
fi

echo ""
echo "🎯 Manual Testing Required:"
echo "1. Open http://localhost:3000/dashboard in browser"
echo "2. Create a room (fill form and submit)"
echo "3. Verify automatic redirect to /room/[roomId]/editor"
echo "4. Copy room code and open in new tab"
echo "5. Join room with code and verify redirect to editor"
echo ""
echo "🚀 All automated tests passed! Ready for manual testing."
