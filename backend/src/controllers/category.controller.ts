import { Request, Response } from 'express';
import { Category } from '../models/category.model';
import { NotFoundError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { parsePagination, parseSort, buildPaginationResponse } from '../utils/pagination';
import { getUploadedImagePath, deleteUploadedFile } from '../utils/upload';

// Coerce multipart/form-data string values into proper types
const parseCategoryBody = (body: Record<string, any>): Record<string, any> => {
  const payload: Record<string, any> = {};
  if (body.name !== undefined) payload.name = body.name;
  if (body.slug !== undefined && body.slug !== '') payload.slug = body.slug;
  if (body.description !== undefined) payload.description = body.description;
  if (body.altText !== undefined) payload.altText = body.altText;
  if (body.parent !== undefined && body.parent !== '' && body.parent !== 'null') {
    payload.parent = body.parent;
  } else {
    payload.parent = null;
  }
  if (body.level !== undefined && body.level !== '') {
    payload.level = Number(body.level);
  }
  if (body.sortOrder !== undefined && body.sortOrder !== '') {
    payload.sortOrder = Number(body.sortOrder);
  }
  if (body.isActive !== undefined) {
    payload.isActive = String(body.isActive) === 'true';
  }
  return payload;
};

export class CategoryController {
  static create = catchAsync(async (req: Request, res: Response) => {
    const payload = parseCategoryBody(req.body);
    const uploadedImage = getUploadedImagePath(req.file);
    if (uploadedImage) payload.image = uploadedImage;

    // Auto-calculate ancestors and path from parent
    if (payload.parent) {
      const parentCategory = await Category.findById(payload.parent);
      if (parentCategory) {
        payload.ancestors = [...(parentCategory.ancestors || []), parentCategory._id];
        payload.level = (parentCategory.level || 0) + 1;
        payload.path = parentCategory.path
          ? `${parentCategory.path}/${parentCategory.slug}`
          : parentCategory.slug;
      }
    } else {
      payload.ancestors = [];
      payload.level = 0;
      payload.path = '';
    }

    const category = await Category.create(payload);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category },
    });
  });

  static getAll = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as any);
    const sort = parseSort(req.query.sort as string);

    const filter: Record<string, any> = {};
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    if (req.query.parent) {
      filter.parent = req.query.parent;
    }

    const [categories, total] = await Promise.all([
      Category.find(filter)
        .populate('parent', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: categories,
        pagination: buildPaginationResponse(total, page, limit),
      },
    });
  });

  static getTree = catchAsync(async (req: Request, res: Response) => {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const buildTree = (parentId: string | null = null): any[] => {
      return categories
        .filter((cat) => (cat.parent?.toString() || null) === parentId)
        .map((cat) => ({
          ...cat,
          children: buildTree(cat._id.toString()),
        }));
    };

    const tree = buildTree();

    res.status(200).json({
      success: true,
      data: { categories: tree },
    });
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    const category = isObjectId
      ? await Category.findById(req.params.id).populate('parent', 'name slug')
      : await Category.findOne({ slug: req.params.id }).populate('parent', 'name slug');

    if (!category) {
      throw new NotFoundError('Category');
    }

    res.status(200).json({
      success: true,
      data: { category },
    });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const payload = parseCategoryBody(req.body);
    const uploadedImage = getUploadedImagePath(req.file);

    // Explicit image removal request from admin (no new file, remove old one)
    const removeRequested = String(req.body.removeImage || '') === 'true';
    if (removeRequested && !uploadedImage) {
      payload.image = '';
    } else if (uploadedImage) {
      payload.image = uploadedImage;
    }

    // Capture old image to delete if replaced/removed
    const existing = await Category.findById(req.params.id);
    if (!existing) {
      throw new NotFoundError('Category');
    }
    const oldImage = existing.image;

    // Recalculate ancestors, path, level when parent changes
    if ('parent' in payload) {
      if (payload.parent) {
        const parentCategory = await Category.findById(payload.parent);
        if (parentCategory) {
          payload.ancestors = [...(parentCategory.ancestors || []), parentCategory._id];
          payload.level = (parentCategory.level || 0) + 1;
          payload.path = parentCategory.path
            ? `${parentCategory.path}/${parentCategory.slug}`
            : parentCategory.slug;
        }
      } else {
        payload.ancestors = [];
        payload.level = 0;
        payload.path = '';
      }
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    ).populate('parent', 'name slug');

    if (!category) {
      throw new NotFoundError('Category');
    }

    // Old image deleted from uploads when: replaced by new upload OR explicitly removed
    if (oldImage && (uploadedImage || removeRequested) && oldImage !== uploadedImage) {
      deleteUploadedFile(oldImage);
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category },
    });
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw new NotFoundError('Category');
    }

    const children = await Category.countDocuments({ parent: category._id });
    if (children > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with subcategories',
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    // Delete image from uploads folder as well
    deleteUploadedFile(category.image);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  });
}
