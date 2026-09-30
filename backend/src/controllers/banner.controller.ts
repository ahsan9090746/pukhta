import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Banner } from '../models/banner.model';
import { NotFoundError, BadRequestError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { parsePagination, parseSort, buildPaginationResponse } from '../utils/pagination';
import { deleteUploadedFile, renameUploadedEntityFiles } from '../utils/upload';
import { NOT_DELETED } from '../utils/softDelete';

/** Banners are hero-only — the admin form has no other placement. */
const BANNER_POSITION = 'hero' as const;
/** Suffix used for the mobile artwork file: "<bannerId>-mobile.<ext>" */
const MOBILE_IMAGE_SUFFIX = '-mobile';

type BannerFiles = { [field: string]: Express.Multer.File[] } | undefined;

/** multer .fields() returns an object keyed by field name */
const uploadedFile = (
  files: BannerFiles,
  field: 'image' | 'mobileImage'
): Express.Multer.File | undefined => files?.[field]?.[0];

// Coerce multipart/form-data string values into proper types
const parseBannerBody = (body: Record<string, any>): Record<string, any> => {
  const payload: Record<string, any> = {};
  if (body.title !== undefined) payload.title = body.title;
  if (body.subtitle !== undefined) payload.subtitle = body.subtitle;
  if (body.altText !== undefined) payload.altText = body.altText;
  if (body.link !== undefined) payload.link = body.link;
  if (body.linkType !== undefined && body.linkType !== '') payload.linkType = body.linkType;
  if (body.sortOrder !== undefined && body.sortOrder !== '') {
    payload.sortOrder = Number(body.sortOrder);
  }
  if (body.isActive !== undefined && body.isActive !== '') {
    payload.isActive = String(body.isActive) === 'true';
  }
  return payload;
};

/** Hero positions are 1-based whole numbers (1, 2, 3, ...). */
const parseSortOrder = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestError('Sort order must be a whole number starting from 1');
  }
  return parsed;
};

/** Rejects a position that another banner already occupies. */
const assertSortOrderAvailable = async (sortOrder: number, excludeId?: string) => {
  const clash = await Banner.findOne({
    sortOrder,
    ...NOT_DELETED,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();

  if (clash) {
    throw new BadRequestError(
      `Sort order ${sortOrder} is already used by "${clash.title}". Please choose another position.`
    );
  }
};

/** First free position (1, 2, 3, ...) so the slider order stays compact. */
const getNextSortOrder = async (): Promise<number> => {
  const banners = await Banner.find({ ...NOT_DELETED }).select('sortOrder').lean();
  const taken = new Set(banners.map((banner) => Number(banner.sortOrder)));
  let next = 1;
  while (taken.has(next)) next += 1;
  return next;
};

/** The unique index on sortOrder can still fire on a race — make it a clean 400. */
const rethrowDuplicateSortOrder = (error: unknown): never => {
  if ((error as any)?.code === 11000) {
    throw new BadRequestError('That sort order is already taken. Please choose another position.');
  }
  throw error;
};

export class BannerController {
  static create = catchAsync(async (req: Request, res: Response) => {
    const payload = parseBannerBody(req.body);
    const files = req.files as BannerFiles;

    // Hero only — never trust a client-supplied position
    payload.position = BANNER_POSITION;

    // Sort position: honour the requested slot (validated) or take the next free one
    const requestedSortOrder = parseSortOrder(payload.sortOrder);
    if (requestedSortOrder !== undefined) {
      await assertSortOrderAvailable(requestedSortOrder);
      payload.sortOrder = requestedSortOrder;
    } else {
      payload.sortOrder = await getNextSortOrder();
    }

    // Alt text always mirrors the title when left empty (SEO + accessibility)
    if (!String(payload.altText || '').trim()) {
      payload.altText = payload.title || '';
    }

    // The banner id is generated up-front so the uploaded images can be
    // renamed to "<bannerId>.<ext>" / "<bannerId>-mobile.<ext>".
    const bannerId = new mongoose.Types.ObjectId();
    const desktopFile = uploadedFile(files, 'image');
    const mobileFile = uploadedFile(files, 'mobileImage');

    const [desktopImage] = renameUploadedEntityFiles(
      desktopFile ? [desktopFile] : undefined,
      'banner',
      bannerId.toString()
    );
    const [mobileImage] = renameUploadedEntityFiles(
      mobileFile ? [mobileFile] : undefined,
      'banner',
      bannerId.toString(),
      MOBILE_IMAGE_SUFFIX
    );

    if (desktopImage) {
      payload.image = desktopImage;
    } else if (!payload.image) {
      throw new BadRequestError('Banner image is required');
    }
    if (mobileImage) payload.mobileImage = mobileImage;
    payload._id = bannerId;

    let banner: any;
    try {
      banner = await Banner.create(payload);
    } catch (error) {
      rethrowDuplicateSortOrder(error);
    }

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: { banner },
    });
  });

  static getAll = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as any);
    const sort = parseSort(req.query.sort as string);

    const filter: Record<string, any> = { ...NOT_DELETED };
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
      ...NOT_DELETED,
      $or: [
        { startDate: { $exists: false }, endDate: { $exists: false } },
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: { $exists: false } },
        { startDate: { $exists: false }, endDate: { $gte: now } },
      ],
    };

    if (position) filter.position = position;
    else filter.position = BANNER_POSITION;

    const banners = await Banner.find(filter)
      .sort({ sortOrder: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { banners },
    });
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const banner = await Banner.findOne({ _id: req.params.id, ...NOT_DELETED });

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
    const files = req.files as BannerFiles;

    const existing = await Banner.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!existing) {
      throw new NotFoundError('Banner');
    }

    // Hero only
    payload.position = BANNER_POSITION;

    // Sort position: only another banner's slot is rejected
    const requestedSortOrder = parseSortOrder(payload.sortOrder);
    if (requestedSortOrder !== undefined) {
      if (requestedSortOrder !== existing.sortOrder) {
        await assertSortOrderAvailable(requestedSortOrder, req.params.id);
      }
      payload.sortOrder = requestedSortOrder;
    }

    // Alt text mirrors the (new or existing) title when left empty
    if (!String(payload.altText || '').trim()) {
      payload.altText = payload.title || existing.title;
    }

    const desktopFile = uploadedFile(files, 'image');
    const mobileFile = uploadedFile(files, 'mobileImage');
    const removeMobileRequested = String(req.body.removeMobileImage || '') === 'true';
    const oldDesktopImage = existing.image;
    const oldMobileImage = existing.mobileImage;

    if (desktopFile) {
      // Free the old file first so the new upload can take the canonical
      // "<bannerId>.<ext>" name inside uploads/banner/.
      if (oldDesktopImage) deleteUploadedFile(oldDesktopImage);
      const [desktopImage] = renameUploadedEntityFiles(
        [desktopFile],
        'banner',
        req.params.id
      );
      payload.image = desktopImage;
    } else if (String(req.body.removeImage || '') === 'true') {
      // The desktop artwork is the only thing the storefront renders — it can
      // never be removed, only replaced.
      throw new BadRequestError('Banner image is required');
    }

    if (mobileFile) {
      if (oldMobileImage) deleteUploadedFile(oldMobileImage);
      const [mobileImage] = renameUploadedEntityFiles(
        [mobileFile],
        'banner',
        req.params.id,
        MOBILE_IMAGE_SUFFIX
      );
      payload.mobileImage = mobileImage;
    } else if (removeMobileRequested) {
      // Mobile artwork is optional — removing it falls back to the desktop image
      payload.mobileImage = '';
    }

    let banner: any;
    try {
      banner = await Banner.findOneAndUpdate(
        { _id: req.params.id, ...NOT_DELETED },
        payload,
        { new: true, runValidators: true }
      );
    } catch (error) {
      rethrowDuplicateSortOrder(error);
    }

    if (!banner) {
      throw new NotFoundError('Banner');
    }

    // Old mobile artwork deleted from uploads when explicitly removed (a
    // replaced image was already deleted before the new upload was stored)
    if (removeMobileRequested && oldMobileImage) {
      deleteUploadedFile(oldMobileImage);
    }

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: { banner },
    });
  });

  // Deleting a banner removes the document from MongoDB entirely — the
  // model hook then automatically deletes its image file from the uploads
  // folder (uploads/banner/). (?permanent=true behaves the same.)
  static delete = catchAsync(async (req: Request, res: Response) => {
    const deleted = await Banner.findOneAndDelete({ _id: req.params.id });
    if (!deleted) {
      throw new NotFoundError('Banner');
    }

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
    });
  });
}
