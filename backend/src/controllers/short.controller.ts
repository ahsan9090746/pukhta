import { Request, Response } from 'express';
import { Short } from '../models/short.model';
import { deleteUploadedFile, getUploadedVideoPath } from '../utils/upload';
import { NotFoundError, BadRequestError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { NOT_DELETED, softDeleteFields } from '../utils/softDelete';

export const MAX_SHORTS = 20;

export class ShortController {
  // Public: list shorts (used by homepage section)
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const shorts = await Short.find({ ...NOT_DELETED })
      .populate('category', 'name slug')
      .populate('product', 'name slug images')
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { shorts },
    });
  });

  // Admin: create short (video upload required, max 5)
  static create = catchAsync(async (req: Request, res: Response) => {
    const { categoryId, productId } = req.body;

    // Only live shorts count towards the limit — soft-deleted ones don't.
    const count = await Short.countDocuments({ ...NOT_DELETED });
    if (count >= MAX_SHORTS) {
      // Clean up the just-uploaded file since we are rejecting the request
      const uploaded = getUploadedVideoPath(req.file);
      if (uploaded) deleteUploadedFile(uploaded);
      throw new BadRequestError(`Maximum ${MAX_SHORTS} shorts allowed. Please delete one first.`);
    }

    const video = getUploadedVideoPath(req.file);
    if (!video) {
      throw new BadRequestError('Video file is required');
    }

    const short = await Short.create({
      video,
      category: categoryId || null,
      product: productId || null,
      sortOrder: count,
    });

    res.status(201).json({
      success: true,
      message: 'Short created successfully',
      data: { short },
    });
  });

  // Admin: soft delete short (the video file is kept on disk for auditing)
  static delete = catchAsync(async (req: Request, res: Response) => {
    const short = await Short.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { $set: softDeleteFields() },
      { new: true }
    );

    if (!short) {
      throw new NotFoundError('Short');
    }

    res.status(200).json({
      success: true,
      message: 'Short deleted successfully',
    });
  });
}