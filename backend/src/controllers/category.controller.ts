import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Category } from '../models/category.model';
import { Product } from '../models/product.model';
import { BadRequestError, NotFoundError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { parsePagination, parseSort, buildPaginationResponse } from '../utils/pagination';
import { deleteUploadedFile, renameUploadedEntityFiles } from '../utils/upload';
import { sanitizeRichText } from '../utils/sanitize';
import { generateSlug } from '../utils/slugify';
import { NOT_DELETED, softDeleteFields } from '../utils/softDelete';


const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Attach per-category product counts. Each category is counted together with
 * all of its descendants, so a parent shows every product below it.
 *
 * `productCount` covers all non-deleted products (used by the admin table),
 * `activeProductCount` only the ones the storefront actually lists.
 */
const withProductCounts = async <T extends { _id: unknown }>(categories: T[]) => {
  // Build a map of category -> its descendants (including self) with exactly
  // TWO queries no matter how many categories are listed (the old loop fired
  // one query per category, which made /categories take seconds on Atlas).
  // A category is a descendant of X when its `ancestors` chain contains X —
  // the same rule the per-category helper used, just evaluated in memory.
  const ids = categories.map((cat) => String(cat._id));
  const [allCats, products] = await Promise.all([
    Category.find({ ...NOT_DELETED }, { _id: 1, ancestors: 1 }).lean(),
    // Read every product's category assignments once. Counting in JS keeps the
    // numbers EXACT — a product that belongs to several categories is still one
    // product, while adding up per-category counts across the tree would count it
    // once per category (parents would over-report).
    Product.find({ ...NOT_DELETED }, { categories: 1, isActive: 1 }).lean(),
  ]);

  const categoryDescendantsMap = new Map<string, Set<string>>(
    ids.map((id) => [id, new Set([id])])
  );
  for (const cat of allCats as Array<{ _id: unknown; ancestors?: unknown }>) {
    const childId = String(cat._id);
    const ancestors = Array.isArray(cat.ancestors) ? cat.ancestors : [];
    for (const ancestor of ancestors) {
      const key = String(ancestor);
      const scope = categoryDescendantsMap.get(key);
      if (scope) scope.add(childId);
    }
  }

  const assignments = products.map((product: any) => ({
    categoryIds: (product.categories || []).map((id: any) => String(id)),
    isActive: product.isActive === true,
  }));

  return categories.map((c: any) => {
    const id = String(c._id);
    const scope = new Set(categoryDescendantsMap.get(id) || [id]);

    let productCount = 0;
    let activeProductCount = 0;

    for (const row of assignments) {
      if (!row.categoryIds.some((catId: string) => scope.has(catId))) continue;
      productCount += 1;
      if (row.isActive) activeProductCount += 1;
    }

    return {
      ...c,
      productCount,
      activeProductCount,
    };
  });
};

// Coerce multipart/form-data string values into proper types
const parseCategoryBody = (body: Record<string, any>): Record<string, any> => {
  const payload: Record<string, any> = {};
  if (body.name !== undefined) payload.name = body.name;
  if (body.slug !== undefined && body.slug !== '') payload.slug = body.slug;
  if (body.description !== undefined) payload.description = sanitizeRichText(body.description);
  if (body.altText !== undefined) payload.altText = body.altText;
  if (body.metaTitle !== undefined) payload.metaTitle = body.metaTitle;
  if (body.metaDescription !== undefined) payload.metaDescription = body.metaDescription;
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

    // The category id is generated up-front so the uploaded image can be
    // renamed to "<categoryId>.<ext>" inside uploads/category/.
    const categoryId = new mongoose.Types.ObjectId();
    const uploadedImages = renameUploadedEntityFiles(
      req.file ? [req.file] : undefined,
      'category',
      categoryId.toString()
    );
    if (uploadedImages.length > 0) payload.image = uploadedImages[0];
    payload._id = categoryId;

    // Auto-generate slug from the name when the client doesn't send one
    if (!payload.slug && payload.name) {
      payload.slug = generateSlug(String(payload.name));
    }

    // Auto-calculate ancestors and path from parent
    if (payload.parent) {
      const parentCategory = await Category.findOne({ _id: payload.parent, ...NOT_DELETED });
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

    const filter: Record<string, any> = { ...NOT_DELETED };
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    if (req.query.parent) {
      filter.parent = req.query.parent;
    }
    if (req.query.showOnHome !== undefined) {
      filter.showOnHome = req.query.showOnHome === 'true';
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
        data: await withProductCounts(categories),
        pagination: buildPaginationResponse(total, page, limit),
      },
    });
  });

  /**
   * Categories for the storefront home page "Shop by Category" section.
   * EVERY active category that has an image is returned — the section is a
   * visual image grid, so categories without images are never shown.
   */
  static getHomeCategories = catchAsync(async (req: Request, res: Response) => {
    const categories = await Category.find({
      isActive: true,
      image: { $exists: true, $ne: '' },
      ...NOT_DELETED,
    })
      .sort({ sortOrder: 1, name: 1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      data: { categories },
    });
  });

  /**
   * Bulk-select which categories appear on the home page.
   * Body: { categoryIds: string[] } — two updateMany calls, no per-doc saves.
   */
  static updateHomeSelection = catchAsync(async (req: Request, res: Response) => {
    const ids: string[] = Array.isArray(req.body?.categoryIds)
      ? req.body.categoryIds
      : [];

    if (ids.some((id) => !OBJECT_ID_REGEX.test(String(id)))) {
      throw new BadRequestError('Invalid category id in selection');
    }

    await Promise.all([
      Category.updateMany(
        { _id: { $in: ids }, ...NOT_DELETED },
        { $set: { showOnHome: true } }
      ),
      Category.updateMany(
        { _id: { $nin: ids }, ...NOT_DELETED },
        { $set: { showOnHome: false } }
      ),
    ]);

    const selected = await Category.find({ showOnHome: true, ...NOT_DELETED })
      .sort({ sortOrder: 1, name: 1 })
      .select('name slug')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Home page categories updated',
      data: { categories: selected },
    });
  });

  static getTree = catchAsync(async (req: Request, res: Response) => {
    const categories = await Category.find({ isActive: true, ...NOT_DELETED })
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
      ? await Category.findOne({ _id: req.params.id, ...NOT_DELETED }).populate('parent', 'name slug')
      : await Category.findOne({ slug: req.params.id, ...NOT_DELETED }).populate('parent', 'name slug');

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

    // Auto-generate slug when the name changed and no slug was provided
    if (!payload.slug && payload.name) {
      payload.slug = generateSlug(String(payload.name));
    }

    // Capture old image to delete if replaced/removed
    const existing = await Category.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!existing) {
      throw new NotFoundError('Category');
    }
    const oldImage = existing.image;

    // Explicit image removal request from admin (no new file, remove old one)
    const removeRequested = String(req.body.removeImage || '') === 'true';
    if (req.file) {
      // Free the old file first so the new upload can take the canonical
      // "<categoryId>.<ext>" name inside uploads/category/.
      if (oldImage) {
        deleteUploadedFile(oldImage);
      }
      const uploadedImages = renameUploadedEntityFiles([req.file], 'category', req.params.id);
      payload.image = uploadedImages[0];
    } else if (removeRequested) {
      payload.image = '';
    }

    // Recalculate ancestors, path, level when parent changes
    if ('parent' in payload) {
      if (payload.parent) {
        const parentCategory = await Category.findOne({ _id: payload.parent, ...NOT_DELETED });
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

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      payload,
      { new: true, runValidators: true }
    ).populate('parent', 'name slug');

    if (!category) {
      throw new NotFoundError('Category');
    }

    // Old image deleted from uploads when explicitly removed (a replaced
    // image was already deleted before the new upload was stored)
    if (removeRequested && oldImage) {
      deleteUploadedFile(oldImage);
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category },
    });
  });

  /**
   * Deleting a category removes the document from MongoDB entirely — the
   * model hook then automatically deletes its image file from the uploads
   * folder (uploads/category/). Sub-categories still block the delete.
   * (?permanent=true is accepted for compatibility and behaves the same.)
   */
  static delete = catchAsync(async (req: Request, res: Response) => {
    const category = await Category.findOne({ _id: req.params.id });
    if (!category) {
      throw new NotFoundError('Category');
    }

    const children = await Category.countDocuments({
      parent: category._id,
      ...NOT_DELETED,
    });
    if (children > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with subcategories',
      });
    }

    await Category.findOneAndDelete({ _id: category._id });

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  });
}
