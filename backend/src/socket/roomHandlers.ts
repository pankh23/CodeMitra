import { Server } from 'socket.io';
import { AuthenticatedSocket, isUserInRoom } from './index';
import { prisma } from '../utils/prisma';

export const setupRoomHandlers = (io: Server, socket: AuthenticatedSocket) => {
  // Join a room
  socket.on('room:join', async (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const userId = socket.userId!;

      // Check if user is authorized to join this room
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('room:error', { message: 'You are not authorized to join this room' });
        return;
      }

      // Join the socket room
      socket.join(roomId);

      // Get room data
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

      if (!room) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }

      // Notify other users in the room
      socket.to(roomId).emit('room:user-joined', {
        user: socket.user,
        roomId
      });

      // Send room data to the user
      socket.emit('room:joined', {
        room,
        user: socket.user
      });

      // Send current code state to the new user
      socket.emit('room:code-sync', {
        code: room.code,
        language: room.language,
        input: room.input,
        output: room.output,
        roomId
      });

      console.log(`User ${socket.user?.name} joined room ${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('room:error', { message: 'Failed to join room' });
    }
  });

  // Leave a room
  socket.on('room:leave', async (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const userId = socket.userId!;

      // Leave the socket room
      socket.leave(roomId);

      // Notify other users in the room
      socket.to(roomId).emit('room:user-left', {
        userId,
        userName: socket.user?.name,
        roomId
      });

      socket.emit('room:left', { roomId });

      console.log(`User ${socket.user?.name} left room ${roomId}`);
    } catch (error) {
      console.error('Error leaving room:', error);
      socket.emit('room:error', { message: 'Failed to leave room' });
    }
  });

  // Get room users
  socket.on('room:get-users', async (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('room:error', { message: 'You are not authorized to view this room' });
        return;
      }

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

      if (!room) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }

      socket.emit('room:users', {
        users: room.users,
        roomId
      });
    } catch (error) {
      console.error('Error getting room users:', error);
      socket.emit('room:error', { message: 'Failed to get room users' });
    }
  });

  // Update room settings (owner only)
  socket.on('room:update-settings', async (data: { roomId: string; settings: any }) => {
    try {
      const { roomId, settings } = data;
      const userId = socket.userId!;

      // Check if user is the room owner
      const room = await prisma.room.findUnique({
        where: { id: roomId }
      });

      if (!room) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }

      if (room.ownerId !== userId) {
        socket.emit('room:error', { message: 'Only the room owner can update settings' });
        return;
      }

      // Update room settings
      const updatedRoom = await prisma.room.update({
        where: { id: roomId },
        data: settings,
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

      // Notify all users in the room
      io.to(roomId).emit('room:settings-updated', {
        room: updatedRoom,
        roomId
      });

      console.log(`Room ${roomId} settings updated by ${socket.user?.name}`);
    } catch (error) {
      console.error('Error updating room settings:', error);
      socket.emit('room:error', { message: 'Failed to update room settings' });
    }
  });

  // Kick user from room (owner/admin only)
  socket.on('room:kick-user', async (data: { roomId: string; targetUserId: string }) => {
    try {
      const { roomId, targetUserId } = data;
      const userId = socket.userId!;

      // Check if user has permission to kick
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          users: true
        }
      });

      if (!room) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }

      const currentUser = room.users.find((u: { userId: string; role: string; }) => u.userId === userId);
      if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
        socket.emit('room:error', { message: 'You do not have permission to kick users' });
        return;
      }

      // Remove user from room
      await prisma.roomUser.deleteMany({
        where: {
          userId: targetUserId,
          roomId
        }
      });

      // Notify all users in the room
      io.to(roomId).emit('room:user-kicked', {
        userId: targetUserId,
        kickedBy: socket.user?.name,
        roomId
      });

      console.log(`User ${targetUserId} kicked from room ${roomId} by ${socket.user?.name}`);
    } catch (error) {
      console.error('Error kicking user:', error);
      socket.emit('room:error', { message: 'Failed to kick user' });
    }
  });
};
