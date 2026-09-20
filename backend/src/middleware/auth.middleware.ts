import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser } from '../models/user.model';
import { UnauthorizedError, ForbiddenError } from '../utils/AppError';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Not authenticated. Please log in.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; role: string };
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        const refreshToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];
        if (!refreshToken) {
          throw new UnauthorizedError('Token expired. Please log in again.');
        }

        try {
          const refreshDecoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { id: string };
          const user = await User.findById(refreshDecoded.id);
          if (!user || !user.isActive) {
            throw new UnauthorizedError('User not found or inactive');
          }

          const newToken = user.generateAuthToken();
          res.cookie('accessToken', newToken, {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000,
            path: '/',
          });

          decoded = jwt.decode(newToken) as { id: string; email: string; role: string };
        } catch {
          throw new UnauthorizedError('Invalid refresh token. Please log in again.');
        }
      } else {
        throw new UnauthorizedError('Invalid token');
      }
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('User no longer exists');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account has been deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
      const user = await User.findById(decoded.id);
      if (user && user.isActive) {
        req.user = user;
      }
    } catch {
      // Token invalid, continue without user
    }

    next();
  } catch (error) {
    next();
  }
};
