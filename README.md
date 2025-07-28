# CodeMitra 🚀

**Real-time Collaborative Compiler with Video Calls, Chat & Secure Rooms**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

CodeMitra is a comprehensive real-time collaborative coding platform that enables developers to code together, compile and run code in multiple programming languages, conduct video calls, and chat seamlessly. It's designed for remote pair programming, code reviews, educational purposes, and team collaboration.

### What CodeMitra Does

- **Real-time Code Collaboration**: Multiple users can edit code simultaneously with live cursor tracking
- **Multi-language Code Execution**: Supports 10+ programming languages with secure Docker-based execution
- **Video Conferencing**: Built-in WebRTC video calls for face-to-face collaboration
- **Real-time Chat**: Instant messaging with typing indicators and message history
- **Secure Rooms**: Password-protected rooms with role-based access control
- **Code Compilation & Execution**: Safe, isolated code execution with resource limits
- **File Management**: Upload, download, and version control for code files

## ✨ Features

### 🖥️ Code Editor
- **Monaco Editor Integration**: Professional code editing experience
- **Real-time Collaboration**: Live cursor tracking and code synchronization
- **Multi-language Support**: Syntax highlighting for 10+ programming languages
- **Auto-save**: Automatic code saving with configurable intervals
- **Theme Support**: Light, dark, and high contrast themes
- **Customizable Settings**: Font size, minimap, word wrap, and more

### 🚀 Code Execution
- **Supported Languages**:
  - JavaScript/TypeScript
  - Python
  - Java
  - C/C++
  - Go
  - Rust
  - PHP
  - Ruby
- **Secure Execution**: Docker container isolation
- **Resource Limits**: Memory and CPU constraints
- **Timeout Protection**: Configurable execution timeouts
- **Input/Output Support**: Standard input/output handling

### 📹 Video Calls
- **WebRTC Integration**: Peer-to-peer video communication
- **Multi-participant Support**: Multiple users in a single call
- **Audio/Video Controls**: Mute/unmute, camera on/off
- **Screen Sharing**: Share your screen during calls
- **Call Management**: Join/leave call functionality

### 💬 Real-time Chat
- **Instant Messaging**: Real-time text communication
- **Typing Indicators**: See when others are typing
- **Message History**: Persistent chat history
- **System Messages**: Automated notifications
- **Code Snippets**: Share code blocks in chat

### 🔐 Security & Rooms
- **Password Protection**: Secure room access
- **Role-based Access**: Owner, admin, and member roles
- **Public/Private Rooms**: Flexible room visibility
- **User Authentication**: JWT-based authentication
- **Rate Limiting**: API protection against abuse

## 🏗️ Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        FE[Next.js Frontend]
        UI[React Components]
        WE[WebRTC Client]
    end
    
    subgraph "Backend Layer"
        API[Express.js API]
        WS[Socket.IO Server]
        AUTH[JWT Authentication]
    end
    
    subgraph "Worker Layer"
        EXE[Code Executor]
        DOCKER[Docker Engine]
        QUEUE[BullMQ Queue]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL)]
        CACHE[(Redis)]
        STORAGE[File Storage]
    end
    
    subgraph "Infrastructure"
        NGINX[Nginx Proxy]
        K8S[Kubernetes]
        MONITOR[Monitoring]
    end
    
    FE --> API
    FE --> WS
    UI --> FE
    WE --> WS
    API --> AUTH
    API --> DB
    API --> CACHE
    WS --> CACHE
    API --> QUEUE
    QUEUE --> EXE
    EXE --> DOCKER
    EXE --> STORAGE
    NGINX --> FE
    NGINX --> API
    K8S --> NGINX
    MONITOR --> K8S
```

### Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant W as Worker
    participant D as Database
    participant R as Redis
    
    U->>F: Login
    F->>B: Authenticate
    B->>D: Verify User
    B->>F: JWT Token
    F->>U: Dashboard
    
    U->>F: Join Room
    F->>B: Room Request
    B->>D: Get Room Data
    B->>F: Room Info
    F->>U: Room Interface
    
    U->>F: Edit Code
    F->>B: Code Change
    B->>R: Broadcast
    B->>F: Update Others
    F->>U: Sync Code
    
    U->>F: Run Code
    F->>B: Execution Request
    B->>W: Add to Queue
    W->>W: Execute in Docker
    W->>B: Results
    B->>F: Output
    F->>U: Show Results
```

### Component Architecture

```mermaid
graph LR
    subgraph "Frontend Components"
        AUTH[Auth Components]
        EDITOR[Monaco Editor]
        VIDEO[Video Call]
        CHAT[Chat Interface]
        ROOM[Room Manager]
    end
    
    subgraph "Backend Services"
        AUTH_API[Auth Routes]
        ROOM_API[Room Routes]
        USER_API[User Routes]
        SOCKET[Socket Handlers]
    end
    
    subgraph "Worker Services"
        EXECUTOR[Docker Executor]
        LANGUAGES[Language Support]
        QUEUE[Job Queue]
    end
    
    AUTH --> AUTH_API
    EDITOR --> SOCKET
    VIDEO --> SOCKET
    CHAT --> SOCKET
    ROOM --> ROOM_API
    ROOM_API --> EXECUTOR
    EXECUTOR --> LANGUAGES
    EXECUTOR --> QUEUE
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with SSR
- **TypeScript** - Type-safe JavaScript
- **Monaco Editor** - Professional code editor
- **Socket.IO Client** - Real-time communication
- **WebRTC** - Peer-to-peer video calls
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Zustand** - State management

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **Prisma** - Database ORM
- **JWT** - Authentication
- **Redis** - Caching and session storage
- **BullMQ** - Job queue management

### Worker
- **Docker** - Containerized code execution
- **Dockerode** - Docker API for Node.js
- **Multi-language Support** - 10+ programming languages
- **Resource Management** - Memory and CPU limits

### Database
- **PostgreSQL** - Primary database
- **Redis** - Caching and real-time data

### Infrastructure
- **Docker Compose** - Local development
- **Kubernetes** - Production orchestration
- **Nginx** - Reverse proxy
- **Helm** - K8s package manager

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **Docker** & Docker Compose
- **PostgreSQL** 15+
- **Redis** 7+

### Quick Setup with Docker

```bash
# Clone the repository
git clone https://github.com/yourusername/codemitra.git
cd codemitra

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Access the application
open http://localhost:3000
```

## 📦 Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/codemitra.git
cd codemitra
```

### 2. Environment Setup

```bash
# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/codemitra"
POSTGRES_DB=codemitra
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Application
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# Worker
WORKER_TIMEOUT=30000
WORKER_MEMORY_LIMIT=512m
```

### 3. Database Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed
```

### 4. Start Services

#### Option A: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Option B: Manual Start

```bash
# Terminal 1: Start Backend
cd backend && npm install && npm run dev

# Terminal 2: Start Frontend
cd frontend && npm install && npm run dev

# Terminal 3: Start Worker
cd worker && npm install && npm run dev
```

### 5. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Database Admin**: http://localhost:8080 (if using pgAdmin)
- **Redis**: localhost:6379

## 🛠️ Development Setup

### Development Scripts

```bash
# Install all dependencies
npm install

# Start development environment
npm run dev

# Build all services
npm run build

# Run tests
npm test

# Database operations
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio

# Docker operations
npm run docker:up
npm run docker:down
npm run docker:build
```

### Project Structure

```
codemitra/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # React components
│   │   │   ├── auth/        # Authentication components
│   │   │   ├── chat/        # Chat interface
│   │   │   ├── editor/      # Monaco editor
│   │   │   ├── room/        # Room management
│   │   │   ├── video/       # Video call components
│   │   │   └── ui/          # UI components
│   │   ├── lib/             # Utility libraries
│   │   ├── styles/          # CSS styles
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── Dockerfile
├── backend/                  # Express.js API server
│   ├── src/
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── socket/          # Socket.IO handlers
│   │   └── utils/           # Utility functions
│   ├── package.json
│   └── Dockerfile
├── worker/                   # Code execution worker
│   ├── src/
│   │   ├── executors/       # Code execution logic
│   │   ├── languages/       # Language configurations
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utility functions
│   ├── package.json
│   └── Dockerfile
├── prisma/                   # Database schema and migrations
│   └── schema.prisma
├── k8s/                      # Kubernetes manifests
├── nginx/                    # Nginx configuration
├── docker-compose.yml        # Production Docker setup
├── docker-compose.dev.yml    # Development Docker setup
├── package.json              # Root package.json
└── README.md
```

### Development Workflow

```mermaid
graph LR
    A[Code Changes] --> B[Local Development]
    B --> C[Testing]
    C --> D[Code Review]
    D --> E[CI/CD Pipeline]
    E --> F[Staging Deployment]
    F --> G[Production Deployment]
    
    B --> H[Docker Compose]
    B --> I[Hot Reload]
    C --> J[Unit Tests]
    C --> K[Integration Tests]
    E --> L[Build & Test]
    E --> M[Security Scan]
```

## 🚀 Production Deployment

### Kubernetes Deployment

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy database
kubectl apply -f k8s/postgres.yaml

# Deploy Redis
kubectl apply -f k8s/redis.yaml

# Deploy backend
kubectl apply -f k8s/backend.yaml

# Deploy frontend
kubectl apply -f k8s/frontend.yaml

# Deploy monitoring
kubectl apply -f k8s/monitoring.yaml
```

### Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Deploy with Docker Compose
docker-compose -f docker-compose.yml up -d
```

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/codemitra
REDIS_URL=redis://prod-redis:6379
JWT_SECRET=your-production-jwt-secret
NEXTAUTH_SECRET=your-production-nextauth-secret
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

## 📚 API Documentation

### Authentication Endpoints

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Room Endpoints

```http
GET    /api/rooms
POST   /api/rooms
GET    /api/rooms/:id
PUT    /api/rooms/:id
DELETE /api/rooms/:id
POST   /api/rooms/:id/join
POST   /api/rooms/:id/leave
```

### User Endpoints

```http
GET    /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
```

### Socket.IO Events

```javascript
// Client to Server
socket.emit('join-room', { roomId, userId })
socket.emit('leave-room', { roomId, userId })
socket.emit('code-change', { roomId, code, userId })
socket.emit('cursor-position', { roomId, position, userId })
socket.emit('send-message', { roomId, message })
socket.emit('join-video-call', { roomId, userId })

// Server to Client
socket.on('user-joined', (user))
socket.on('user-left', (userId))
socket.on('code-updated', (code, userId))
socket.on('cursor-moved', (position, userId))
socket.on('new-message', (message))
socket.on('video-call-joined', (userId))
```

## 🔧 Configuration

### Supported Programming Languages

| Language | Version | Docker Image | Memory Limit |
|----------|---------|--------------|--------------|
| JavaScript | 18.x | node:18-alpine | 256MB |
| TypeScript | 5.x | node:18-alpine | 256MB |
| Python | 3.11 | python:3.11-alpine | 256MB |
| Java | 17 | openjdk:17-alpine | 512MB |
| C++ | 17 | gcc:latest | 256MB |
| C | 17 | gcc:latest | 256MB |
| Go | 1.21 | golang:1.21-alpine | 256MB |
| Rust | 1.75 | rust:1.75-alpine | 256MB |
| PHP | 8.2 | php:8.2-cli-alpine | 256MB |
| Ruby | 3.2 | ruby:3.2-alpine | 256MB |

### Security Features

- **Docker Container Isolation**: Each code execution runs in isolated containers
- **Resource Limits**: Memory and CPU constraints prevent abuse
- **Timeout Protection**: Configurable execution timeouts
- **Banned Imports**: Restricted access to system-level modules
- **Rate Limiting**: API protection against abuse
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive input sanitization

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Write unit tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Professional code editor
- [Socket.IO](https://socket.io/) - Real-time communication
- [Prisma](https://www.prisma.io/) - Database toolkit
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

## 📞 Support

- **Documentation**: [docs.codemitra.com](https://docs.codemitra.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/codemitra/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/codemitra/discussions)
- **Email**: support@codemitra.com

---

**Made with ❤️ by the CodeMitra Team** 