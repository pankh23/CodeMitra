"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeExecutionQueue = exports.setupCodeHandlers = void 0;
const prisma_1 = require("../utils/prisma");
const bullmq_1 = require("bullmq");
const redis_1 = require("../utils/redis");
const codeExecutionQueue = new bullmq_1.Queue('code-execution', {
    connection: redis_1.redisClient,
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
exports.codeExecutionQueue = codeExecutionQueue;
const setupCodeHandlers = (io, socket) => {
    socket.on('code:update', async (data) => {
        try {
            const { roomId, code, language } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                socket.emit('code:error', { message: 'You are not authorized to edit code in this room' });
                return;
            }
            const updateData = { code };
            if (language) {
                updateData.language = language;
            }
            await prisma_1.prisma.room.update({
                where: { id: roomId },
                data: updateData
            });
            socket.to(roomId).emit('code:updated', {
                code,
                language,
                userId,
                userName: socket.user?.name,
                roomId
            });
            console.log(`Code updated in room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error updating code:', error);
            socket.emit('code:error', { message: 'Failed to update code' });
        }
    });
    socket.on('code:language-change', async (data) => {
        try {
            const { roomId, language } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                socket.emit('code:error', { message: 'You are not authorized to change language in this room' });
                return;
            }
            await prisma_1.prisma.room.update({
                where: { id: roomId },
                data: { language }
            });
            io.to(roomId).emit('code:language-changed', {
                language,
                userId,
                userName: socket.user?.name,
                roomId
            });
            console.log(`Language changed to ${language} in room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error changing language:', error);
            socket.emit('code:error', { message: 'Failed to change language' });
        }
    });
    socket.on('code:input-update', async (data) => {
        try {
            const { roomId, input } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                socket.emit('code:error', { message: 'You are not authorized to update input in this room' });
                return;
            }
            await prisma_1.prisma.room.update({
                where: { id: roomId },
                data: { input }
            });
            socket.to(roomId).emit('code:input-updated', {
                input,
                userId,
                userName: socket.user?.name,
                roomId
            });
            console.log(`Input updated in room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error updating input:', error);
            socket.emit('code:error', { message: 'Failed to update input' });
        }
    });
    socket.on('code:execute', async (data) => {
        try {
            const { roomId, code, language, input = '' } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                socket.emit('code:error', { message: 'You are not authorized to execute code in this room' });
                return;
            }
            const executionLog = await prisma_1.prisma.executionLog.create({
                data: {
                    code,
                    language,
                    input,
                    roomId,
                    userId,
                    status: 'pending'
                }
            });
            io.to(roomId).emit('code:execution-started', {
                executionId: executionLog.id,
                userId,
                userName: socket.user?.name,
                roomId
            });
            await codeExecutionQueue.add('execute-code', {
                executionId: executionLog.id,
                code,
                language,
                input,
                roomId,
                userId
            });
            console.log(`Code execution started in room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error executing code:', error);
            socket.emit('code:error', { message: 'Failed to execute code' });
        }
    });
    socket.on('code:cursor-update', async (data) => {
        try {
            const { roomId, position } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            socket.to(roomId).emit('code:cursor-updated', {
                position,
                userId,
                userName: socket.user?.name,
                roomId
            });
        }
        catch (error) {
            console.error('Error updating cursor position:', error);
        }
    });
    socket.on('code:selection-update', async (data) => {
        try {
            const { roomId, selection } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            socket.to(roomId).emit('code:selection-updated', {
                selection,
                userId,
                userName: socket.user?.name,
                roomId
            });
        }
        catch (error) {
            console.error('Error updating selection:', error);
        }
    });
    socket.on('code:format', async (data) => {
        try {
            const { roomId, code, language } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                socket.emit('code:error', { message: 'You are not authorized to format code in this room' });
                return;
            }
            await codeExecutionQueue.add('format-code', {
                code,
                language,
                roomId,
                userId
            });
            console.log(`Code formatting requested in room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error formatting code:', error);
            socket.emit('code:error', { message: 'Failed to format code' });
        }
    });
    socket.on('code:save', async (data) => {
        try {
            const { roomId, code, language } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                socket.emit('code:error', { message: 'You are not authorized to save code in this room' });
                return;
            }
            await prisma_1.prisma.room.update({
                where: { id: roomId },
                data: { code, language }
            });
            io.to(roomId).emit('code:saved', {
                userId,
                userName: socket.user?.name,
                roomId,
                timestamp: new Date().toISOString()
            });
            console.log(`Code saved in room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error saving code:', error);
            socket.emit('code:error', { message: 'Failed to save code' });
        }
    });
};
exports.setupCodeHandlers = setupCodeHandlers;
//# sourceMappingURL=codeHandlers.js.map