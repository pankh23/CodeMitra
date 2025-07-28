import { Server, Socket } from 'socket.io';
import { verifyToken } from '@/utils/jwt';
import { prisma } from '@/utils/prisma';
import { redisClient } from '@/utils/redis';
import { setupRoomHandlers } from './roomHandlers';
import { setupCodeHandlers } from './codeHandlers';
import { setupChatHandlers } from './chatHandlers';
import { setupVideoHandlers } from './videoHandlers';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
}

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Authentication error: Invalid token'));
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
        },
      });

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.user?.name} connected (${socket.id})`);

    // Store user socket mapping in Redis
    redisClient.setEx(`socket:${socket.userId}`, 3600, socket.id);

    // Setup handlers for different features
    setupRoomHandlers(io, socket);
    setupCodeHandlers(io, socket);
    setupChatHandlers(io, socket);
    setupVideoHandlers(io, socket);

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user?.name} disconnected (${socket.id})`);
      
      // Clean up Redis entries
      await redisClient.del(`socket:${socket.userId}`);
      
      // Leave all rooms and notify other users
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      for (const roomId of rooms) {
        socket.to(roomId).emit('room:user-left', {
          userId: socket.userId,
          userName: socket.user?.name,
          roomId
        });
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.user?.name}:`, error);
    });
  });

  // Global error handler
  io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err);
  });
};

// Utility function to get user socket by user ID
export const getUserSocket = async (userId: string): Promise<string | null> => {
  return await redisClient.get(`socket:${userId}`);
};

// Utility function to emit to specific user
export const emitToUser = async (io: Server, userId: string, event: string, data: any) => {
  const socketId = await getUserSocket(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
};

// Utility function to emit to all users in a room
export const emitToRoom = (io: Server, roomId: string, event: string, data: any) => {
  io.to(roomId).emit(event, data);
};

// Utility function to check if user is in room
export const isUserInRoom = async (userId: string, roomId: string): Promise<boolean> => {
  const roomUser = await prisma.roomUser.findFirst({
    where: {
      userId,
      roomId
    }
  });
  return !!roomUser;
};
