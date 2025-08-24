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
            console.log(`Code update from user ${socket.user?.name} in room ${roomId}`);
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
                roomId,
                timestamp: Date.now()
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
                roomId,
                timestamp: Date.now()
            });
            console.log(`Language changed to ${language} in room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error changing language:', error);
            socket.emit('code:error', { message: 'Failed to change language' });
        }
    });
    socket.on('code:execute', async (data) => {
        try {
            const { roomId, code, language, input = '' } = data;
            const userId = socket.userId;
            console.log(`Code execution request from user ${socket.user?.name} in room ${roomId}`);
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                socket.emit('code:error', { message: 'You are not authorized to execute code in this room' });
                return;
            }
            io.to(roomId).emit('code:execution-started', {
                userId,
                userName: socket.user?.name,
                language,
                roomId,
                timestamp: Date.now()
            });
            const job = await codeExecutionQueue.add('execute', {
                executionId: `exec_${Date.now()}_${userId}`,
                language,
                code,
                input,
                roomId,
                userId,
                timestamp: Date.now()
            }, {
                removeOnComplete: true,
                removeOnFail: true
            });
            console.log(`Code execution job ${job.id} added to queue for room ${roomId}`);
            socket.emit('code:execution-queued', {
                jobId: job.id,
                message: 'Code execution queued successfully'
            });
        }
        catch (error) {
            console.error('Error queuing code execution:', error);
            socket.emit('code:error', { message: 'Failed to queue code execution' });
        }
    });
    socket.on('cursor:position', async (data) => {
        try {
            const { roomId, position, selection } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            socket.to(roomId).emit('cursor:position-updated', {
                userId,
                userName: socket.user?.name,
                position,
                selection,
                roomId,
                timestamp: Date.now()
            });
        }
        catch (error) {
            console.error('Error updating cursor position:', error);
        }
    });
    socket.on('code:sync-request', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            const room = await prisma_1.prisma.room.findUnique({
                where: { id: roomId },
                select: {
                    code: true,
                    language: true,
                    input: true,
                    output: true
                }
            });
            if (room) {
                socket.emit('code:sync-response', {
                    code: room.code,
                    language: room.language,
                    input: room.input,
                    output: room.output,
                    roomId,
                    timestamp: Date.now()
                });
            }
        }
        catch (error) {
            console.error('Error syncing code:', error);
        }
    });
    socket.on('code:auto-save', async (data) => {
        try {
            const { roomId, code, language } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
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
            console.log(`Auto-save completed for room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error auto-saving code:', error);
        }
    });
};
exports.setupCodeHandlers = setupCodeHandlers;
//# sourceMappingURL=codeHandlers.js.map