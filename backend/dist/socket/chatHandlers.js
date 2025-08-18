"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupChatHandlers = void 0;
const index_1 = require("./index");
const prisma_1 = require("../utils/prisma");
const setupChatHandlers = (io, socket) => {
    socket.on('chat:send-message', async (data) => {
        try {
            const { roomId, content, type = 'text' } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                socket.emit('chat:error', { message: 'You are not authorized to send messages in this room' });
                return;
            }
            if (!content.trim()) {
                socket.emit('chat:error', { message: 'Message content cannot be empty' });
                return;
            }
            if (content.length > 1000) {
                socket.emit('chat:error', { message: 'Message content is too long' });
                return;
            }
            const chatMessage = await prisma_1.prisma.chatMessage.create({
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
            io.to(roomId).emit('chat:message-received', {
                message: chatMessage,
                roomId
            });
            console.log(`Message sent in room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error sending message:', error);
            socket.emit('chat:error', { message: 'Failed to send message' });
        }
    });
    socket.on('chat:get-history', async (data) => {
        try {
            const { roomId, page = 1, limit = 50 } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                socket.emit('chat:error', { message: 'You are not authorized to view chat history in this room' });
                return;
            }
            const skip = (page - 1) * limit;
            const [messages, total] = await Promise.all([
                prisma_1.prisma.chatMessage.findMany({
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
                prisma_1.prisma.chatMessage.count({ where: { roomId } })
            ]);
            socket.emit('chat:history', {
                messages: messages.reverse(),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                },
                roomId
            });
        }
        catch (error) {
            console.error('Error getting chat history:', error);
            socket.emit('chat:error', { message: 'Failed to get chat history' });
        }
    });
    socket.on('chat:delete-message', async (data) => {
        try {
            const { roomId, messageId } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                socket.emit('chat:error', { message: 'You are not authorized to delete messages in this room' });
                return;
            }
            const message = await prisma_1.prisma.chatMessage.findUnique({
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
            const userInRoom = message.room.users[0];
            const canDelete = message.userId === userId ||
                message.room.ownerId === userId ||
                (userInRoom && userInRoom.role === 'admin');
            if (!canDelete) {
                socket.emit('chat:error', { message: 'You do not have permission to delete this message' });
                return;
            }
            await prisma_1.prisma.chatMessage.delete({
                where: { id: messageId }
            });
            io.to(roomId).emit('chat:message-deleted', {
                messageId,
                deletedBy: socket.user?.name,
                roomId
            });
            console.log(`Message ${messageId} deleted in room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error deleting message:', error);
            socket.emit('chat:error', { message: 'Failed to delete message' });
        }
    });
    socket.on('chat:edit-message', async (data) => {
        try {
            const { roomId, messageId, content } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                socket.emit('chat:error', { message: 'You are not authorized to edit messages in this room' });
                return;
            }
            if (!content.trim()) {
                socket.emit('chat:error', { message: 'Message content cannot be empty' });
                return;
            }
            if (content.length > 1000) {
                socket.emit('chat:error', { message: 'Message content is too long' });
                return;
            }
            const message = await prisma_1.prisma.chatMessage.findUnique({
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
            const updatedMessage = await prisma_1.prisma.chatMessage.update({
                where: { id: messageId },
                data: { content: content.trim() },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, avatar: true }
                    }
                }
            });
            io.to(roomId).emit('chat:message-edited', {
                message: updatedMessage,
                roomId
            });
            console.log(`Message ${messageId} edited in room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error editing message:', error);
            socket.emit('chat:error', { message: 'Failed to edit message' });
        }
    });
    socket.on('chat:typing-start', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            socket.to(roomId).emit('chat:user-typing', {
                userId,
                userName: socket.user?.name,
                roomId
            });
        }
        catch (error) {
            console.error('Error handling typing start:', error);
        }
    });
    socket.on('chat:typing-stop', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            socket.to(roomId).emit('chat:user-stopped-typing', {
                userId,
                userName: socket.user?.name,
                roomId
            });
        }
        catch (error) {
            console.error('Error handling typing stop:', error);
        }
    });
    socket.on('chat:react-message', async (data) => {
        try {
            const { roomId, messageId, reaction } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                socket.emit('chat:error', { message: 'You are not authorized to react to messages in this room' });
                return;
            }
            const validReactions = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡'];
            if (!validReactions.includes(reaction)) {
                socket.emit('chat:error', { message: 'Invalid reaction' });
                return;
            }
            const message = await prisma_1.prisma.chatMessage.findUnique({
                where: { id: messageId }
            });
            if (!message || message.roomId !== roomId) {
                socket.emit('chat:error', { message: 'Message not found' });
                return;
            }
            io.to(roomId).emit('chat:message-reaction', {
                messageId,
                reaction,
                userId,
                userName: socket.user?.name,
                roomId
            });
            console.log(`Reaction ${reaction} added to message ${messageId} in room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error handling message reaction:', error);
            socket.emit('chat:error', { message: 'Failed to react to message' });
        }
    });
};
exports.setupChatHandlers = setupChatHandlers;
//# sourceMappingURL=chatHandlers.js.map