"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupVideoHandlers = void 0;
const index_1 = require("./index");
const prisma_1 = require("../utils/prisma");
const setupVideoHandlers = (io, socket) => {
    socket.on('video:join', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                socket.emit('video:error', { message: 'You are not authorized to join video calls in this room' });
                return;
            }
            socket.join(`video:${roomId}`);
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true, avatar: true }
            });
            if (!user) {
                socket.emit('video:error', { message: 'User not found' });
                return;
            }
            socket.to(`video:${roomId}`).emit('video:user-joined', {
                userId: user.id,
                userName: user.name,
                userAvatar: user.avatar,
                roomId
            });
            console.log(`User ${user.name} joined video call in room ${roomId}`);
        }
        catch (error) {
            console.error('Error joining video call:', error);
            socket.emit('video:error', { message: 'Failed to join video call' });
        }
    });
    socket.on('video:leave', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            socket.leave(`video:${roomId}`);
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true }
            });
            if (user) {
                socket.to(`video:${roomId}`).emit('video:user-left', {
                    userId: user.id,
                    roomId
                });
                console.log(`User ${user.name} left video call in room ${roomId}`);
            }
        }
        catch (error) {
            console.error('Error leaving video call:', error);
        }
    });
    socket.on('video:call-started', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true }
            });
            if (user) {
                socket.to(roomId).emit('video:incoming-call', {
                    from: {
                        id: user.id,
                        name: user.name
                    },
                    roomId
                });
                console.log(`Video call started by ${user.name} in room ${roomId}`);
            }
        }
        catch (error) {
            console.error('Error starting video call:', error);
        }
    });
    socket.on('video:call-ended', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true }
            });
            if (user) {
                socket.to(roomId).emit('video:call-ended', {
                    by: {
                        id: user.id,
                        name: user.name
                    },
                    roomId
                });
                console.log(`Video call ended by ${user.name} in room ${roomId}`);
            }
        }
        catch (error) {
            console.error('Error ending video call:', error);
        }
    });
    socket.on('video:offer', async (data) => {
        try {
            const { roomId, to, offer } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            socket.to(to).emit('video:offer', {
                from: userId,
                offer,
                roomId
            });
            console.log(`WebRTC offer forwarded from ${userId} to ${to} in room ${roomId}`);
        }
        catch (error) {
            console.error('Error handling WebRTC offer:', error);
        }
    });
    socket.on('video:answer', async (data) => {
        try {
            const { roomId, to, answer } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            socket.to(to).emit('video:answer', {
                from: userId,
                answer,
                roomId
            });
            console.log(`WebRTC answer forwarded from ${userId} to ${to} in room ${roomId}`);
        }
        catch (error) {
            console.error('Error handling WebRTC answer:', error);
        }
    });
    socket.on('video:ice-candidate', async (data) => {
        try {
            const { roomId, to, candidate } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            socket.to(to).emit('video:ice-candidate', {
                from: userId,
                candidate,
                roomId
            });
            console.log(`ICE candidate forwarded from ${userId} to ${to} in room ${roomId}`);
        }
        catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    });
    socket.on('video:status-update', async (data) => {
        try {
            const { roomId, status, details } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true }
            });
            if (user) {
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
        }
        catch (error) {
            console.error('Error handling video status update:', error);
        }
    });
    socket.on('video:recording-request', async (data) => {
        try {
            const { roomId, action } = data;
            const userId = socket.userId;
            const isAuthorized = await (0, index_1.isUserInRoom)(userId, roomId);
            if (!isAuthorized) {
                socket.emit('video:error', { message: 'You are not authorized to control recording in this room' });
                return;
            }
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true }
            });
            if (user) {
                io.to(`video:${roomId}`).emit('video:recording-requested', {
                    userId: user.id,
                    userName: user.name,
                    action,
                    roomId,
                    timestamp: new Date()
                });
                console.log(`Video recording ${action} requested by ${user.name} in room ${roomId}`);
            }
        }
        catch (error) {
            console.error('Error handling recording request:', error);
            socket.emit('video:error', { message: 'Failed to handle recording request' });
        }
    });
};
exports.setupVideoHandlers = setupVideoHandlers;
//# sourceMappingURL=videoHandlers.js.map