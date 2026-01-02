import { Server, Socket } from 'socket.io';
import { setupRoomHandlers } from './roomHandlers';
import { setupCodeHandlers } from './codeHandlers';
import { prisma } from '../utils/prisma';
import jwt from 'jsonwebtoken';
import { AuthenticatedSocket } from './types';

export const setupSocketHandlers = (io: Server) => {
  // Track connected users by room
  const roomUsers = new Map<string, Set<string>>();

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token and get user
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true, avatar: true }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.user = {
        ...user,
        avatar: user.avatar || undefined
      };
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.user?.name} connected: ${socket.id}`);

    // Debug: Listen for all events at the socket level
    socket.onAny((eventName, ...args) => {
      console.log(`🔍🔍🔍 DEBUG: Socket.IO level - Received event '${eventName}' on socket ${socket.id} from user ${socket.user?.name}`);
      console.log(`🔍🔍🔍 DEBUG: Event args:`, JSON.stringify(args, null, 2));
      
      // Special handling for collaborative coding events
      if (eventName === 'room:join') {
        console.log(`🔌🔌🔌 BACKEND: room:join event received!`);
      } else if (eventName === 'code:update') {
        console.log(`📤📤📤 BACKEND: code:update event received!`);
      } else if (eventName.startsWith('test:')) {
        console.log(`🧪🧪🧪 BACKEND: Test event received: ${eventName}`);
      }
    });
    
    // Test event listeners
    socket.on('test:simple', (data) => {
      console.log(`🧪🧪🧪 BACKEND: Received test:simple event on socket ${socket.id} with data:`, data);
      socket.emit('test:simple:response', { received: true, data, timestamp: Date.now() });
    });
    
    socket.on('test:delayed', (data) => {
      console.log(`🧪🧪🧪 BACKEND: Received test:delayed event on socket ${socket.id} with data:`, data);
      socket.emit('test:delayed:response', { received: true, data, timestamp: Date.now() });
    });

    // Setup all handlers
    console.log('🔧 Setting up handlers for socket:', socket.id);
    setupRoomHandlers(io, socket, isUserInRoom, roomUsers);
    console.log('🔧 Room handlers setup complete');
    setupCodeHandlers(io, socket, isUserInRoom);
    console.log('🔧 Code handlers setup complete');

    // Handle user disconnect
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user?.name} disconnected: ${socket.id}`);
      
      // Remove user from all rooms they were in
      for (const [roomId, users] of roomUsers.entries()) {
        if (users.has(socket.userId!)) {
          users.delete(socket.userId!);
          
          // Broadcast user left event to remaining users
          socket.to(roomId).emit('room:user-left', {
            userId: socket.userId,
            userName: socket.user?.name,
            roomId,
            timestamp: new Date().toISOString(),
            reason: 'disconnected'
          });

          // Update user list for remaining users
          const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: {
              users: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true, avatar: true }
                  }
                }
              }
            }
          });

          if (room) {
            const updatedUsers = room.users
              .filter(ru => ru.userId !== socket.userId)
              .map(ru => ({
                id: ru.user.id,
                name: ru.user.name,
                email: ru.user.email,
                avatar: ru.user.avatar,
                role: ru.role,
                joinedAt: ru.joinedAt
              }));

            io.to(roomId).emit('room:users', {
              users: updatedUsers,
              roomId,
              timestamp: new Date().toISOString()
            });
          }

          console.log(`User ${socket.user?.name} removed from room ${roomId} due to disconnect`);
        }
      }
    });

    // Handle explicit room leave
    socket.on('room:leave', async (data: { roomId: string }) => {
      const { roomId } = data;
      const users = roomUsers.get(roomId);
      
      if (users && users.has(socket.userId!)) {
        users.delete(socket.userId!);
        socket.leave(roomId);
        
        // Broadcast user left event
        socket.to(roomId).emit('room:user-left', {
          userId: socket.userId,
          userName: socket.user?.name,
          roomId,
          timestamp: new Date().toISOString(),
          reason: 'left'
        });

        // Update user list
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: {
            users: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatar: true }
                }
              }
            }
          }
        });

        if (room) {
          const updatedUsers = room.users
            .filter(ru => ru.userId !== socket.userId)
            .map(ru => ({
              id: ru.user.id,
              name: ru.user.name,
              email: ru.user.email,
              avatar: ru.user.avatar,
              role: ru.role,
              joinedAt: ru.joinedAt
            }));

          io.to(roomId).emit('room:users', {
            users: updatedUsers,
            roomId,
            timestamp: new Date().toISOString()
          });
        }
      }
    });
  });
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
