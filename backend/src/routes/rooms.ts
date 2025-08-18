import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { 
  validate, 
  validateQuery,
  createRoomSchema, 
  updateRoomSchema, 
  joinRoomSchema, 
  getRoomsQuerySchema 
} from '../utils/validation';
import { hashPassword, comparePassword } from '../utils/password';

const roomRoutes = express.Router();

// Get all rooms (public or user's rooms)
roomRoutes.get('/', 
  authenticate,
  validateQuery(getRoomsQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 10, search, language, isPublic } = req.query;
    const userId = req.user!.id;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {
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
      prisma.room.findMany({
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
      prisma.room.count({ where })
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
  })
);

// Get a specific room by ID
roomRoutes.get('/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const room = await prisma.room.findFirst({
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

    return res.json({
      success: true,
      data: room
    });
  })
);

// Create a new room
roomRoutes.post('/',
  authenticate,
  validate(createRoomSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, description, password, isPublic, maxUsers, language } = req.body;
    const userId = req.user!.id;

    // Prepare room data with conditional password
    const roomData: any = {
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

    // Handle password based on room type
    if (!isPublic) {
      // Private room - password is required
      if (!password || !password.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Password is required for private rooms',
          code: 'VALIDATION_ERROR'
        });
      }
      roomData.password = await hashPassword(password.trim());
    }
    // For public rooms, don't include password field at all

    const room = await prisma.room.create({
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
  })
);

// Join a room
roomRoutes.post('/join',
  authenticate,
  validate(joinRoomSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { roomId, password } = req.body;
    const userId = req.user!.id;

    const room = await prisma.room.findUnique({
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

    // Check if user is already in the room
    const existingUser = room.users.find((user: any) => user.userId === userId);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'You are already in this room'
      });
    }

    // Check room capacity
    if (room._count.users >= room.maxUsers) {
      return res.status(403).json({
        success: false,
        error: 'Room is full'
      });
    }

    // Check password for private rooms
    if (room.password && room.password.trim() !== '') {
      // Private room - validate password
      if (!password || password.trim() === '') {
        return res.status(401).json({
          success: false,
          error: 'Private room requires a password'
        });
      }
      
      const isPasswordValid = await comparePassword(password, room.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid room password'
        });
      }
    } else {
      // Public room - no password required
      if (password && password.trim() !== '') {
        return res.status(400).json({
          success: false,
          error: 'Public rooms do not require passwords'
        });
      }
    }

    // Add user to room
    await prisma.roomUser.create({
      data: {
        userId,
        roomId,
        role: 'member'
      }
    });

    // Get updated room data
    const updatedRoom = await prisma.room.findUnique({
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

    return res.json({
      success: true,
      data: updatedRoom
    });
  })
);

// Leave a room
roomRoutes.post('/:id/leave',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const room = await prisma.room.findUnique({
      where: { id },
      include: { users: true }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    const userInRoom = room.users.find((user: any) => user.userId === userId);
    if (!userInRoom) {
      return res.status(404).json({
        success: false,
        error: 'You are not in this room'
      });
    }

    // Remove user from room
    await prisma.roomUser.delete({
      where: { id: userInRoom.id }
    });

    // If the owner leaves, delete the room
    if (room.ownerId === userId) {
      await prisma.room.delete({
        where: { id }
      });
    }

    return res.json({
      success: true,
      message: 'Left room successfully'
    });
  })
);

// Update a room (owner only)
roomRoutes.put('/:id',
  authenticate,
  validate(updateRoomSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const updates = req.body;

    const room = await prisma.room.findUnique({
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

    // Hash password if provided
    if (updates.password) {
      updates.password = await hashPassword(updates.password);
    }

    const updatedRoom = await prisma.room.update({
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

    return res.json({
      success: true,
      data: updatedRoom
    });
  })
);

// Delete a room (owner only)
roomRoutes.delete('/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const room = await prisma.room.findUnique({
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

    await prisma.room.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  })
);

export { roomRoutes };
