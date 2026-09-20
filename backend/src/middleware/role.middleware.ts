import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/AppError';

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission for this action'));
    }

    next();
  };
};

export const requirePermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    if (req.user.role === 'super-admin') {
      return next();
    }

    const rolePermissions: Record<string, string[]> = {
      'super-admin': ['*'],
      admin: [
        'products.view', 'products.create', 'products.edit', 'products.delete',
        'orders.view', 'orders.manage',
        'customers.view', 'customers.manage',
        'categories.manage', 'coupons.manage', 'banners.manage',
        'reviews.manage', 'inventory.manage', 'analytics.view',
        'settings.manage', 'staff.manage',
      ],
      staff: [
        'products.view', 'orders.view', 'orders.manage',
        'customers.view', 'inventory.manage', 'reviews.manage',
      ],
      customer: [],
    };

    const userPermissions = rolePermissions[req.user.role] || [];

    if (userPermissions.includes('*')) {
      return next();
    }

    const hasPermission = permissions.every((perm) => userPermissions.includes(perm));

    if (!hasPermission) {
      return next(new ForbiddenError('You do not have the required permissions'));
    }

    next();
  };
};

export const requireOwnershipOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }

  const resourceUserId = req.params.userId || req.body.user;
  const isAdmin = ['super-admin', 'admin'].includes(req.user.role);
  const isOwner = req.user._id.toString() === resourceUserId;

  if (!isAdmin && !isOwner) {
    return next(new ForbiddenError('You can only access your own resources'));
  }

  next();
};
