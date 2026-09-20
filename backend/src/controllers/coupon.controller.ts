import { Request, Response } from 'express';
import { Coupon } from '../models/coupon.model';
import { NotFoundError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { parsePagination, parseSort, buildPaginationResponse } from '../utils/pagination';

export class CouponController {
  static create = catchAsync(async (req: Request, res: Response) => {
    const coupon = await Coupon.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: { coupon },
    });
  });

  static getAll = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as any);
    const sort = parseSort(req.query.sort as string);

    const filter: Record<string, any> = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) filter.code = new RegExp(req.query.search as string, 'i');

    const [coupons, total] = await Promise.all([
      Coupon.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Coupon.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: coupons,
        pagination: buildPaginationResponse(total, page, limit),
      },
    });
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      throw new NotFoundError('Coupon');
    }

    res.status(200).json({
      success: true,
      data: { coupon },
    });
  });

  static validate = catchAsync(async (req: Request, res: Response) => {
    const { code, subtotal } = req.body;

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Invalid coupon code',
      });
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'Coupon has expired',
      });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        error: 'Coupon usage limit reached',
      });
    }

    if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      return res.status(400).json({
        success: false,
        error: `Minimum purchase of $${coupon.minPurchase} required`,
      });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === 'fixed') {
      discount = Math.min(coupon.discountValue, subtotal);
    }

    res.status(200).json({
      success: true,
      data: {
        coupon: {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
        },
        discount: Math.round(discount * 100) / 100,
      },
    });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      throw new NotFoundError('Coupon');
    }

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: { coupon },
    });
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      throw new NotFoundError('Coupon');
    }

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  });
}
