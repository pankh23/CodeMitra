"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomRoutes = void 0;
const express_1 = __importDefault(require("express"));
const prisma_1 = require("@/utils/prisma");
const errorHandler_1 = require("@/middleware/errorHandler");
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/utils/validation");
const password_1 = require("@/utils/password");
const roomRoutes = express_1.default.Router();
exports.roomRoutes = roomRoutes;
roomRoutes.get('/', auth_1.authenticate, (0, validation_1.validateQuery)(validation_1.getRoomsQuerySchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 10, search, language, isPublic } = req.query;
    const userId = req.user.id;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);
    const where = {
        OR: [
            { isPublic: true },
            { ownerId: userId },
            { users: { some: { userId } } }
        ]
    };
    if (search) {
        where.name = { contains: search, mode: 'insensitive' };
    }
    if (language) {
        where.language = language;
    }
    if (isPublic !== undefined) {
        where.isPublic = isPublic === 'true';
    }
    const [rooms, total] = await Promise.all([
        prisma_1.prisma.room.findMany({
            where,
            skip,
            take,
            include: {
                owner: {
                    select: { id: true, name: true, email: true, avatar: true }
                },
                users: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, avatar: true }
                        }
                    }
                },
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma_1.prisma.room.count({ where })
    ]);
    res.json({
        success: true,
        data: {
            rooms,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        }
    });
}));
roomRoutes.get('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const room = await prisma_1.prisma.room.findFirst({
        where: {
            id,
            OR: [
                { isPublic: true },
                { ownerId: userId },
                { users: { some: { userId } } }
            ]
        },
        include: {
            owner: {
                select: { id: true, name: true, email: true, avatar: true }
            },
            users: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true, avatar: true }
                    }
                }
            },
            chatMessages: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true, avatar: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            }
        }
    });
    if (!room) {
        return res.status(404).json({
            success: false,
            error: 'Room not found'
        });
    }
    res.json({
        success: true,
        data: room
    });
}));
roomRoutes.post('/', auth_1.authenticate, (0, validation_1.validate)(validation_1.createRoomSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { name, description, password, isPublic, maxUsers, language } = req.body;
    const userId = req.user.id;
    const roomData = {
        name: name.trim(),
        description: description?.trim() || '',
        isPublic: Boolean(isPublic),
        maxUsers: Number(maxUsers),
        language,
        ownerId: userId,
        users: {
            create: {
                userId,
                role: 'owner'
            }
        }
    };
    if (!isPublic) {
        if (!password || !password.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Password is required for private rooms',
                code: 'VALIDATION_ERROR'
            });
        }
        roomData.password = await (0, password_1.hashPassword)(password.trim());
    }
    const room = await prisma_1.prisma.room.create({
        data: roomData,
        include: {
            owner: {
                select: { id: true, name: true, email: true, avatar: true }
            },
            users: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true, avatar: true }
                    }
                }
            }
        }
    });
    return res.status(201).json({
        success: true,
        data: room
    });
}));
roomRoutes.post('/join', auth_1.authenticate, (0, validation_1.validate)(validation_1.joinRoomSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { roomId, password } = req.body;
    const userId = req.user.id;
    const room = await prisma_1.prisma.room.findUnique({
        where: { id: roomId },
        include: {
            users: true,
            _count: { select: { users: true } }
        }
    });
    if (!room) {
        return res.status(404).json({
            success: false,
            error: 'Room not found'
        });
    }
    const existingUser = room.users.find(user => user.userId === userId);
    if (existingUser) {
        return res.status(409).json({
            success: false,
            error: 'You are already in this room'
        });
    }
    if (room._count.users >= room.maxUsers) {
        return res.status(403).json({
            success: false,
            error: 'Room is full'
        });
    }
    const isPasswordValid = await (0, password_1.comparePassword)(password, room.password);
    if (!isPasswordValid) {
        return res.status(401).json({
            success: false,
            error: 'Invalid room password'
        });
    }
    await prisma_1.prisma.roomUser.create({
        data: {
            userId,
            roomId,
            role: 'member'
        }
    });
    const updatedRoom = await prisma_1.prisma.room.findUnique({
        where: { id: roomId },
        include: {
            owner: {
                select: { id: true, name: true, email: true, avatar: true }
            },
            users: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true, avatar: true }
                    }
                }
            }
        }
    });
    res.json({
        success: true,
        data: updatedRoom
    });
}));
roomRoutes.post('/:id/leave', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const room = await prisma_1.prisma.room.findUnique({
        where: { id },
        include: { users: true }
    });
    if (!room) {
        return res.status(404).json({
            success: false,
            error: 'Room not found'
        });
    }
    const userInRoom = room.users.find(user => user.userId === userId);
    if (!userInRoom) {
        return res.status(404).json({
            success: false,
            error: 'You are not in this room'
        });
    }
    await prisma_1.prisma.roomUser.delete({
        where: { id: userInRoom.id }
    });
    if (room.ownerId === userId) {
        await prisma_1.prisma.room.delete({
            where: { id }
        });
    }
    res.json({
        success: true,
        message: 'Left room successfully'
    });
}));
roomRoutes.put('/:id', auth_1.authenticate, (0, validation_1.validate)(validation_1.updateRoomSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;
    const room = await prisma_1.prisma.room.findUnique({
        where: { id }
    });
    if (!room) {
        return res.status(404).json({
            success: false,
            error: 'Room not found'
        });
    }
    if (room.ownerId !== userId) {
        return res.status(403).json({
            success: false,
            error: 'Only the room owner can update the room'
        });
    }
    if (updates.password) {
        updates.password = await (0, password_1.hashPassword)(updates.password);
    }
    const updatedRoom = await prisma_1.prisma.room.update({
        where: { id },
        data: updates,
        include: {
            owner: {
                select: { id: true, name: true, email: true, avatar: true }
            },
            users: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true, avatar: true }
                    }
                }
            }
        }
    });
    res.json({
        success: true,
        data: updatedRoom
    });
}));
roomRoutes.delete('/:id', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const room = await prisma_1.prisma.room.findUnique({
        where: { id }
    });
    if (!room) {
        return res.status(404).json({
            success: false,
            error: 'Room not found'
        });
    }
    if (room.ownerId !== userId) {
        return res.status(403).json({
            success: false,
            error: 'Only the room owner can delete the room'
        });
    }
    await prisma_1.prisma.room.delete({
        where: { id }
    });
    res.json({
        success: true,
        message: 'Room deleted successfully'
    });
}));
//# sourceMappingURL=rooms.js.map