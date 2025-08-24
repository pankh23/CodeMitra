import { AuthenticatedSocket, Server } from './types';
import { prisma } from '../utils/prisma';



// WebRTC type definitions
interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer';
  sdp: string;
}

interface RTCIceCandidateInit {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
}

export const setupVideoHandlers = (io: Server, socket: AuthenticatedSocket, isUserInRoom: (userId: string, roomId: string) => Promise<boolean>) => {
  // Join video call room
  socket.on('video:join', async (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('video:error', { message: 'You are not authorized to join video calls in this room' });
        return;
      }

      // Join the video room
      socket.join(`video:${roomId}`);

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, avatar: true }
      });

      if (!user) {
        socket.emit('video:error', { message: 'User not found' });
        return;
      }

      // Notify other users in the video room
      socket.to(`video:${roomId}`).emit('video:user-joined', {
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        roomId
      });

      console.log(`User ${user.name} joined video call in room ${roomId}`);
    } catch (error) {
      console.error('Error joining video call:', error);
      socket.emit('video:error', { message: 'Failed to join video call' });
    }
  });

  // Leave video call room
  socket.on('video:leave', async (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const userId = socket.userId!;

      // Leave the video room
      socket.leave(`video:${roomId}`);

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true }
      });

      if (user) {
        // Notify other users in the video room
        socket.to(`video:${roomId}`).emit('video:user-left', {
          userId: user.id,
          roomId
        });

        console.log(`User ${user.name} left video call in room ${roomId}`);
      }
    } catch (error) {
      console.error('Error leaving video call:', error);
    }
  });

  // Handle video call started
  socket.on('video:call-started', async (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        return;
      }

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true }
      });

      if (user) {
        // Notify other users in the room about incoming call
        socket.to(roomId).emit('video:incoming-call', {
          from: {
            id: user.id,
            name: user.name
          },
          roomId
        });

        console.log(`Video call started by ${user.name} in room ${roomId}`);
      }
    } catch (error) {
      console.error('Error starting video call:', error);
    }
  });

  // Handle video call ended
  socket.on('video:call-ended', async (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        return;
      }

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true }
      });

      if (user) {
        // Notify other users in the room
        socket.to(roomId).emit('video:call-ended', {
          by: {
            id: user.id,
            name: user.name
          },
          roomId
        });

        console.log(`Video call ended by ${user.name} in room ${roomId}`);
      }
    } catch (error) {
      console.error('Error ending video call:', error);
    }
  });

  // Handle WebRTC offer
  socket.on('video:offer', async (data: { roomId: string; to: string; offer: RTCSessionDescriptionInit }) => {
    try {
      const { roomId, to, offer } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        return;
      }

      // Forward offer to specific user
      socket.to(to).emit('video:offer', {
        from: userId,
        offer,
        roomId
      });

      console.log(`WebRTC offer forwarded from ${userId} to ${to} in room ${roomId}`);
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
    }
  });

  // Handle WebRTC answer
  socket.on('video:answer', async (data: { roomId: string; to: string; answer: RTCSessionDescriptionInit }) => {
    try {
      const { roomId, to, answer } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        return;
      }

      // Forward answer to specific user
      socket.to(to).emit('video:answer', {
        from: userId,
        answer,
        roomId
      });

      console.log(`WebRTC answer forwarded from ${userId} to ${to} in room ${roomId}`);
    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
    }
  });

  // Handle ICE candidates
  socket.on('video:ice-candidate', async (data: { roomId: string; to: string; candidate: RTCIceCandidateInit }) => {
    try {
      const { roomId, to, candidate } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        return;
      }

      // Forward ICE candidate to specific user
      socket.to(to).emit('video:ice-candidate', {
        from: userId,
        candidate,
        roomId
      });

      console.log(`ICE candidate forwarded from ${userId} to ${to} in room ${roomId}`);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  });

  // Handle video call status updates
  socket.on('video:status-update', async (data: { roomId: string; status: string; details?: any }) => {
    try {
      const { roomId, status, details } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        return;
      }

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true }
      });

      if (user) {
        // Broadcast status update to all users in the video room
        io.to(`video:${roomId}`).emit('video:status-updated', {
          userId: user.id,
          userName: user.name,
          status,
          details,
          roomId,
          timestamp: new Date()
        });

        console.log(`Video status update from ${user.name} in room ${roomId}: ${status}`);
      }
    } catch (error) {
      console.error('Error handling video status update:', error);
    }
  });

  // Handle video call recording requests
  socket.on('video:recording-request', async (data: { roomId: string; action: 'start' | 'stop' }) => {
    try {
      const { roomId, action } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('video:error', { message: 'You are not authorized to control recording in this room' });
        return;
      }

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true }
      });

      if (user) {
        // Broadcast recording request to all users in the video room
        io.to(`video:${roomId}`).emit('video:recording-requested', {
          userId: user.id,
          userName: user.name,
          action,
          roomId,
          timestamp: new Date()
        });

        console.log(`Video recording ${action} requested by ${user.name} in room ${roomId}`);
      }
    } catch (error) {
      console.error('Error handling recording request:', error);
      socket.emit('video:error', { message: 'Failed to handle recording request' });
    }
  });
};
