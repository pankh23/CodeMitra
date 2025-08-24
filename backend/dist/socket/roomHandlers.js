"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoomHandlers = void 0;
const index_1 = require("./index");
const prisma_1 = require("../utils/prisma");
const setupRoomHandlers = (io, socket) => {
    socket.on('room:join', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                socket.emit('room:error', { message: 'You are not authorized to join this room' });
                return;
            }
            socket.join(roomId);
            const room = await prisma_1.prisma.room.findUnique({
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
            socket.to(roomId).emit('room:user-joined', {
                user: socket.user,
                roomId,
                timestamp: new Date()
            });
            socket.emit('room:joined', {
                room,
                user: socket.user
            });
            socket.emit('room:code-sync', {
                code: room.code,
                language: room.language,
                input: room.input,
                output: room.output,
                roomId
            });
            const updatedUsers = room.users.map(ru => ({
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
                timestamp: new Date()
            });
            console.log(`User ${socket.user?.name} joined room ${roomId}`);
        }
        catch (error) {
            console.error('Error joining room:', error);
            socket.emit('room:error', { message: 'Failed to join room' });
        }
    });
    socket.on('room:leave', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            socket.leave(roomId);
            socket.to(roomId).emit('room:user-left', {
                userId,
                userName: socket.user?.name,
                roomId,
                timestamp: new Date()
            });
            socket.emit('room:left', { roomId });
            const room = await prisma_1.prisma.room.findUnique({
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
                const updatedUsers = room.users.map(ru => ({
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
                    timestamp: new Date()
                });
            }
            console.log(`User ${socket.user?.name} left room ${roomId}`);
        }
        catch (error) {
            console.error('Error leaving room:', error);
            socket.emit('room:error', { message: 'Failed to leave room' });
        }
    });
    socket.on('room:get-users', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                socket.emit('room:error', { message: 'You are not authorized to view this room' });
                return;
            }
            const room = await prisma_1.prisma.room.findUnique({
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
            const users = room.users.map(ru => ({
                id: ru.user.id,
                name: ru.user.name,
                email: ru.user.email,
                avatar: ru.user.avatar,
                role: ru.role,
                joinedAt: ru.joinedAt
            }));
            socket.emit('room:users', {
                users,
                roomId,
                timestamp: new Date()
            });
        }
        catch (error) {
            console.error('Error getting room users:', error);
            socket.emit('room:error', { message: 'Failed to get room users' });
        }
    });
    socket.on('room:get-info', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                socket.emit('room:error', { message: 'You are not authorized to view this room' });
                return;
            }
            const room = await prisma_1.prisma.room.findUnique({
                where: { id: roomId },
                include: {
                    owner: {
                        select: { id: true, name: true, avatar: true }
                    },
                    users: {
                        include: {
                            user: {
                                select: { id: true, name: true, avatar: true }
                            }
                        }
                    }
                }
            });
            if (!room) {
                socket.emit('room:error', { message: 'Room not found' });
                return;
            }
            socket.emit('room:info', {
                room: {
                    id: room.id,
                    name: room.name,
                    description: room.description,
                    isPublic: room.isPublic,
                    maxUsers: room.maxUsers,
                    language: room.language,
                    owner: room.owner,
                    userCount: room.users.length,
                    createdAt: room.createdAt,
                    updatedAt: room.updatedAt
                },
                roomId
            });
        }
        catch (error) {
            console.error('Error getting room info:', error);
            socket.emit('room:error', { message: 'Failed to get room info' });
        }
    });
    socket.on('room:update-settings', async (data) => {
        try {
            const { roomId, settings } = data;
            const userId = socket.userId;
            const room = await prisma_1.prisma.room.findUnique({
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
            const updatedRoom = await prisma_1.prisma.room.update({
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
            io.to(roomId).emit('room:settings-updated', {
                room: updatedRoom,
                roomId,
                timestamp: new Date()
            });
            console.log(`Room ${roomId} settings updated by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error updating room settings:', error);
            socket.emit('room:error', { message: 'Failed to update room settings' });
        }
    });
    socket.on('room:kick-user', async (data) => {
        try {
            const { roomId, targetUserId } = data;
            const userId = socket.userId;
            const room = await prisma_1.prisma.room.findUnique({
                where: { id: roomId },
                include: {
                    users: true
                }
            });
            if (!room) {
                socket.emit('room:error', { message: 'Room not found' });
                return;
            }
            const currentUser = room.users.find((u) => u.userId === userId);
            if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
                socket.emit('room:error', { message: 'You do not have permission to kick users' });
                return;
            }
            await prisma_1.prisma.roomUser.deleteMany({
                where: {
                    userId: targetUserId,
                    roomId
                }
            });
            io.to(roomId).emit('room:user-kicked', {
                userId: targetUserId,
                kickedBy: socket.user?.name,
                roomId,
                timestamp: new Date()
            });
            const updatedRoom = await prisma_1.prisma.room.findUnique({
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
            if (updatedRoom) {
                const updatedUsers = updatedRoom.users.map(ru => ({
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
                    timestamp: new Date()
                });
            }
            console.log(`User ${targetUserId} kicked from room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error kicking user:', error);
            socket.emit('room:error', { message: 'Failed to kick user' });
        }
    });
};
exports.setupRoomHandlers = setupRoomHandlers;
//# sourceMappingURL=roomHandlers.js.map