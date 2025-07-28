# CodeMitra API Documentation 📚

Complete API reference for the CodeMitra collaborative coding platform.

## 📋 Table of Contents

- [Authentication](#authentication)
- [Users](#users)
- [Rooms](#rooms)
- [Code Execution](#code-execution)
- [Chat](#chat)
- [Video Calls](#video-calls)
- [WebSocket Events](#websocket-events)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## 🔐 Authentication

### Base URL
```
Production: https://api.codemitra.com
Development: http://localhost:5000
```

### Authentication Headers
All authenticated requests require a Bearer token:
```
Authorization: Bearer <jwt_token>
```

## 👤 Users

### Register User

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": null,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

### Login User

**POST** `/api/auth/login`

Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": null
    },
    "token": "jwt_token_here"
  }
}
```

### Get Current User

**GET** `/api/auth/me`

Get current authenticated user information.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Logout User

**POST** `/api/auth/logout`

Logout current user (invalidate token).

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## 🏠 Rooms

### Get All Rooms

**GET** `/api/rooms`

Get list of available rooms (public rooms and user's private rooms).

**Query Parameters:**
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Number of rooms per page (default: 10)
- `search` (string): Search rooms by name
- `language` (string): Filter by programming language

**Response:**
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "uuid",
        "name": "JavaScript Study Group",
        "description": "Learning JavaScript together",
        "isPublic": true,
        "language": "javascript",
        "maxUsers": 10,
        "currentUsers": 3,
        "owner": {
          "id": "uuid",
          "name": "John Doe"
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### Create Room

**POST** `/api/rooms`

Create a new room.

**Request Body:**
```json
{
  "name": "Python Workshop",
  "description": "Advanced Python programming",
  "password": "roomPassword123",
  "isPublic": false,
  "maxUsers": 15,
  "language": "python"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "room": {
      "id": "uuid",
      "name": "Python Workshop",
      "description": "Advanced Python programming",
      "isPublic": false,
      "language": "python",
      "maxUsers": 15,
      "owner": {
        "id": "uuid",
        "name": "John Doe"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Get Room Details

**GET** `/api/rooms/:roomId`

Get detailed information about a specific room.

**Response:**
```json
{
  "success": true,
  "data": {
    "room": {
      "id": "uuid",
      "name": "Python Workshop",
      "description": "Advanced Python programming",
      "isPublic": false,
      "language": "python",
      "maxUsers": 15,
      "currentUsers": 5,
      "code": "print('Hello, World!')",
      "input": "",
      "output": "",
      "owner": {
        "id": "uuid",
        "name": "John Doe"
      },
      "users": [
        {
          "id": "uuid",
          "name": "John Doe",
          "role": "owner",
          "joinedAt": "2024-01-01T00:00:00.000Z"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Update Room

**PUT** `/api/rooms/:roomId`

Update room information (owner only).

**Request Body:**
```json
{
  "name": "Updated Room Name",
  "description": "Updated description",
  "isPublic": true,
  "maxUsers": 20
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "room": {
      "id": "uuid",
      "name": "Updated Room Name",
      "description": "Updated description",
      "isPublic": true,
      "maxUsers": 20,
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Delete Room

**DELETE** `/api/rooms/:roomId`

Delete a room (owner only).

**Response:**
```json
{
  "success": true,
  "message": "Room deleted successfully"
}
```

### Join Room

**POST** `/api/rooms/:roomId/join`

Join a room (requires password for private rooms).

**Request Body:**
```json
{
  "password": "roomPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "room": {
      "id": "uuid",
      "name": "Python Workshop",
      "users": [
        {
          "id": "uuid",
          "name": "John Doe",
          "role": "member"
        }
      ]
    }
  }
}
```

### Leave Room

**POST** `/api/rooms/:roomId/leave`

Leave a room.

**Response:**
```json
{
  "success": true,
  "message": "Left room successfully"
}
```

## 💻 Code Execution

### Execute Code

**POST** `/api/rooms/:roomId/execute`

Execute code in the specified room.

**Request Body:**
```json
{
  "code": "print('Hello, World!')",
  "language": "python",
  "input": "optional input data"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "uuid",
    "status": "completed",
    "output": "Hello, World!\n",
    "error": null,
    "executionTime": 150,
    "memoryUsed": 1024000,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get Execution History

**GET** `/api/rooms/:roomId/executions`

Get code execution history for a room.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "executions": [
      {
        "id": "uuid",
        "language": "python",
        "code": "print('Hello, World!')",
        "output": "Hello, World!\n",
        "error": null,
        "executionTime": 150,
        "memoryUsed": 1024000,
        "status": "completed",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

### Get Supported Languages

**GET** `/api/languages`

Get list of supported programming languages.

**Response:**
```json
{
  "success": true,
  "data": {
    "languages": [
      {
        "id": "javascript",
        "name": "JavaScript",
        "version": "18.x",
        "extension": "js",
        "timeout": 30000,
        "memoryLimit": "256m"
      },
      {
        "id": "python",
        "name": "Python",
        "version": "3.11",
        "extension": "py",
        "timeout": 30000,
        "memoryLimit": "256m"
      }
    ]
  }
}
```

## 💬 Chat

### Get Chat Messages

**GET** `/api/rooms/:roomId/messages`

Get chat messages for a room.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Messages per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "content": "Hello everyone!",
        "type": "text",
        "user": {
          "id": "uuid",
          "name": "John Doe",
          "avatar": null
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3
    }
  }
}
```

### Send Message

**POST** `/api/rooms/:roomId/messages`

Send a chat message.

**Request Body:**
```json
{
  "content": "Hello everyone!",
  "type": "text"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "uuid",
      "content": "Hello everyone!",
      "type": "text",
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "avatar": null
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## 📹 Video Calls

### Join Video Call

**POST** `/api/rooms/:roomId/video/join`

Join video call for a room.

**Response:**
```json
{
  "success": true,
  "data": {
    "callId": "uuid",
    "participants": [
      {
        "id": "uuid",
        "name": "John Doe",
        "isVideoOn": true,
        "isAudioOn": true
      }
    ]
  }
}
```

### Leave Video Call

**POST** `/api/rooms/:roomId/video/leave`

Leave video call.

**Response:**
```json
{
  "success": true,
  "message": "Left video call successfully"
}
```

### Get Video Call Status

**GET** `/api/rooms/:roomId/video/status`

Get current video call status.

**Response:**
```json
{
  "success": true,
  "data": {
    "isActive": true,
    "participants": [
      {
        "id": "uuid",
        "name": "John Doe",
        "isVideoOn": true,
        "isAudioOn": true,
        "joinedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

## 🔌 WebSocket Events

### Connection

Connect to WebSocket server:
```javascript
const socket = io('https://api.codemitra.com', {
  auth: {
    token: 'jwt_token_here'
  }
});
```

### Client to Server Events

#### Join Room
```javascript
socket.emit('join-room', {
  roomId: 'room_uuid',
  userId: 'user_uuid'
});
```

#### Leave Room
```javascript
socket.emit('leave-room', {
  roomId: 'room_uuid',
  userId: 'user_uuid'
});
```

#### Code Change
```javascript
socket.emit('code-change', {
  roomId: 'room_uuid',
  userId: 'user_uuid',
  code: 'console.log("Hello World");',
  timestamp: Date.now()
});
```

#### Cursor Position
```javascript
socket.emit('cursor-position', {
  roomId: 'room_uuid',
  userId: 'user_uuid',
  userName: 'John Doe',
  userColor: '#FF6B6B',
  position: {
    lineNumber: 5,
    column: 10
  },
  selection: {
    startLineNumber: 5,
    startColumn: 10,
    endLineNumber: 5,
    endColumn: 20
  }
});
```

#### Send Message
```javascript
socket.emit('send-message', {
  roomId: 'room_uuid',
  message: {
    content: 'Hello everyone!',
    type: 'text'
  }
});
```

#### Typing Indicator
```javascript
socket.emit('typing', {
  roomId: 'room_uuid',
  userId: 'user_uuid',
  isTyping: true
});
```

#### Join Video Call
```javascript
socket.emit('join-video-call', {
  roomId: 'room_uuid',
  userId: 'user_uuid'
});
```

#### Leave Video Call
```javascript
socket.emit('leave-video-call', {
  roomId: 'room_uuid',
  userId: 'user_uuid'
});
```

#### Toggle Video
```javascript
socket.emit('toggle-video', {
  roomId: 'room_uuid',
  userId: 'user_uuid',
  isVideoOn: false
});
```

#### Toggle Audio
```javascript
socket.emit('toggle-audio', {
  roomId: 'room_uuid',
  userId: 'user_uuid',
  isAudioOn: false
});
```

### Server to Client Events

#### User Joined Room
```javascript
socket.on('user-joined', (user) => {
  console.log(`${user.name} joined the room`);
});
```

#### User Left Room
```javascript
socket.on('user-left', (userId) => {
  console.log(`User ${userId} left the room`);
});
```

#### Code Updated
```javascript
socket.on('code-updated', (data) => {
  console.log('Code updated by:', data.userName);
  // Update editor content
  editor.setValue(data.code);
});
```

#### Cursor Moved
```javascript
socket.on('cursor-moved', (data) => {
  console.log('Cursor moved by:', data.userName);
  // Update cursor position
  updateCursor(data);
});
```

#### New Message
```javascript
socket.on('new-message', (message) => {
  console.log('New message:', message.content);
  // Add message to chat
  addMessage(message);
});
```

#### User Typing
```javascript
socket.on('user-typing', (data) => {
  console.log(`${data.userName} is typing`);
  // Show typing indicator
  showTypingIndicator(data);
});
```

#### Video Call Events
```javascript
// User joined video call
socket.on('user-joined-video', (user) => {
  console.log(`${user.name} joined video call`);
});

// User left video call
socket.on('user-left-video', (userId) => {
  console.log(`User ${userId} left video call`);
});

// Video toggled
socket.on('video-toggled', (data) => {
  console.log(`${data.userName} toggled video: ${data.isVideoOn}`);
});

// Audio toggled
socket.on('audio-toggled', (data) => {
  console.log(`${data.userName} toggled audio: ${data.isAudioOn}`);
});
```

## ❌ Error Handling

### Error Response Format

All API errors follow this format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Example Error Responses

#### Authentication Error
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication token is required",
    "details": {}
  }
}
```

#### Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "email": "Email is required",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

#### Rate Limit Error
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60
    }
  }
}
```

## 🚦 Rate Limiting

### Rate Limits

- **Authentication endpoints**: 5 requests per minute
- **Room operations**: 30 requests per minute
- **Code execution**: 10 requests per minute
- **Chat messages**: 60 requests per minute
- **WebSocket connections**: 100 connections per minute

### Rate Limit Headers

Rate limit information is included in response headers:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

### Handling Rate Limits

When rate limit is exceeded, the API returns a 429 status with retry information:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60,
      "limit": 30,
      "resetTime": "2024-01-01T01:00:00.000Z"
    }
  }
}
```

## 📊 Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## 🔧 SDK Examples

### JavaScript/TypeScript SDK

```typescript
import { CodeMitraClient } from '@codemitra/sdk';

const client = new CodeMitraClient({
  baseUrl: 'https://api.codemitra.com',
  token: 'your_jwt_token'
});

// Create a room
const room = await client.rooms.create({
  name: 'My Room',
  description: 'A collaborative coding room',
  language: 'javascript',
  isPublic: true
});

// Join a room
await client.rooms.join(room.id, { password: 'roomPassword' });

// Execute code
const result = await client.rooms.execute(room.id, {
  code: 'console.log("Hello World");',
  language: 'javascript'
});

// Send a message
await client.rooms.sendMessage(room.id, {
  content: 'Hello everyone!',
  type: 'text'
});
```

### Python SDK

```python
from codemitra import CodeMitraClient

client = CodeMitraClient(
    base_url='https://api.codemitra.com',
    token='your_jwt_token'
)

# Create a room
room = client.rooms.create(
    name='My Room',
    description='A collaborative coding room',
    language='python',
    is_public=True
)

# Join a room
client.rooms.join(room.id, password='roomPassword')

# Execute code
result = client.rooms.execute(
    room.id,
    code='print("Hello World")',
    language='python'
)

# Send a message
client.rooms.send_message(
    room.id,
    content='Hello everyone!',
    message_type='text'
)
```

## 📚 Additional Resources

- [WebSocket Documentation](https://socket.io/docs/)
- [JWT Authentication](https://jwt.io/)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [API Design Guidelines](https://github.com/microsoft/api-guidelines)

---

For more information, visit the [main documentation](README.md) or [contact support](mailto:support@codemitra.com). 