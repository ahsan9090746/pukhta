import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { NotFoundError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { parsePagination, parseSort, buildPaginationResponse } from '../utils/pagination';

export class UserController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as any);
    const sort = parseSort(req.query.sort as string);

    const filter: Record<string, any> = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      filter.$or = [
        { name: new RegExp(req.query.search as string, 'i') },
        { email: new RegExp(req.query.search as string, 'i') },
      ];
    }

    const [users, total] = await Promise.all([
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
        data: users,
        pagination: buildPaginationResponse(total, page, limit),
      },
    });
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken');

    if (!user) {
      throw new NotFoundError('User');
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const allowedFields = ['name', 'email', 'role', 'phone', 'isActive', 'isVerified'];
    const updates: Record<string, any> = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!user) {
      throw new NotFoundError('User');
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user },
    });
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.role === 'super-admin') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete super admin',
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  });

  static getStats = catchAsync(async (req: Request, res: Response) => {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const verifiedUsers = await User.countDocuments({ isVerified: true });

    const roleStats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        verifiedUsers,
        newUsers,
        roleStats,
      },
    });
  });
}
