import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { Role } from '../models/role.model';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { parsePagination, parseSort, buildPaginationResponse } from '../utils/pagination';
import { NOT_DELETED, softDeleteFields } from '../utils/softDelete';
import bcrypt from 'bcryptjs';

export class StaffController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as any);
    const sort = parseSort(req.query.sort as string);

    const filter: Record<string, any> = {
      role: { $in: ['admin', 'staff'] },
      ...NOT_DELETED,
    };

    if (req.query.role) filter.role = req.query.role;
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

    const existingUser = await User.findOne({
      email: String(email || '').trim().toLowerCase(),
      ...NOT_DELETED,
    });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    if (!['admin', 'staff'].includes(role)) {
      throw new BadRequestError('Invalid role for staff member');
    }

    const staff = await User.create({
      name,
      email,
      password,
      role,
      phone,
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
      role: { $in: ['admin', 'staff'] },
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
    const allowedFields = ['name', 'phone', 'role', 'isActive'];
    const updates: Record<string, any> = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (updates.role && !['admin', 'staff'].includes(updates.role)) {
      throw new BadRequestError('Invalid role');
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
      role: { $in: ['admin', 'staff'] },
      ...NOT_DELETED,
    });

    if (!staff) {
      throw new NotFoundError('Staff member');
    }

    if (staff.role === 'super-admin') {
      throw new BadRequestError('Cannot delete super admin');
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

    const staff = await User.findOne({
      _id: req.params.id,
      role: { $in: ['admin', 'staff'] },
      ...NOT_DELETED,
    });

    if (!staff) {
      throw new NotFoundError('Staff member');
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
    const role = await Role.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: { role },
    });
  });

  static updateRole = catchAsync(async (req: Request, res: Response) => {
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      req.body,
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

    if (role.isSystem) {
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
