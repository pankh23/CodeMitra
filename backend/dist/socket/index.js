"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserInRoom = exports.setupSocketHandlers = void 0;
const roomHandlers_1 = require("./roomHandlers");
const codeHandlers_1 = require("./codeHandlers");
const chatHandlers_1 = require("./chatHandlers");
const videoHandlers_1 = require("./videoHandlers");
const prisma_1 = require("../utils/prisma");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const setupSocketHandlers = (io) => {
    const roomUsers = new Map();
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const user = await prisma_1.prisma.user.findUnique({
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
        }
        catch (error) {
            next(new Error('Authentication failed'));
        }
    });
    io.on('connection', (socket) => {
        console.log(`User ${socket.user?.name} connected: ${socket.id}`);
        socket.onAny((eventName, ...args) => {
            console.log(`🔍 DEBUG: Socket.IO level - Received event '${eventName}' on socket ${socket.id} with args:`, args);
        });
        socket.on('test:simple', (data) => {
            console.log(`🔍 DEBUG: Received test:simple event on socket ${socket.id} with data:`, data);
            socket.emit('test:simple:response', { received: true, data });
        });
        console.log('🔧 Setting up handlers for socket:', socket.id);
        (0, roomHandlers_1.setupRoomHandlers)(io, socket, exports.isUserInRoom);
        console.log('🔧 Room handlers setup complete');
        (0, codeHandlers_1.setupCodeHandlers)(io, socket, exports.isUserInRoom);
        console.log('🔧 Code handlers setup complete');
        (0, chatHandlers_1.setupChatHandlers)(io, socket, exports.isUserInRoom);
        console.log('🔧 Chat handlers setup complete');
        (0, videoHandlers_1.setupVideoHandlers)(io, socket, exports.isUserInRoom);
        console.log('🔧 Video handlers setup complete');
        socket.on('disconnect', async () => {
            console.log(`User ${socket.user?.name} disconnected: ${socket.id}`);
            for (const [roomId, users] of roomUsers.entries()) {
                if (users.has(socket.userId)) {
                    users.delete(socket.userId);
                    socket.to(roomId).emit('room:user-left', {
                        userId: socket.userId,
                        userName: socket.user?.name,
                        roomId,
                        timestamp: new Date().toISOString(),
                        reason: 'disconnected'
                    });
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
        socket.on('room:leave', async (data) => {
            const { roomId } = data;
            const users = roomUsers.get(roomId);
            if (users && users.has(socket.userId)) {
                users.delete(socket.userId);
                socket.leave(roomId);
                socket.to(roomId).emit('room:user-left', {
                    userId: socket.userId,
                    userName: socket.user?.name,
                    roomId,
                    timestamp: new Date().toISOString(),
                    reason: 'left'
                });
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
exports.setupSocketHandlers = setupSocketHandlers;
const isUserInRoom = async (userId, roomId) => {
    const roomUser = await prisma_1.prisma.roomUser.findFirst({
        where: {
            userId,
            roomId
        }
    });
    return !!roomUser;
};
exports.isUserInRoom = isUserInRoom;
//# sourceMappingURL=index.js.map