import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
// import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import dotenv from 'dotenv';

import { authRoutes } from './routes/auth';
import { roomRoutes } from './routes/rooms';
import { userRoutes } from './routes/users';
import { errorHandler } from './middleware/errorHandler';
import { setupSocketHandlers } from './socket';
import { prisma } from './utils/prisma';
import { redisClient } from './utils/redis';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 8000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(limiter);
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);

// Socket.IO setup
async function setupSocketIO() {
  try {
    // Create Redis adapter for Socket.IO - temporarily disabled for build
    // const pubClient = redisClient.duplicate();
    // const subClient = redisClient.duplicate();
    
    // await pubClient.connect();
    // await subClient.connect();
    
    // io.adapter(createAdapter(pubClient, subClient));
    
    // Setup socket handlers
    setupSocketHandlers(io);
    
    console.log('Socket.IO setup completed');
  } catch (error) {
    console.error('Failed to setup Socket.IO:', error);
    process.exit(1);
  }
}

// Error handling middleware
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Redis will connect automatically with ioredis
    console.log('Connected to Redis');
    
    // Setup Socket.IO
    await setupSocketIO();
    
    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  
  await redisClient.disconnect();
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();

export { app, io };
