// Use flexible types to avoid module resolution issues during build
interface Server {
  to(room: string): any;
  [key: string]: any;
}

interface AuthenticatedSocket {
  userId?: string;
  user?: { name?: string };
  on(event: string, handler: Function): void;
  emit(event: string, data: any): void;
  to(room: string): any;
  join?(room: string): void;
  leave?(room: string): void;
  [key: string]: any;
}

interface isUserInRoomFunction {
  (userId: string, roomId: string): Promise<boolean>;
}

declare const isUserInRoom: isUserInRoomFunction;
import { prisma } from '../utils/prisma';
import { Queue } from 'bullmq';
import { redisClient } from '../utils/redis';

// Create BullMQ queue for code execution
const codeExecutionQueue = new Queue('code-execution', {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const setupCodeHandlers = (io: Server, socket: AuthenticatedSocket) => {
  // Handle code updates
  socket.on('code:update', async (data: { roomId: string; code: string; language?: string }) => {
    try {
      const { roomId, code, language } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('code:error', { message: 'You are not authorized to edit code in this room' });
        return;
      }

      // Update code in database
      const updateData: any = { code };
      if (language) {
        updateData.language = language;
      }

      await prisma.room.update({
        where: { id: roomId },
        data: updateData
      });

      // Broadcast code update to all users in the room except sender
      socket.to(roomId).emit('code:updated', {
        code,
        language,
        userId,
        userName: socket.user?.name,
        roomId
      });

      console.log(`Code updated in room ${roomId} by ${socket.user?.name}`);
    } catch (error) {
      console.error('Error updating code:', error);
      socket.emit('code:error', { message: 'Failed to update code' });
    }
  });

  // Handle language changes
  socket.on('code:language-change', async (data: { roomId: string; language: string }) => {
    try {
      const { roomId, language } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('code:error', { message: 'You are not authorized to change language in this room' });
        return;
      }

      // Update language in database
      await prisma.room.update({
        where: { id: roomId },
        data: { language }
      });

      // Broadcast language change to all users in the room
      io.to(roomId).emit('code:language-changed', {
        language,
        userId,
        userName: socket.user?.name,
        roomId
      });

      console.log(`Language changed to ${language} in room ${roomId} by ${socket.user?.name}`);
    } catch (error) {
      console.error('Error changing language:', error);
      socket.emit('code:error', { message: 'Failed to change language' });
    }
  });

  // Handle input updates
  socket.on('code:input-update', async (data: { roomId: string; input: string }) => {
    try {
      const { roomId, input } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('code:error', { message: 'You are not authorized to update input in this room' });
        return;
      }

      // Update input in database
      await prisma.room.update({
        where: { id: roomId },
        data: { input }
      });

      // Broadcast input update to all users in the room except sender
      socket.to(roomId).emit('code:input-updated', {
        input,
        userId,
        userName: socket.user?.name,
        roomId
      });

      console.log(`Input updated in room ${roomId} by ${socket.user?.name}`);
    } catch (error) {
      console.error('Error updating input:', error);
      socket.emit('code:error', { message: 'Failed to update input' });
    }
  });

  // Handle code execution requests
  socket.on('code:execute', async (data: { roomId: string; code: string; language: string; input?: string }) => {
    try {
      const { roomId, code, language, input = '' } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('code:error', { message: 'You are not authorized to execute code in this room' });
        return;
      }

      // Create execution log
      const executionLog = await prisma.executionLog.create({
        data: {
          code,
          language,
          input,
          roomId,
          userId,
          status: 'pending'
        }
      });

      // Notify all users in the room that execution started
      io.to(roomId).emit('code:execution-started', {
        executionId: executionLog.id,
        userId,
        userName: socket.user?.name,
        roomId
      });

      // Add job to execution queue
      await codeExecutionQueue.add('execute-code', {
        executionId: executionLog.id,
        code,
        language,
        input,
        roomId,
        userId
      });

      console.log(`Code execution started in room ${roomId} by ${socket.user?.name}`);
    } catch (error) {
      console.error('Error executing code:', error);
      socket.emit('code:error', { message: 'Failed to execute code' });
    }
  });

  // Handle cursor position updates (for collaborative editing)
  socket.on('code:cursor-update', async (data: { roomId: string; position: { line: number; column: number } }) => {
    try {
      const { roomId, position } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        return;
      }

      // Broadcast cursor position to all users in the room except sender
      socket.to(roomId).emit('code:cursor-updated', {
        position,
        userId,
        userName: socket.user?.name,
        roomId
      });
    } catch (error) {
      console.error('Error updating cursor position:', error);
    }
  });

  // Handle selection updates (for collaborative editing)
  socket.on('code:selection-update', async (data: { 
    roomId: string; 
    selection: { 
      startLine: number; 
      startColumn: number; 
      endLine: number; 
      endColumn: number; 
    } 
  }) => {
    try {
      const { roomId, selection } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        return;
      }

      // Broadcast selection to all users in the room except sender
      socket.to(roomId).emit('code:selection-updated', {
        selection,
        userId,
        userName: socket.user?.name,
        roomId
      });
    } catch (error) {
      console.error('Error updating selection:', error);
    }
  });

  // Handle code formatting requests
  socket.on('code:format', async (data: { roomId: string; code: string; language: string }) => {
    try {
      const { roomId, code, language } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('code:error', { message: 'You are not authorized to format code in this room' });
        return;
      }

      // Add formatting job to queue (this would be implemented in the worker)
      await codeExecutionQueue.add('format-code', {
        code,
        language,
        roomId,
        userId
      });

      console.log(`Code formatting requested in room ${roomId} by ${socket.user?.name}`);
    } catch (error) {
      console.error('Error formatting code:', error);
      socket.emit('code:error', { message: 'Failed to format code' });
    }
  });

  // Handle code save requests
  socket.on('code:save', async (data: { roomId: string; code: string; language: string }) => {
    try {
      const { roomId, code, language } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('code:error', { message: 'You are not authorized to save code in this room' });
        return;
      }

      // Update code in database
      await prisma.room.update({
        where: { id: roomId },
        data: { code, language }
      });

      // Notify all users in the room that code was saved
      io.to(roomId).emit('code:saved', {
        userId,
        userName: socket.user?.name,
        roomId,
        timestamp: new Date().toISOString()
      });

      console.log(`Code saved in room ${roomId} by ${socket.user?.name}`);
    } catch (error) {
      console.error('Error saving code:', error);
      socket.emit('code:error', { message: 'Failed to save code' });
    }
  });
};

export { codeExecutionQueue };
