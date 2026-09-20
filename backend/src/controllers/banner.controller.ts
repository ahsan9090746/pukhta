import { Request, Response } from 'express';
import { Banner } from '../models/banner.model';
import { NotFoundError, BadRequestError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { parsePagination, parseSort, buildPaginationResponse } from '../utils/pagination';
import { getUploadedImagePath, deleteUploadedFile } from '../utils/upload';

// Coerce multipart/form-data string values into proper types
const parseBannerBody = (body: Record<string, any>): Record<string, any> => {
  const payload: Record<string, any> = {};
  if (body.title !== undefined) payload.title = body.title;
  if (body.subtitle !== undefined) payload.subtitle = body.subtitle;
  if (body.altText !== undefined) payload.altText = body.altText;
  if (body.link !== undefined) payload.link = body.link;
  if (body.position !== undefined && body.position !== '') payload.position = body.position;
  if (body.sortOrder !== undefined && body.sortOrder !== '') {
    payload.sortOrder = Number(body.sortOrder);
  }
  if (body.isActive !== undefined && body.isActive !== '') {
    payload.isActive = String(body.isActive) === 'true';
  }
  return payload;
};

export class BannerController {
  static create = catchAsync(async (req: Request, res: Response) => {
    const payload = parseBannerBody(req.body);
    const uploadedImage = getUploadedImagePath(req.file);

    if (uploadedImage) {
      payload.image = uploadedImage;
    } else if (!payload.image) {
      throw new BadRequestError('Banner image is required');
    }

    const banner = await Banner.create(payload);

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: { banner },
    });
  });

  static getAll = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as any);
    const sort = parseSort(req.query.sort as string);

    const filter: Record<string, any> = {};
    if (req.query.position) filter.position = req.query.position;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const [banners, total] = await Promise.all([
      Banner.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Banner.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: banners,
        pagination: buildPaginationResponse(total, page, limit),
      },
    });
  });

  static getActive = catchAsync(async (req: Request, res: Response) => {
    const position = req.query.position as string;
    const now = new Date();

    const filter: Record<string, any> = {
      isActive: true,
      $or: [
        { startDate: { $exists: false }, endDate: { $exists: false } },
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: { $exists: false } },
        { startDate: { $exists: false }, endDate: { $gte: now } },
      ],
    };

    if (position) filter.position = position;

    const banners = await Banner.find(filter)
      .sort({ sortOrder: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { banners },
    });
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      throw new NotFoundError('Banner');
    }

    res.status(200).json({
      success: true,
      data: { banner },
    });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const payload = parseBannerBody(req.body);
    const uploadedImage = getUploadedImagePath(req.file);

    // Explicit image removal request (no new file, remove old one)
    const removeRequested = String(req.body.removeImage || '') === 'true';
    if (removeRequested && !uploadedImage) {
      payload.image = '';
    } else if (uploadedImage) {
      payload.image = uploadedImage;
    }

    // Capture old image for deletion if replaced/removed
    const existing = await Banner.findById(req.params.id);
    if (!existing) {
      throw new NotFoundError('Banner');
    }
    const oldImage = existing.image;

    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );

    if (!banner) {
      throw new NotFoundError('Banner');
    }

    if (oldImage && (uploadedImage || removeRequested) && oldImage !== uploadedImage) {
      deleteUploadedFile(oldImage);
    }

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: { banner },
    });
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      throw new NotFoundError('Banner');
    }

    await Banner.findByIdAndDelete(req.params.id);

    // Delete image from uploads folder as well
    deleteUploadedFile(banner.image);

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
    });
  });
}
