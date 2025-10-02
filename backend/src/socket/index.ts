import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';

// Global declaration for Socket.IO instance
declare global {
  var io: Server;
}

// Redis connection with error handling - make it completely optional
let pubClient: Redis | null = null;
let subClient: Redis | null = null;
let redisAvailable = false;

// Only try to connect to Redis if explicitly configured
if (process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379') {
  try {
    pubClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 2000,
      commandTimeout: 2000
    });
    
    pubClient.on('error', (err) => {
      console.warn('Redis Pub Client Error (continuing without Redis):', err.message);
      redisAvailable = false;
    });
    
    pubClient.on('connect', () => {
      console.log('Redis Pub Client Connected');
      redisAvailable = true;
    });
    
    subClient = pubClient.duplicate();
    
    subClient.on('error', (err) => {
      console.warn('Redis Sub Client Error (continuing without Redis):', err.message);
      redisAvailable = false;
    });
    
    subClient.on('connect', () => {
      console.log('Redis Sub Client Connected');
      redisAvailable = true;
    });
  } catch (error) {
    console.warn('Redis initialization failed (continuing without Redis):', error);
    redisAvailable = false;
  }
} else {
  console.log('Redis not configured, using memory adapter');
  redisAvailable = false;
}

export const setupSocketIO = (server: any) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Only use Redis adapter if both clients are available and connected
  if (redisAvailable && pubClient && subClient) {
    try {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Socket.IO Redis adapter enabled');
    } catch (error) {
      console.warn('Redis adapter failed (using memory adapter):', error);
    }
  } else {
    console.log('Socket.IO using memory adapter (Redis not available)');
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId || decoded.id },
        select: { id: true, name: true, email: true, avatar: true }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.data.user.name} connected: ${socket.id}`);

    // Join room
    socket.on('room:join', async (data) => {
      try {
        const { roomId } = data;
        const userId = socket.data.user.id;

        // Verify user is participant
        const participant = await prisma.roomParticipant.findUnique({
          where: { 
            roomId_userId: { roomId, userId } 
          }
        });

        if (!participant) {
          socket.emit('error', { message: 'Not authorized to join room' });
          return;
        }

        // Update participant status to active
        await prisma.roomParticipant.update({
          where: { id: participant.id },
          data: { 
            status: 'active',
            lastActivity: new Date()
          }
        });

        socket.join(roomId);
        
        // Get current room state
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: {
            participants: {
              where: { status: 'active' },
              include: {
                user: {
                  select: { id: true, name: true, avatar: true }
                }
              }
            }
          }
        });

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Send room state to the joining user
        socket.emit('room:state', {
          roomId,
          code: room.code,
          language: room.language,
          input: room.input,
          output: room.output,
          participants: room.participants.map(p => ({
            id: p.user.id,
            name: p.user.name,
            avatar: p.user.avatar,
            cursorLine: p.cursorLine,
            cursorColumn: p.cursorColumn,
            status: p.status
          }))
        });

        // Notify others in the room
        socket.to(roomId).emit('user:joined', {
          user: {
            id: socket.data.user.id,
            name: socket.data.user.name,
            avatar: socket.data.user.avatar
          },
          count: room.participants.length
        });

        // Also broadcast updated participant list to all users in room
        socket.to(roomId).emit('room:users', {
          roomId,
          users: room.participants.map(p => ({
            id: p.user.id,
            name: p.user.name,
            avatar: p.user.avatar,
            cursorLine: p.cursorLine,
            cursorColumn: p.cursorColumn,
            status: p.status
          }))
        });

        console.log(`User ${socket.data.user.name} joined room ${roomId}`);
      } catch (error) {
        console.error('Room join error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave room
    socket.on('room:leave', async (data) => {
      try {
        const { roomId } = data;
        const userId = socket.data.user.id;
        
        // Update participant status to disconnected
        await prisma.roomParticipant.updateMany({
          where: { 
            roomId, 
            userId,
            status: 'active'
          },
          data: { 
            status: 'disconnected',
            lastActivity: new Date()
          }
        });

        socket.leave(roomId);
        
        // Get updated participant count
        const count = await getParticipantCount(roomId);
        
        // Notify others in the room
        socket.to(roomId).emit('user:left', {
          user: {
            id: socket.data.user.id,
            name: socket.data.user.name,
            avatar: socket.data.user.avatar
          },
          count
        });

        console.log(`User ${socket.data.user.name} left room ${roomId}`);
      } catch (error) {
        console.error('Room leave error:', error);
      }
    });

    // Code update
    socket.on('code:update', async (data) => {
      try {
        const { roomId, code, language } = data;
        const userId = socket.data.user.id;

        // Verify user is in room
        const participant = await prisma.roomParticipant.findUnique({
          where: { 
            roomId_userId: { roomId, userId } 
          }
        });

        if (!participant) {
          socket.emit('error', { message: 'Not in room' });
          return;
        }

        // Update room code in database
        await prisma.room.update({
          where: { id: roomId },
          data: { 
            code, 
            language: language || 'javascript',
            updatedAt: new Date() 
          }
        });

        // Broadcast to others in the room
        socket.to(roomId).emit('code:updated', {
          code,
          language: language || 'javascript',
          user: socket.data.user
        });

        console.log(`Code updated in room ${roomId} by ${socket.data.user.name}`);
      } catch (error) {
        console.error('Code update error:', error);
        socket.emit('error', { message: 'Failed to update code' });
      }
    });

    // Cursor update
    socket.on('cursor:update', async (data) => {
      try {
        const { roomId, line, column } = data;
        const userId = socket.data.user.id;

        // Update cursor position in database
        await prisma.roomParticipant.updateMany({
          where: { 
            roomId, 
            userId,
            status: 'active'
          },
          data: { 
            cursorLine: line,
            cursorColumn: column,
            lastActivity: new Date()
          }
        });

        // Broadcast cursor position to others
        socket.to(roomId).emit('cursor:updated', {
          user: {
            id: socket.data.user.id,
            name: socket.data.user.name,
            avatar: socket.data.user.avatar
          },
          line,
          column
        });
      } catch (error) {
        console.error('Cursor update error:', error);
      }
    });

    // Code execution result
    socket.on('code:execution', (data) => {
      const { roomId, result } = data;
      socket.to(roomId).emit('code:execution:result', {
        result,
        user: socket.data.user
      });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`User ${socket.data.user.name} disconnected: ${socket.id}`);
      
      // Handle graceful disconnect - update status in all rooms
      try {
        const rooms = await prisma.roomParticipant.findMany({
          where: { 
            userId: socket.data.user.id,
            status: 'active'
          }
        });

        for (const room of rooms) {
          // Update participant status to disconnected
          await prisma.roomParticipant.updateMany({
            where: { 
              roomId: room.roomId,
              userId: socket.data.user.id,
              status: 'active'
            },
            data: { 
              status: 'disconnected',
              lastActivity: new Date()
            }
          });

          // Get updated count and notify others
          const count = await getParticipantCount(room.roomId);
          socket.to(room.roomId).emit('user:left', {
            user: {
              id: socket.data.user.id,
              name: socket.data.user.name,
              avatar: socket.data.user.avatar
            },
            count
          });
        }
      } catch (error) {
        console.error('Disconnect cleanup error:', error);
      }
    });
  });

  return io;
};

async function getParticipantCount(roomId: string): Promise<number> {
  return await prisma.roomParticipant.count({
    where: { roomId, status: 'active' }
  });
}
