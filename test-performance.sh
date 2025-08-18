#!/bin/bash

echo "🚀 Performance Testing for Collaborative Editing System"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:5001"
TEST_DURATION=60  # seconds
CONCURRENT_USERS=5
ROOM_ID="perf-test-$(date +%s)"

echo -e "${BLUE}🔧 Performance Test Configuration:${NC}"
echo "Frontend: $FRONTEND_URL"
echo "Backend: $BACKEND_URL"
echo "Test Duration: ${TEST_DURATION}s"
echo "Concurrent Users: $CONCURRENT_USERS"
echo "Test Room ID: $ROOM_ID"
echo ""

# Check if services are running
echo -e "${BLUE}📡 Checking Services...${NC}"
if ! curl -s "$FRONTEND_URL" > /dev/null; then
    echo -e "${RED}❌ Frontend is not running${NC}"
    exit 1
fi

if ! curl -s "$BACKEND_URL/health" > /dev/null; then
    echo -e "${RED}❌ Backend is not running${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All services are running!${NC}"

# Performance metrics
declare -a response_times
declare -a memory_usage
declare -a cpu_usage
declare -a network_requests

# Function to measure response time
measure_response_time() {
    local url=$1
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "%{http_code}" "$url" -o /dev/null)
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$response" = "200" ]; then
        response_times+=($duration)
        echo $duration
    else
        echo -1
    fi
}

# Function to get system metrics
get_system_metrics() {
    # Memory usage for Node.js processes
    local node_memory=0
    local node_pids=$(pgrep -f "node.*backend\|node.*frontend" 2>/dev/null)
    
    if [ -n "$node_pids" ]; then
        for pid in $node_pids; do
            local mem=$(ps -o rss= -p $pid 2>/dev/null || echo "0")
            node_memory=$((node_memory + mem))
        done
        memory_usage+=($((node_memory / 1024)))  # Convert to MB
    fi
    
    # CPU usage (simplified)
    local cpu=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' 2>/dev/null || echo "0")
    cpu_usage+=($cpu)
}

# Function to run load test
run_load_test() {
    echo -e "\n${BLUE}🔥 Starting Load Test...${NC}"
    echo "Duration: ${TEST_DURATION}s"
    echo "Concurrent users: $CONCURRENT_USERS"
    echo ""
    
    local start_time=$(date +%s)
    local end_time=$((start_time + TEST_DURATION))
    local current_time=0
    
    # Start background processes for concurrent users
    for ((i=1; i<=CONCURRENT_USERS; i++)); do
        (
            echo "User $i: Starting load test..."
            while [ $(date +%s) -lt $end_time ]; do
                # Simulate user actions
                local response_time=$(measure_response_time "$BACKEND_URL/health")
                if [ $response_time -gt 0 ]; then
                    echo "User $i: Response time ${response_time}ms"
                fi
                
                # Simulate code execution
                local code_response=$(curl -s -X POST "$BACKEND_URL/api/code/execute" \
                    -H "Content-Type: application/json" \
                    -d "{\"code\":\"console.log('User $i: Test ${RANDOM}');\",\"language\":\"javascript\",\"roomId\":\"$ROOM_ID\",\"userId\":\"user-$i\"}")
                
                # Simulate room operations
                curl -s "$BACKEND_URL/api/rooms" > /dev/null
                
                # Small delay between requests
                sleep 0.1
            done
            echo "User $i: Load test completed"
        ) &
    done
    
    # Monitor system metrics
    echo -e "\n${BLUE}📊 Monitoring System Metrics...${NC}"
    while [ $(date +%s) -lt $end_time ]; do
        get_system_metrics
        current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        local remaining=$((end_time - current_time))
        
        echo -ne "\r⏱️  Elapsed: ${elapsed}s | Remaining: ${remaining}s | Users: $CONCURRENT_USERS"
        sleep 5
    done
    
    echo ""
    echo -e "\n${GREEN}✅ Load test completed!${NC}"
    
    # Wait for all background processes
    wait
}

# Function to calculate statistics
calculate_statistics() {
    local -n values=$1
    local name=$2
    
    if [ ${#values[@]} -eq 0 ]; then
        echo "$name: No data available"
        return
    fi
    
    # Sort values for percentile calculation
    IFS=$'\n' sorted=($(sort -n <<<"${values[*]}"))
    unset IFS
    
    local count=${#values[@]}
    local sum=0
    local min=${sorted[0]}
    local max=${sorted[-1]}
    
    for value in "${values[@]}"; do
        sum=$((sum + value))
    done
    
    local avg=$((sum / count))
    local p50_idx=$((count * 50 / 100))
    local p95_idx=$((count * 95 / 100))
    local p99_idx=$((count * 99 / 100))
    
    echo "$name Statistics:"
    echo "  Count: $count"
    echo "  Min: ${min}ms"
    echo "  Max: ${max}ms"
    echo "  Average: ${avg}ms"
    echo "  P50: ${sorted[$p50_idx]}ms"
    echo "  P95: ${sorted[$p95_idx]}ms"
    echo "  P99: ${sorted[$p99_idx]}ms"
}

# Function to run stress test
run_stress_test() {
    echo -e "\n${BLUE}💥 Starting Stress Test...${NC}"
    echo "This will test system limits with extreme load"
    
    # Gradually increase load
    for users in 1 2 5 10 20; do
        echo -e "\n${YELLOW}Testing with $users concurrent users...${NC}"
        
        local start_time=$(date +%s)
        local end_time=$((start_time + 30))  # 30 seconds per test
        
        # Start background processes
        for ((i=1; i<=users; i++)); do
            (
                while [ $(date +%s) -lt $end_time ]; do
                    # Rapid-fire requests
                    for ((j=1; j<=10; j++)); do
                        curl -s "$BACKEND_URL/health" > /dev/null &
                        curl -s "$BACKEND_URL/api/rooms" > /dev/null &
                    done
                    wait
                    sleep 0.1
                done
            ) &
        done
        
        # Wait for test to complete
        wait
        
        # Check if system is still responsive
        local response_time=$(measure_response_time "$BACKEND_URL/health")
        if [ $response_time -gt 0 ] && [ $response_time -lt 5000 ]; then
            echo -e "${GREEN}✅ System stable with $users users (${response_time}ms)${NC}"
        else
            echo -e "${RED}❌ System struggling with $users users (${response_time}ms)${NC}"
            break
        fi
    done
}

# Function to test memory leaks
test_memory_leaks() {
    echo -e "\n${BLUE}🧠 Testing for Memory Leaks...${NC}"
    
    local initial_memory=0
    local node_pids=$(pgrep -f "node.*backend\|node.*frontend" 2>/dev/null)
    
    if [ -n "$node_pids" ]; then
        for pid in $node_pids; do
            local mem=$(ps -o rss= -p $pid 2>/dev/null || echo "0")
            initial_memory=$((initial_memory + mem))
        done
        echo "Initial memory usage: $((initial_memory / 1024))MB"
    fi
    
    # Run intensive operations
    echo "Running intensive operations..."
    for ((i=1; i<=100; i++)); do
        curl -s "$BACKEND_URL/health" > /dev/null
        curl -s "$BACKEND_URL/api/rooms" > /dev/null
        sleep 0.01
    done
    
    # Check memory after operations
    local final_memory=0
    if [ -n "$node_pids" ]; then
        for pid in $node_pids; do
            local mem=$(ps -o rss= -p $pid 2>/dev/null || echo "0")
            final_memory=$((final_memory + mem))
        done
        echo "Final memory usage: $((final_memory / 1024))MB"
        
        local memory_diff=$((final_memory - initial_memory))
        if [ $memory_diff -gt 10485760 ]; then  # 10MB threshold
            echo -e "${RED}⚠️  Potential memory leak detected: +$((memory_diff / 1024))MB${NC}"
        else
            echo -e "${GREEN}✅ No significant memory leak detected${NC}"
        fi
    fi
}

# Main test execution
echo -e "${BLUE}🚀 Starting Performance Tests...${NC}"

# Run load test
run_load_test

# Run stress test
run_stress_test

# Test for memory leaks
test_memory_leaks

# Calculate and display statistics
echo -e "\n${BLUE}📊 Performance Test Results${NC}"
echo "=================================="

calculate_statistics response_times "Response Time"
echo ""

if [ ${#memory_usage[@]} -gt 0 ]; then
    echo "Memory Usage (MB):"
    for ((i=0; i<${#memory_usage[@]}; i++)); do
        echo "  Sample $((i+1)): ${memory_usage[$i]}MB"
    done
    echo ""
fi

if [ ${#cpu_usage[@]} -gt 0 ]; then
    echo "CPU Usage (%):"
    for ((i=0; i<${#cpu_usage[@]}; i++)); do
        echo "  Sample $((i+1)): ${cpu_usage[$i]}%"
    done
    echo ""
fi

# Performance assessment
echo -e "${BLUE}📈 Performance Assessment${NC}"
echo "=============================="

local avg_response_time=0
if [ ${#response_times[@]} -gt 0 ]; then
    local sum=0
    for time in "${response_times[@]}"; do
        sum=$((sum + time))
    done
    avg_response_time=$((sum / ${#response_times[@]}))
fi

if [ $avg_response_time -lt 100 ]; then
    echo -e "${GREEN}✅ Excellent Performance: ${avg_response_time}ms average response time${NC}"
elif [ $avg_response_time -lt 500 ]; then
    echo -e "${GREEN}✅ Good Performance: ${avg_response_time}ms average response time${NC}"
elif [ $avg_response_time -lt 1000 ]; then
    echo -e "${YELLOW}⚠️  Acceptable Performance: ${avg_response_time}ms average response time${NC}"
else
    echo -e "${RED}❌ Poor Performance: ${avg_response_time}ms average response time${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Performance Testing Complete!${NC}"
echo ""
echo "Recommendations:"
echo "1. If response time > 500ms: Optimize backend queries"
echo "2. If memory usage > 500MB: Check for memory leaks"
echo "3. If CPU usage > 80%: Consider scaling or optimization"
echo "4. For production: Run tests with realistic data volumes"
