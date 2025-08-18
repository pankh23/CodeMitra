import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JwtPayload } from '../utils/jwt';
import { prisma } from '../utils/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
  token?: string;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token is required',
      });
      return;
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    req.user = {
      ...user,
      avatar: user.avatar || undefined
    };
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const decoded = verifyToken(token);
      
      if (decoded) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        });

        if (user) {
          req.user = {
            ...user,
            avatar: user.avatar || undefined
          };
          req.token = token;
        }
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};

export const requireRole = (roles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // For room-specific roles, we need to check the room context
      // This is a placeholder - actual implementation would check room membership
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
};
