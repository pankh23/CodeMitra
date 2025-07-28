import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
export let errorCount = new Counter('errors');
export let errorRate = new Rate('error_rate');
export let compilationTime = new Trend('compilation_time');
export let socketConnectionTime = new Trend('socket_connection_time');

// Test configuration
export let options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up to 10 users
    { duration: '5m', target: 10 },  // Stay at 10 users
    { duration: '2m', target: 20 },  // Ramp up to 20 users
    { duration: '5m', target: 20 },  // Stay at 20 users
    { duration: '2m', target: 50 },  // Ramp up to 50 users
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
    compilation_time: ['p(95)<5000'], // 95% of compilations must complete below 5s
    socket_connection_time: ['p(95)<1000'], // 95% of socket connections must complete below 1s
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost';
const WS_URL = BASE_URL.replace('http', 'ws');

export default function() {
  let testScenario = Math.random();
  
  if (testScenario < 0.3) {
    // 30% - Test authentication flow
    testAuthFlow();
  } else if (testScenario < 0.6) {
    // 30% - Test room creation and joining
    testRoomFlow();
  } else if (testScenario < 0.8) {
    // 20% - Test code compilation
    testCodeCompilation();
  } else {
    // 20% - Test WebSocket functionality
    testWebSocketFlow();
  }
  
  sleep(1);
}

function testAuthFlow() {
  let loginPayload = {
    email: `test${Math.random()}@example.com`,
    password: 'testpassword123'
  };
  
  // Register user
  let registerResponse = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(registerResponse, {
    'register status is 201': (r) => r.status === 201,
    'register response has token': (r) => JSON.parse(r.body).token !== undefined,
  }) || errorCount.add(1);
  
  if (registerResponse.status !== 201) {
    errorRate.add(1);
    return;
  }
  
  // Login user
  let loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => JSON.parse(r.body).token !== undefined,
  }) || errorCount.add(1);
  
  if (loginResponse.status !== 200) {
    errorRate.add(1);
  }
}

function testRoomFlow() {
  // First authenticate
  let loginPayload = {
    email: `test${Math.random()}@example.com`,
    password: 'testpassword123'
  };
  
  let registerResponse = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (registerResponse.status !== 201) {
    errorRate.add(1);
    return;
  }
  
  let token = JSON.parse(registerResponse.body).token;
  let authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  // Create room
  let roomPayload = {
    name: `Test Room ${Math.random()}`,
    password: 'roompassword123'
  };
  
  let createRoomResponse = http.post(`${BASE_URL}/api/rooms/create`, JSON.stringify(roomPayload), {
    headers: authHeaders,
  });
  
  check(createRoomResponse, {
    'create room status is 201': (r) => r.status === 201,
    'create room response has roomId': (r) => JSON.parse(r.body).roomId !== undefined,
  }) || errorCount.add(1);
  
  if (createRoomResponse.status !== 201) {
    errorRate.add(1);
    return;
  }
  
  let roomId = JSON.parse(createRoomResponse.body).roomId;
  
  // Join room
  let joinPayload = {
    roomId: roomId,
    password: 'roompassword123'
  };
  
  let joinRoomResponse = http.post(`${BASE_URL}/api/rooms/join`, JSON.stringify(joinPayload), {
    headers: authHeaders,
  });
  
  check(joinRoomResponse, {
    'join room status is 200': (r) => r.status === 200,
  }) || errorCount.add(1);
  
  if (joinRoomResponse.status !== 200) {
    errorRate.add(1);
  }
}

function testCodeCompilation() {
  // Authenticate first
  let loginPayload = {
    email: `test${Math.random()}@example.com`,
    password: 'testpassword123'
  };
  
  let registerResponse = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (registerResponse.status !== 201) {
    errorRate.add(1);
    return;
  }
  
  let token = JSON.parse(registerResponse.body).token;
  
  // Test code compilation
  let compilePayload = {
    code: `
      #include <iostream>
      using namespace std;
      
      int main() {
          cout << "Hello, World!" << endl;
          return 0;
      }
    `,
    language: 'cpp',
    input: ''
  };
  
  let start = Date.now();
  let compileResponse = http.post(`${BASE_URL}/api/compile`, JSON.stringify(compilePayload), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });
  let duration = Date.now() - start;
  
  compilationTime.add(duration);
  
  check(compileResponse, {
    'compile status is 200': (r) => r.status === 200,
    'compile response has output': (r) => JSON.parse(r.body).output !== undefined,
  }) || errorCount.add(1);
  
  if (compileResponse.status !== 200) {
    errorRate.add(1);
  }
}

function testWebSocketFlow() {
  let start = Date.now();
  
  ws.connect(`${WS_URL}/socket.io/?EIO=4&transport=websocket`, function (socket) {
    let connectionTime = Date.now() - start;
    socketConnectionTime.add(connectionTime);
    
    socket.on('open', function () {
      socket.send('2probe');
    });
    
    socket.on('message', function (message) {
      if (message === '3probe') {
        socket.send('5');
        
        // Simulate joining a room
        socket.send('42["join-room","test-room-123"]');
        
        // Simulate code changes
        socket.send('42["code-change",{"code":"console.log(\\"test\\");","language":"javascript"}]');
        
        // Simulate chat message
        socket.send('42["chat-message",{"message":"Hello from load test!","user":"test-user"}]');
      }
    });
    
    socket.setTimeout(function () {
      socket.close();
    }, 10000);
  });
}

export function handleSummary(data) {
  return {
    'performance-summary.json': JSON.stringify(data),
    'performance-summary.html': `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CodeMitra Performance Test Results</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
          .pass { border-left: 5px solid #4CAF50; }
          .fail { border-left: 5px solid #f44336; }
        </style>
      </head>
      <body>
        <h1>CodeMitra Performance Test Results</h1>
        <div class="metric ${data.metrics.http_req_duration ? 'pass' : 'fail'}">
          <h3>HTTP Request Duration</h3>
          <p>Average: ${data.metrics.http_req_duration.avg || 'N/A'}ms</p>
          <p>95th percentile: ${data.metrics.http_req_duration.p95 || 'N/A'}ms</p>
        </div>
        <div class="metric ${data.metrics.compilation_time ? 'pass' : 'fail'}">
          <h3>Compilation Time</h3>
          <p>Average: ${data.metrics.compilation_time ? data.metrics.compilation_time.avg : 'N/A'}ms</p>
          <p>95th percentile: ${data.metrics.compilation_time ? data.metrics.compilation_time.p95 : 'N/A'}ms</p>
        </div>
        <div class="metric ${data.metrics.socket_connection_time ? 'pass' : 'fail'}">
          <h3>Socket Connection Time</h3>
          <p>Average: ${data.metrics.socket_connection_time ? data.metrics.socket_connection_time.avg : 'N/A'}ms</p>
          <p>95th percentile: ${data.metrics.socket_connection_time ? data.metrics.socket_connection_time.p95 : 'N/A'}ms</p>
        </div>
        <div class="metric">
          <h3>Total Requests</h3>
          <p>Total: ${data.metrics.http_reqs ? data.metrics.http_reqs.count : 'N/A'}</p>
          <p>Rate: ${data.metrics.http_reqs ? data.metrics.http_reqs.rate : 'N/A'}/s</p>
        </div>
        <div class="metric ${data.metrics.errors ? 'fail' : 'pass'}">
          <h3>Errors</h3>
          <p>Total: ${data.metrics.errors ? data.metrics.errors.count : 0}</p>
          <p>Rate: ${data.metrics.error_rate ? (data.metrics.error_rate.rate * 100).toFixed(2) : 0}%</p>
        </div>
      </body>
      </html>
    `
  };
}
