"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../utils/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../utils/validation");
const password_1 = require("../utils/password");
const userRoutes = express_1.default.Router();
exports.userRoutes = userRoutes;
userRoutes.get('/profile', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            createdAt: true,
            updatedAt: true,
            _count: {
                select: {
                    ownedRooms: true,
                    roomUsers: true,
                    chatMessages: true
                }
            }
        }
    });
    if (!user) {
        return res.status(404).json({
            success: false,
            error: 'User not found'
        });
    }
    return res.json({
        success: true,
        data: user
    });
}));
userRoutes.put('/profile', auth_1.authenticate, (0, validation_1.validate)(validation_1.updateUserSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const updates = req.body;
    const updatedUser = await prisma_1.prisma.user.update({
        where: { id: userId },
        data: updates,
        select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            createdAt: true,
            updatedAt: true
        }
    });
    res.json({
        success: true,
        data: updatedUser
    });
}));
userRoutes.put('/password', auth_1.authenticate, (0, validation_1.validate)(validation_1.changePasswordSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId }
    });
    if (!user) {
        return res.status(404).json({
            success: false,
            error: 'User not found'
        });
    }
    const isCurrentPasswordValid = await (0, password_1.comparePassword)(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
        return res.status(401).json({
            success: false,
            error: 'Current password is incorrect'
        });
    }
    const hashedNewPassword = await (0, password_1.hashPassword)(newPassword);
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
    });
    return res.json({
        success: true,
        message: 'Password changed successfully'
    });
}));
userRoutes.get('/rooms', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);
    const [ownedRooms, joinedRooms] = await Promise.all([
        prisma_1.prisma.room.findMany({
            where: { ownerId: userId },
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
        prisma_1.prisma.room.findMany({
            where: {
                users: {
                    some: {
                        userId,
                        role: { not: 'owner' }
                    }
                }
            },
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
        })
    ]);
    res.json({
        success: true,
        data: {
            ownedRooms,
            joinedRooms,
            pagination: {
                page: Number(page),
                limit: Number(limit)
            }
        }
    });
}));
userRoutes.get('/activity', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    try {
        const [totalRooms, joinedRoomsCount, messagesCount, executionLogsCount, recentActivity] = await Promise.all([
            prisma_1.prisma.room.count({
                where: { ownerId: userId }
            }).catch(() => 0),
            prisma_1.prisma.roomUser.count({
                where: { userId }
            }).catch(() => 0),
            prisma_1.prisma.chatMessage.count({
                where: { userId }
            }).catch(() => 0),
            prisma_1.prisma.executionLog.count({
                where: {
                    userId: userId
                }
            }).catch(() => 0),
            prisma_1.prisma.executionLog.findMany({
                where: {
                    userId: userId
                },
                include: {
                    room: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            }).catch(() => [])
        ]);
        res.json({
            success: true,
            data: {
                totalRooms,
                joinedRooms: joinedRoomsCount,
                messagesCount,
                executionsCount: executionLogsCount,
                recentActivity: recentActivity.map(log => ({
                    id: log.id,
                    language: log.language,
                    status: log.status,
                    createdAt: log.createdAt,
                    room: log.room
                }))
            }
        });
    }
    catch (error) {
        console.error('Error fetching user activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user activity',
            code: 'DATABASE_ERROR'
        });
    }
}));
userRoutes.delete('/account', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    await prisma_1.prisma.user.delete({
        where: { id: userId }
    });
    res.json({
        success: true,
        message: 'Account deleted successfully'
    });
}));
//# sourceMappingURL=users.js.map