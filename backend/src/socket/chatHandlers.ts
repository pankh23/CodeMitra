import { AuthenticatedSocket, Server } from './types';
import { prisma } from '../utils/prisma';



export const setupChatHandlers = (io: Server, socket: AuthenticatedSocket, isUserInRoom: (userId: string, roomId: string) => Promise<boolean>) => {
  // Send a chat message
  socket.on('chat:send-message', async (data: { roomId: string; content: string; type?: string }) => {
    try {
      const { roomId, content, type = 'text' } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('chat:error', { message: 'You are not authorized to send messages in this room' });
        return;
      }

      // Validate content
      if (!content.trim()) {
        socket.emit('chat:error', { message: 'Message content cannot be empty' });
        return;
      }

      if (content.length > 1000) {
        socket.emit('chat:error', { message: 'Message content is too long' });
        return;
      }

      // Create chat message
      const chatMessage = await prisma.chatMessage.create({
        data: {
          content: content.trim(),
          type,
          userId,
          roomId
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        }
      });

      // Broadcast message to all users in the room
      io.to(roomId).emit('chat:message-received', {
        message: chatMessage,
        roomId
      });

      console.log(`Message sent in room ${roomId} by ${socket.user?.name}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('chat:error', { message: 'Failed to send message' });
    }
  });

  // Get chat history
  socket.on('chat:get-history', async (data: { roomId: string; page?: number; limit?: number }) => {
    try {
      const { roomId, page = 1, limit = 50 } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('chat:error', { message: 'You are not authorized to view chat history in this room' });
        return;
      }

      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        prisma.chatMessage.findMany({
          where: { roomId },
          skip,
          take: limit,
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.chatMessage.count({ where: { roomId } })
      ]);

      socket.emit('chat:history', {
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        roomId
      });
    } catch (error) {
      console.error('Error getting chat history:', error);
      socket.emit('chat:error', { message: 'Failed to get chat history' });
    }
  });

  // Delete a chat message (author or room owner/admin)
  socket.on('chat:delete-message', async (data: { roomId: string; messageId: string }) => {
    try {
      const { roomId, messageId } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('chat:error', { message: 'You are not authorized to delete messages in this room' });
        return;
      }

      // Get message and check permissions
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        include: {
          room: {
            include: {
              users: {
                where: { userId }
              }
            }
          }
        }
      });

      if (!message) {
        socket.emit('chat:error', { message: 'Message not found' });
        return;
      }

      if (message.roomId !== roomId) {
        socket.emit('chat:error', { message: 'Message does not belong to this room' });
        return;
      }

      // Check if user can delete this message
      const userInRoom = message.room.users[0];
      const canDelete = message.userId === userId || 
                       message.room.ownerId === userId || 
                       (userInRoom && userInRoom.role === 'admin');

      if (!canDelete) {
        socket.emit('chat:error', { message: 'You do not have permission to delete this message' });
        return;
      }

      // Delete the message
      await prisma.chatMessage.delete({
        where: { id: messageId }
      });

      // Notify all users in the room
      io.to(roomId).emit('chat:message-deleted', {
        messageId,
        deletedBy: socket.user?.name,
        roomId
      });

      console.log(`Message ${messageId} deleted in room ${roomId} by ${socket.user?.name}`);
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('chat:error', { message: 'Failed to delete message' });
    }
  });

  // Edit a chat message (author only)
  socket.on('chat:edit-message', async (data: { roomId: string; messageId: string; content: string }) => {
    try {
      const { roomId, messageId, content } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('chat:error', { message: 'You are not authorized to edit messages in this room' });
        return;
      }

      // Validate content
      if (!content.trim()) {
        socket.emit('chat:error', { message: 'Message content cannot be empty' });
        return;
      }

      if (content.length > 1000) {
        socket.emit('chat:error', { message: 'Message content is too long' });
        return;
      }

      // Get message and check permissions
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId }
      });

      if (!message) {
        socket.emit('chat:error', { message: 'Message not found' });
        return;
      }

      if (message.roomId !== roomId) {
        socket.emit('chat:error', { message: 'Message does not belong to this room' });
        return;
      }

      if (message.userId !== userId) {
        socket.emit('chat:error', { message: 'You can only edit your own messages' });
        return;
      }

      // Update the message
      const updatedMessage = await prisma.chatMessage.update({
        where: { id: messageId },
        data: { content: content.trim() },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        }
      });

      // Notify all users in the room
      io.to(roomId).emit('chat:message-edited', {
        message: updatedMessage,
        roomId
      });

      console.log(`Message ${messageId} edited in room ${roomId} by ${socket.user?.name}`);
    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('chat:error', { message: 'Failed to edit message' });
    }
  });

  // Handle typing indicators
  socket.on('chat:typing-start', async (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        return;
      }

      // Broadcast typing indicator to all users in the room except sender
      socket.to(roomId).emit('chat:user-typing', {
        userId,
        userName: socket.user?.name,
        roomId
      });
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  });

  socket.on('chat:typing-stop', async (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        return;
      }

      // Broadcast typing stop to all users in the room except sender
      socket.to(roomId).emit('chat:user-stopped-typing', {
        userId,
        userName: socket.user?.name,
        roomId
      });
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  });

  // Handle message reactions (like, dislike, etc.)
  socket.on('chat:react-message', async (data: { roomId: string; messageId: string; reaction: string }) => {
    try {
      const { roomId, messageId, reaction } = data;
      const userId = socket.userId!;

      // Check if user is authorized
      const isAuthorized = await isUserInRoom(userId, roomId);
      if (!isAuthorized) {
        socket.emit('chat:error', { message: 'You are not authorized to react to messages in this room' });
        return;
      }

      // Validate reaction
      const validReactions = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡'];
      if (!validReactions.includes(reaction)) {
        socket.emit('chat:error', { message: 'Invalid reaction' });
        return;
      }

      // Check if message exists
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId }
      });

      if (!message || message.roomId !== roomId) {
        socket.emit('chat:error', { message: 'Message not found' });
        return;
      }

      // For now, just broadcast the reaction (you might want to store reactions in database)
      io.to(roomId).emit('chat:message-reaction', {
        messageId,
        reaction,
        userId,
        userName: socket.user?.name,
        roomId
      });

      console.log(`Reaction ${reaction} added to message ${messageId} in room ${roomId} by ${socket.user?.name}`);
    } catch (error) {
      console.error('Error handling message reaction:', error);
      socket.emit('chat:error', { message: 'Failed to react to message' });
    }
  });
};
