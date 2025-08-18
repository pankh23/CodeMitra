"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupVideoHandlers = void 0;
const setupVideoHandlers = (io, socket) => {
    socket.on('video:join-call', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                socket.emit('video:error', { message: 'You are not authorized to join video call in this room' });
                return;
            }
            socket.join(`video:${roomId}`);
            socket.to(`video:${roomId}`).emit('video:user-joined', {
                userId,
                userName: socket.user?.name,
                roomId
            });
            socket.emit('video:joined-call', {
                roomId,
                userId
            });
            console.log(`User ${socket.user?.name} joined video call in room ${roomId}`);
        }
        catch (error) {
            console.error('Error joining video call:', error);
            socket.emit('video:error', { message: 'Failed to join video call' });
        }
    });
    socket.on('video:leave-call', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            socket.leave(`video:${roomId}`);
            socket.to(`video:${roomId}`).emit('video:user-left', {
                userId,
                userName: socket.user?.name,
                roomId
            });
            socket.emit('video:left-call', {
                roomId,
                userId
            });
            console.log(`User ${socket.user?.name} left video call in room ${roomId}`);
        }
        catch (error) {
            console.error('Error leaving video call:', error);
            socket.emit('video:error', { message: 'Failed to leave video call' });
        }
    });
    socket.on('video:offer', async (data) => {
        try {
            const { roomId, targetUserId, offer } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                socket.emit('video:error', { message: 'You are not authorized to send video offers in this room' });
                return;
            }
            socket.to(`video:${roomId}`).emit('video:offer-received', {
                offer,
                fromUserId: userId,
                fromUserName: socket.user?.name,
                roomId
            });
            console.log(`Video offer sent from ${socket.user?.name} in room ${roomId}`);
        }
        catch (error) {
            console.error('Error sending video offer:', error);
            socket.emit('video:error', { message: 'Failed to send video offer' });
        }
    });
    socket.on('video:answer', async (data) => {
        try {
            const { roomId, targetUserId, answer } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                socket.emit('video:error', { message: 'You are not authorized to send video answers in this room' });
                return;
            }
            socket.to(`video:${roomId}`).emit('video:answer-received', {
                answer,
                fromUserId: userId,
                fromUserName: socket.user?.name,
                roomId
            });
            console.log(`Video answer sent from ${socket.user?.name} in room ${roomId}`);
        }
        catch (error) {
            console.error('Error sending video answer:', error);
            socket.emit('video:error', { message: 'Failed to send video answer' });
        }
    });
    socket.on('video:ice-candidate', async (data) => {
        try {
            const { roomId, targetUserId, candidate } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            socket.to(`video:${roomId}`).emit('video:ice-candidate-received', {
                candidate,
                fromUserId: userId,
                fromUserName: socket.user?.name,
                roomId
            });
        }
        catch (error) {
            console.error('Error sending ICE candidate:', error);
        }
    });
    socket.on('video:toggle-mute', async (data) => {
        try {
            const { roomId, isMuted } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            socket.to(`video:${roomId}`).emit('video:user-mute-changed', {
                userId,
                userName: socket.user?.name,
                isMuted,
                roomId
            });
            console.log(`User ${socket.user?.name} ${isMuted ? 'muted' : 'unmuted'} in room ${roomId}`);
        }
        catch (error) {
            console.error('Error toggling mute:', error);
        }
    });
    socket.on('video:toggle-video', async (data) => {
        try {
            const { roomId, isVideoOff } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            socket.to(`video:${roomId}`).emit('video:user-video-changed', {
                userId,
                userName: socket.user?.name,
                isVideoOff,
                roomId
            });
            console.log(`User ${socket.user?.name} turned video ${isVideoOff ? 'off' : 'on'} in room ${roomId}`);
        }
        catch (error) {
            console.error('Error toggling video:', error);
        }
    });
    socket.on('video:start-screen-share', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                socket.emit('video:error', { message: 'You are not authorized to share screen in this room' });
                return;
            }
            socket.to(`video:${roomId}`).emit('video:screen-share-started', {
                userId,
                userName: socket.user?.name,
                roomId
            });
            console.log(`User ${socket.user?.name} started screen sharing in room ${roomId}`);
        }
        catch (error) {
            console.error('Error starting screen share:', error);
            socket.emit('video:error', { message: 'Failed to start screen sharing' });
        }
    });
    socket.on('video:stop-screen-share', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            socket.to(`video:${roomId}`).emit('video:screen-share-stopped', {
                userId,
                userName: socket.user?.name,
                roomId
            });
            console.log(`User ${socket.user?.name} stopped screen sharing in room ${roomId}`);
        }
        catch (error) {
            console.error('Error stopping screen share:', error);
        }
    });
    socket.on('video:start-recording', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                socket.emit('video:error', { message: 'You are not authorized to record in this room' });
                return;
            }
            io.to(`video:${roomId}`).emit('video:recording-started', {
                userId,
                userName: socket.user?.name,
                roomId
            });
            console.log(`Recording started in room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error starting recording:', error);
            socket.emit('video:error', { message: 'Failed to start recording' });
        }
    });
    socket.on('video:stop-recording', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                return;
            }
            io.to(`video:${roomId}`).emit('video:recording-stopped', {
                userId,
                userName: socket.user?.name,
                roomId
            });
            console.log(`Recording stopped in room ${roomId} by ${socket.user?.name}`);
        }
        catch (error) {
            console.error('Error stopping recording:', error);
        }
    });
    socket.on('video:get-participants', async (data) => {
        try {
            const { roomId } = data;
            const userId = socket.userId;
            const isAuthorized = await isUserInRoom(userId, roomId);
            if (!isAuthorized) {
                socket.emit('video:error', { message: 'You are not authorized to view participants in this room' });
                return;
            }
            const sockets = await io.in(`video:${roomId}`).fetchSockets();
            const participants = sockets.map((s) => {
                const authenticatedSocket = s;
                return {
                    userId: authenticatedSocket.userId,
                    userName: authenticatedSocket.user?.name,
                    socketId: s.id
                };
            });
            socket.emit('video:participants', {
                participants,
                roomId
            });
        }
        catch (error) {
            console.error('Error getting video participants:', error);
            socket.emit('video:error', { message: 'Failed to get video participants' });
        }
    });
};
exports.setupVideoHandlers = setupVideoHandlers;
//# sourceMappingURL=videoHandlers.js.map