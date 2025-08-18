import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate, updateUserSchema, changePasswordSchema } from '../utils/validation';
import { hashPassword, comparePassword } from '../utils/password';

const userRoutes = express.Router();

// Get user profile
userRoutes.get('/profile',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
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
  })
);

// Update user profile
userRoutes.put('/profile',
  authenticate,
  validate(updateUserSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const updates = req.body;

    const updatedUser = await prisma.user.update({
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
  })
);

// Change password
userRoutes.put('/password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    return res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

// Get user's rooms
userRoutes.get('/rooms',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [ownedRooms, joinedRooms] = await Promise.all([
      prisma.room.findMany({
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
      prisma.room.findMany({
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
  })
);

// Get user's activity/statistics
userRoutes.get('/activity',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    try {
      const [
        totalRooms,
        joinedRoomsCount,
        messagesCount,
        executionLogsCount,
        recentActivity
      ] = await Promise.all([
        // Count rooms owned by user with error handling
        prisma.room.count({
          where: { ownerId: userId }
        }).catch((error) => {
          console.error('Error counting owned rooms:', error);
          return 0;
        }),
        
        // Count rooms user has joined (including owned) with error handling
        prisma.roomUser.count({
          where: { userId }
        }).catch((error) => {
          console.error('Error counting joined rooms:', error);
          return 0;
        }),
        
        // Count messages sent by user with error handling
        prisma.chatMessage.count({
          where: { userId }
        }).catch((error) => {
          console.error('Error counting messages:', error);
          return 0;
        }),
        
        // Count code executions by user with proper null handling
        prisma.executionLog.count({
          where: { 
            userId: { not: null, equals: userId }
          }
        }).catch((error) => {
          console.error('Error counting executions:', error);
          return 0;
        }),
        
        // Get recent activity with comprehensive error handling
        prisma.executionLog.findMany({
          where: { 
            userId: { not: null, equals: userId }
          },
          include: {
            room: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }).catch((error) => {
          console.error('Error fetching recent activity:', error);
          return [];
        })
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
    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user activity',
        code: 'DATABASE_ERROR'
      });
    }
  })
);

// Delete user account
userRoutes.delete('/account',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    // Delete user and all related data (cascading deletes are handled by Prisma)
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  })
);

export { userRoutes };
