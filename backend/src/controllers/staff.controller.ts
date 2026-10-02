import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { Role } from '../models/role.model';
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { parsePagination, parseSort, buildPaginationResponse } from '../utils/pagination';
import { NOT_DELETED, softDeleteFields } from '../utils/softDelete';
import bcrypt from 'bcryptjs';

/** Roles that may appear in the staff list (read). Mutations are stricter. */
const STAFF_LIST_ROLES = ['super-admin', 'admin', 'staff'];
/** Roles that can be assigned through staff management. */
const ASSIGNABLE_ROLES = ['admin', 'staff'];
/** Roles whose permissions may never be edited/deleted, even if isSystem was tampered with. */
const PROTECTED_ROLE_NAMES = ['super-admin', 'admin', 'staff', 'customer'];

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const ALLOWED_PERMISSIONS = [
  'products.view', 'products.create', 'products.edit', 'products.delete',
  'orders.view', 'orders.manage',
  'customers.view', 'customers.manage',
  'categories.manage', 'categories.view',
  'coupons.manage', 'banners.manage',
  'reviews.manage', 'reviews.view',
  'inventory.manage', 'inventory.view',
  'analytics.view', 'settings.manage', 'staff.manage', 'dashboard.view',
];

export class StaffController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as any);
    const sort = parseSort(req.query.sort as string);

    const filter: Record<string, any> = {
      role: { $in: STAFF_LIST_ROLES },
      ...NOT_DELETED,
    };

    if (req.query.role) {
      const requested = String(req.query.role);
      if (!STAFF_LIST_ROLES.includes(requested)) {
        throw new BadRequestError('Invalid role filter');
      }
      filter.role = requested;
    }
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      filter.$or = [
        { name: new RegExp(req.query.search as string, 'i') },
        { email: new RegExp(req.query.search as string, 'i') },
      ];
    }

    const [staff, total] = await Promise.all([
      User.find(filter)
        .select('-password -refreshToken')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: staff,
        pagination: buildPaginationResponse(total, page, limit),
      },
    });
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const { name, email, password, role, phone } = req.body;

    if (!name || String(name).trim().length < 2) {
      throw new BadRequestError('Name must be at least 2 characters');
    }
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      throw new BadRequestError('Please provide a valid email');
    }
    if (!password || String(password).length < 8) {
      throw new BadRequestError('Password must be at least 8 characters');
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
      ...NOT_DELETED,
    });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    if (!ASSIGNABLE_ROLES.includes(role)) {
      throw new BadRequestError('Invalid role for staff member');
    }

    // Only a super-admin may create another admin — otherwise an admin
    // could mint peers and escalate beyond their own authority.
    if (role === 'admin' && req.user!.role !== 'super-admin') {
      throw new ForbiddenError('Only a super-admin can create an admin account');
    }

    const staff = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      role,
      phone: phone ? String(phone).trim() : '',
      isVerified: true,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      data: {
        staff: {
          _id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          phone: staff.phone,
        },
      },
    });
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const staff = await User.findOne({
      _id: req.params.id,
      role: { $in: STAFF_LIST_ROLES },
      ...NOT_DELETED,
    }).select('-password -refreshToken');

    if (!staff) {
      throw new NotFoundError('Staff member');
    }

    res.status(200).json({
      success: true,
      data: { staff },
    });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const target = await User.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!target || !STAFF_LIST_ROLES.includes(target.role)) {
      throw new NotFoundError('Staff member');
    }
    if (target.role === 'super-admin') {
      throw new BadRequestError('Super admin accounts cannot be edited here');
    }

    const isSelf = target._id.toString() === req.user!._id.toString();
    const allowedFields = ['name', 'phone', 'role', 'isActive'];
    const updates: Record<string, any> = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (updates.name !== undefined) {
      if (!updates.name || String(updates.name).trim().length < 2) {
        throw new BadRequestError('Name must be at least 2 characters');
      }
      updates.name = String(updates.name).trim();
    }

    if (updates.phone !== undefined) {
      updates.phone = updates.phone ? String(updates.phone).trim() : '';
    }

    if (updates.isActive !== undefined) {
      updates.isActive = updates.isActive === true || updates.isActive === 'true';
      if (isSelf && !updates.isActive) {
        throw new BadRequestError('You cannot deactivate your own account');
      }
      // Only a super-admin may deactivate an admin.
      if (target.role === 'admin' && !updates.isActive && req.user!.role !== 'super-admin') {
        throw new ForbiddenError('Only a super-admin can deactivate an admin account');
      }
    }

    if (updates.role !== undefined) {
      if (!ASSIGNABLE_ROLES.includes(updates.role)) {
        throw new BadRequestError('Invalid role');
      }
      if (isSelf && updates.role !== target.role) {
        throw new BadRequestError('You cannot change your own role');
      }
      // Promoting to admin, or demoting an admin, is a super-admin action.
      if ((updates.role === 'admin' || target.role === 'admin') && req.user!.role !== 'super-admin') {
        throw new ForbiddenError('Only a super-admin can assign or remove the admin role');
      }
    }

    const staff = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: ['admin', 'staff'] }, ...NOT_DELETED },
      updates,
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!staff) {
      throw new NotFoundError('Staff member');
    }

    res.status(200).json({
      success: true,
      message: 'Staff member updated successfully',
      data: { staff },
    });
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const staff = await User.findOne({
      _id: req.params.id,
      ...NOT_DELETED,
    });

    if (!staff || !STAFF_LIST_ROLES.includes(staff.role)) {
      throw new NotFoundError('Staff member');
    }

    if (staff.role === 'super-admin') {
      throw new BadRequestError('Super admin accounts cannot be deleted');
    }

    if (staff._id.toString() === req.user!._id.toString()) {
      throw new BadRequestError('You cannot delete your own account');
    }

    // Only a super-admin may remove an admin account.
    if (staff.role === 'admin' && req.user!.role !== 'super-admin') {
      throw new ForbiddenError('Only a super-admin can delete an admin account');
    }

    // Soft delete: kept for audit/history, but the account can no longer log in.
    await User.findByIdAndUpdate(staff._id, {
      $set: softDeleteFields({ isActive: false, refreshToken: undefined }),
    });

    res.status(200).json({
      success: true,
      message: 'Staff member deleted successfully',
    });
  });

  static resetPassword = catchAsync(async (req: Request, res: Response) => {
    const { password } = req.body;

    if (!password || String(password).length < 8) {
      throw new BadRequestError('Password must be at least 8 characters');
    }

    const staff = await User.findOne({
      _id: req.params.id,
      ...NOT_DELETED,
    });

    if (!staff || !STAFF_LIST_ROLES.includes(staff.role)) {
      throw new NotFoundError('Staff member');
    }

    if (staff.role === 'super-admin') {
      throw new BadRequestError('Super admin passwords cannot be reset here');
    }

    // Only a super-admin may reset an admin's password.
    if (staff.role === 'admin' && req.user!.role !== 'super-admin') {
      throw new ForbiddenError("Only a super-admin can reset an admin's password");
    }

    staff.password = password;
    await staff.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  });

  static getRoles = catchAsync(async (req: Request, res: Response) => {
    const roles = await Role.find().sort({ name: 1 }).lean();

    res.status(200).json({
      success: true,
      data: { roles },
    });
  });

  static createRole = catchAsync(async (req: Request, res: Response) => {
    const { name, description, permissions } = req.body;

    if (!name || !String(name).trim()) {
      throw new BadRequestError('Role name is required');
    }
    if (!description || !String(description).trim()) {
      throw new BadRequestError('Role description is required');
    }
    if (PROTECTED_ROLE_NAMES.includes(String(name).trim().toLowerCase())) {
      throw new BadRequestError('This role name is reserved');
    }
    const perms = permissions || [];
    if (!Array.isArray(perms)) {
      throw new BadRequestError('Permissions must be an array');
    }
    const invalid = perms.filter((p: unknown) => !ALLOWED_PERMISSIONS.includes(String(p)));
    if (invalid.length > 0) {
      throw new BadRequestError(`Invalid permissions: ${invalid.join(', ')}`);
    }

    const existing = await Role.findOne({ name: String(name).trim().toLowerCase() });
    if (existing) {
      throw new ConflictError('Role already exists');
    }

    // isSystem can never be set through the API — custom roles are always removable.
    const role = await Role.create({
      name: String(name).trim().toLowerCase(),
      description: String(description).trim(),
      permissions: perms.map(String),
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: { role },
    });
  });

  static updateRole = catchAsync(async (req: Request, res: Response) => {
    const existing = await Role.findById(req.params.id);
    if (!existing) {
      throw new NotFoundError('Role');
    }
    if (existing.isSystem || PROTECTED_ROLE_NAMES.includes(existing.name)) {
      throw new BadRequestError('System roles cannot be edited');
    }

    const updates: Record<string, any> = {};
    if (req.body.description !== undefined) {
      if (!req.body.description || !String(req.body.description).trim()) {
        throw new BadRequestError('Role description is required');
      }
      updates.description = String(req.body.description).trim();
    }
    if (req.body.permissions !== undefined) {
      if (!Array.isArray(req.body.permissions)) {
        throw new BadRequestError('Permissions must be an array');
      }
      const invalid = req.body.permissions.filter(
        (p: unknown) => !ALLOWED_PERMISSIONS.includes(String(p))
      );
      if (invalid.length > 0) {
        throw new BadRequestError(`Invalid permissions: ${invalid.join(', ')}`);
      }
      updates.permissions = req.body.permissions.map(String);
    }
    // name / isSystem are intentionally not updatable.

    const role = await Role.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!role) {
      throw new NotFoundError('Role');
    }

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: { role },
    });
  });

  static deleteRole = catchAsync(async (req: Request, res: Response) => {
    const role = await Role.findById(req.params.id);
    if (!role) {
      throw new NotFoundError('Role');
    }

    if (role.isSystem || PROTECTED_ROLE_NAMES.includes(role.name)) {
      throw new BadRequestError('Cannot delete system role');
    }

    const usersWithRole = await User.countDocuments({ role: role.name });
    if (usersWithRole > 0) {
      throw new BadRequestError('Cannot delete role with assigned users');
    }

    await Role.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
    });
  });
}
