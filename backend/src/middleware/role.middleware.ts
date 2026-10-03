import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/AppError';
import { Role } from '../models/role.model';

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

/**
 * Built-in permission matrix. These four roles are ALWAYS resolved from here
 * so the panel keeps working even when the Role collection is empty or a
 * manual seed stored different values.
 */
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

const BUILT_IN_ROLES = new Set(Object.keys(rolePermissions));

/** Short-lived cache for custom (DB-defined) role permissions. */
let customRoleCache: { at: number; map: Record<string, string[]> } = { at: 0, map: {} };
const CUSTOM_ROLE_CACHE_TTL_MS = 60 * 1000;

/**
 * Resolves the permission list for a role. Built-ins come from the matrix
 * above; any other role name (e.g. `manager`) is read from the Role
 * collection so custom roles created in Staff Management actually work.
 * Unknown roles resolve to no permissions.
 */
export const resolvePermissions = async (role: string): Promise<string[]> => {
  if (BUILT_IN_ROLES.has(role)) {
    return rolePermissions[role] || [];
  }
  if (Date.now() - customRoleCache.at > CUSTOM_ROLE_CACHE_TTL_MS) {
    customRoleCache = { at: Date.now(), map: {} };
  }
  if (customRoleCache.map[role]) return customRoleCache.map[role];
  const doc = await Role.findOne({ name: role }).select('permissions').lean();
  const perms = (doc?.permissions || []) as string[];
  customRoleCache.map[role] = perms;
  return perms;
};

/** Test-only helper to reset the custom-role permission cache. */
export const clearPermissionCache = (): void => {
  customRoleCache = { at: 0, map: {} };
};

export const requirePermission = (...permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    if (req.user.role === 'super-admin') {
      return next();
    }

    let userPermissions: string[];
    try {
      userPermissions = await resolvePermissions(req.user.role);
    } catch {
      // DB hiccup — fall back to the built-in map, never lock everyone out.
      userPermissions = rolePermissions[req.user.role] || [];
    }

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
