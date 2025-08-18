"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserInRoom = exports.emitToRoom = exports.emitToUser = exports.getUserSocket = exports.setupSocketHandlers = void 0;
const jwt_1 = require("../utils/jwt");
const prisma_1 = require("../utils/prisma");
const redis_1 = require("../utils/redis");
const roomHandlers_1 = require("./roomHandlers");
const codeHandlers_1 = require("./codeHandlers");
const chatHandlers_1 = require("./chatHandlers");
const videoHandlers_1 = require("./videoHandlers");
const setupSocketHandlers = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }
            const decoded = (0, jwt_1.verifyToken)(token);
            if (!decoded) {
                return next(new Error('Authentication error: Invalid token'));
            }
            const user = await prisma_1.prisma.user.findUnique({
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
            socket.user = {
                ...user,
                avatar: user.avatar || undefined
            };
            next();
        }
        catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication error'));
        }
    });
    io.on('connection', (socket) => {
        console.log(`User ${socket.user?.name} connected (${socket.id})`);
        redis_1.redisClient.setex(`socket:${socket.userId}`, 3600, socket.id);
        (0, roomHandlers_1.setupRoomHandlers)(io, socket);
        (0, codeHandlers_1.setupCodeHandlers)(io, socket);
        (0, chatHandlers_1.setupChatHandlers)(io, socket);
        (0, videoHandlers_1.setupVideoHandlers)(io, socket);
        socket.on('disconnect', async () => {
            console.log(`User ${socket.user?.name} disconnected (${socket.id})`);
            await redis_1.redisClient.del(`socket:${socket.userId}`);
            const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
            for (const roomId of rooms) {
                socket.to(roomId).emit('room:user-left', {
                    userId: socket.userId,
                    userName: socket.user?.name,
                    roomId
                });
            }
        });
        socket.on('error', (error) => {
            console.error(`Socket error for user ${socket.user?.name}:`, error);
        });
    });
    io.engine.on('connection_error', (err) => {
        console.error('Socket.IO connection error:', err);
    });
};
exports.setupSocketHandlers = setupSocketHandlers;
const getUserSocket = async (userId) => {
    return await redis_1.redisClient.get(`socket:${userId}`);
};
exports.getUserSocket = getUserSocket;
const emitToUser = async (io, userId, event, data) => {
    const socketId = await (0, exports.getUserSocket)(userId);
    if (socketId) {
        io.to(socketId).emit(event, data);
    }
};
exports.emitToUser = emitToUser;
const emitToRoom = (io, roomId, event, data) => {
    io.to(roomId).emit(event, data);
};
exports.emitToRoom = emitToRoom;
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