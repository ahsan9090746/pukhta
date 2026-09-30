import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ProductService } from '../services/product.service';
import { Product } from '../models/product.model';
import { catchAsync } from '../utils/catchAsync';
import { NotFoundError } from '../utils/AppError';
import { deleteUploadedFile, renameUploadedEntityFiles } from '../utils/upload';
import { sanitizeRichText } from '../utils/sanitize';
import { NOT_DELETED } from '../utils/softDelete';

// Safely parse a JSON string field from multipart body
const parseJsonField = (value: any, fallback: any): any => {
  if (value === undefined || value === '' || value === null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

// Coerce multipart/form-data strings into proper types & map field names
const parseProductBody = (body: Record<string, any>): Record<string, any> => {
  const payload: Record<string, any> = {};
  if (body.name !== undefined) payload.name = body.name;
  if (body.slug !== undefined && body.slug !== '') payload.slug = body.slug;
  if (body.description !== undefined) payload.description = sanitizeRichText(body.description);
  if (body.shortDescription !== undefined) payload.shortDescription = sanitizeRichText(body.shortDescription);
  if (body.sku !== undefined) payload.sku = body.sku;
  if (body.altText !== undefined) payload.altText = body.altText;
  if (body.metaTitle !== undefined) payload.metaTitle = body.metaTitle;
  if (body.metaDescription !== undefined) payload.metaDescription = body.metaDescription;

  // Admin UI sends categoriesId (JSON array string via multipart);
  // direct API calls may send categoryId (single) or `category`.
  let rawCategories: any;
  if (body.categoriesId !== undefined && body.categoriesId !== '') {
    rawCategories = parseJsonField(body.categoriesId, undefined);
  } else if (body.categoryId !== undefined && body.categoryId !== '') {
    rawCategories = [body.categoryId];
  } else {
    rawCategories = body.category;
  }
  if (rawCategories !== undefined) {
    const cats = Array.isArray(rawCategories) ? rawCategories : [rawCategories];
    const filtered = cats.filter((c: string) => c && c.trim());
    if (filtered.length > 0) payload.categories = filtered;
  }

  if (body.price !== undefined && body.price !== '') payload.price = Number(body.price);
  if (body.compareAtPrice !== undefined && body.compareAtPrice !== '') {
    payload.compareAtPrice = Number(body.compareAtPrice);
  }
  if (body.costPrice !== undefined && body.costPrice !== '') payload.costPrice = Number(body.costPrice);
  if (body.stock !== undefined && body.stock !== '') payload.stock = Number(body.stock);

  if (body.isActive !== undefined && body.isActive !== '') payload.isActive = String(body.isActive) === 'true';
  if (body.isFeatured !== undefined && body.isFeatured !== '') payload.isFeatured = String(body.isFeatured) === 'true';
  if (body.isNewArrival !== undefined && body.isNewArrival !== '') payload.isNewArrival = String(body.isNewArrival) === 'true';

  const variants = parseJsonField(body.variants, undefined);
  if (variants !== undefined) payload.variants = variants;
  const specifications = parseJsonField(body.specifications, undefined);
  if (specifications !== undefined) payload.specifications = specifications;
  const tags = parseJsonField(body.tags, undefined);
  if (tags !== undefined) payload.tags = tags;
  const sizes = parseJsonField(body.sizes, undefined);
  if (sizes !== undefined) payload.sizes = sizes;
  const colors = parseJsonField(body.colors, undefined);
  if (colors !== undefined) payload.colors = colors;

  return payload;
};

// Delete files from uploads that are no longer referenced
const cleanupImages = (oldImages: string[], keep: string[]) => {
  oldImages.forEach((img) => {
    if (img && !keep.includes(img)) deleteUploadedFile(img);
  });
};

// Product SKU is required by the schema. The admin form pre-fills it, but
// direct API calls may omit it — generate a unique one instead of failing.
// SKUs run sequentially from the latest SKU in DB (e.g., PUK9055 -> PUK9056).
const generateUniqueSku = async (): Promise<string> => {
  const lastProduct = await Product.findOne({ sku: /^Puk\d+$/i })
    .sort({ sku: -1 })
    .select('sku')
    .lean();

  let nextNumber = 9001;
  if (lastProduct?.sku) {
    const match = lastProduct.sku.match(/^Puk(\d+)$/i);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  while (await Product.exists({ sku: `Puk${nextNumber}` })) {
    nextNumber += 1;
  }

  return `Puk${nextNumber}`;
};

export const getNextSku = async (): Promise<string> => {
  return generateUniqueSku();
};

// Normalize variants: drop fully-empty rows, auto-generate missing SKUs.
// The admin panel never asks for a per-variant price — the product-level price
// applies to every variant, and it is resolved at order time from the product
// itself so a later price change can never leave a stale variant price behind.
const normalizeVariants = (payload: Record<string, any>) => {
  if (!Array.isArray(payload.variants)) return;
  const baseSku = payload.sku || 'SKU';

  payload.variants = payload.variants
    .filter(
      (v: any) =>
        v &&
        (String(v.size || '').trim() ||
          String(v.color || '').trim() ||
          Number(v.stock) > 0)
    )
    .map((v: any, i: number) => ({
      ...v,
      sku: (v.sku && String(v.sku).trim()) || `${baseSku}-${String(i + 1).padStart(2, '0')}`,
      price: 0,
      stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
    }));
};

export class ProductController {
  static create = catchAsync(async (req: Request, res: Response) => {
    const payload = parseProductBody(req.body);

    // The product id is generated up-front so the uploaded images can be
    // renamed to "<productId>-<n>.<ext>" inside uploads/product/.
    const productId = new mongoose.Types.ObjectId();
    const uploaded = renameUploadedEntityFiles(
      req.files as Express.Multer.File[] | undefined,
      'product',
      productId.toString()
    );
    if (uploaded.length > 0) {
      payload.images = uploaded;
      payload.thumbnail = uploaded[0];
    }
    payload._id = productId;

    // Auto-generate the product SKU when the client sends none/empty
    if (!payload.sku || !String(payload.sku).trim()) {
      payload.sku = await generateUniqueSku();
    }

    // Normalize variants (drop empty rows, auto SKUs) before auto-variant logic
    normalizeVariants(payload);

    // `stock` is a virtual (sum of variant stocks). If user only filled the
    // top-level Stock field (no variants), auto-create a default variant
    // so the product actually has stock.
    if (
      (!payload.variants || payload.variants.length === 0) &&
      typeof payload.stock === 'number' &&
      payload.stock > 0
    ) {
      payload.variants = [
        {
          size: '',
          color: '',
          price: payload.price ?? 0,
          stock: payload.stock,
          sku: payload.sku || `AUTO-${Date.now()}`,
        },
      ];
    }

    const product = await ProductService.create(payload);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product },
    });
  });

  static getAll = catchAsync(async (req: Request, res: Response) => {
    const result = await ProductService.getAll(req.query as any);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    const product = isObjectId
      ? await ProductService.getById(req.params.id)
      : await ProductService.getBySlug(req.params.id);

    res.status(200).json({
      success: true,
      data: { product },
    });
  });

  static getForCompare = catchAsync(async (req: Request, res: Response) => {
    const ids = String(req.query.ids || '')
      .split(',')
      .filter((id) => /^[0-9a-fA-F]{24}$/.test(id))
      .slice(0, 4);

    const products = ids.length
      ? await Product.find({ _id: { $in: ids }, isActive: true, ...NOT_DELETED })
          .populate('category', 'name slug')
      : [];

    res.status(200).json({
      success: true,
      data: { products },
    });
  });

  static getBySlug = catchAsync(async (req: Request, res: Response) => {
    const product = await ProductService.getBySlug(req.params.slug);

    res.status(200).json({
      success: true,
      data: { product },
    });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const payload = parseProductBody(req.body);
    // Newly uploaded images are renamed to "<productId>-<n>.<ext>" inside
    // uploads/product/ (a random suffix is added when a name is taken).
    const uploaded = renameUploadedEntityFiles(
      req.files as Express.Multer.File[] | undefined,
      'product',
      req.params.id
    );

    // An empty SKU on update means "keep the existing one" (avoids validation error)
    if (payload.sku !== undefined && !String(payload.sku).trim()) {
      delete payload.sku;
    }

    // Existing images kept by the client (JSON array of "/uploads/..." paths)
    const keptExisting: string[] = parseJsonField(req.body.existingImages, [])
      .filter((p: any) => typeof p === 'string' && p.startsWith('/uploads/'));

    // Fetch old product for image cleanup
    const existing = await Product.findOne({ _id: req.params.id, ...NOT_DELETED });
    const oldImages: string[] = existing?.images ?? [];

    if (uploaded.length > 0 || keptExisting.length > 0 || String(req.body.removeImages || '') === 'true') {
      const finalImages = [...keptExisting, ...uploaded];
      payload.images = finalImages;
      if (finalImages.length > 0) {
        payload.thumbnail = finalImages[0];
      }
      cleanupImages(oldImages, finalImages);
    }

    // Normalize variants (drop empty rows, auto SKUs) + stock fallback
    normalizeVariants(payload);
    if (
      (!payload.variants || payload.variants.length === 0) &&
      typeof payload.stock === 'number' &&
      payload.stock > 0
    ) {
      payload.variants = [
        {
          size: '',
          color: '',
          price: payload.price ?? 0,
          stock: payload.stock,
          sku: payload.sku || `AUTO-${Date.now()}`,
        },
      ];
    }

    const product = await ProductService.update(req.params.id, payload);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product },
    });
  });

  // Deleting a product removes the document from MongoDB entirely — the
  // model hook then automatically deletes its image files from the uploads
  // folder (uploads/product/).
  static delete = catchAsync(async (req: Request, res: Response) => {
    const deleted = await Product.findOneAndDelete({ _id: req.params.id });
    if (!deleted) {
      throw new NotFoundError('Product');
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  });

  static getFeatured = catchAsync(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const products = await ProductService.getFeatured(limit);

    res.status(200).json({
      success: true,
      data: { products },
    });
  });

  static getNewArrivals = catchAsync(async (req: Request, res: Response) => {
    const result = await ProductService.getNewArrivals(req.query as any);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  static getBestSellers = catchAsync(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const products = await ProductService.getBestSellers(limit);

    res.status(200).json({
      success: true,
      data: { products },
    });
  });

  static getNextSku = catchAsync(async (req: Request, res: Response) => {
    const nextSku = await getNextSku();
    res.status(200).json({ success: true, data: { sku: nextSku } });
  });

  static toggleNewArrivals = catchAsync(async (req: Request, res: Response) => {
    const { productIds, isNewArrival } = req.body;

    if (!Array.isArray(productIds)) {
      res.status(400).json({
        success: false,
        message: 'productIds must be an array',
      });
      return;
    }

    await Product.updateMany(
      { _id: { $in: productIds }, ...NOT_DELETED },
      { $set: { isNewArrival: isNewArrival !== false } }
    );

    res.status(200).json({
      success: true,
      message: `${productIds.length} products updated as New Arrivals`,
    });
  });
}
