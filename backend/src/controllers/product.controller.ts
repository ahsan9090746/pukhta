import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { Product } from '../models/product.model';
import { catchAsync } from '../utils/catchAsync';
import { deleteUploadedFile } from '../utils/upload';

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
  if (body.description !== undefined) payload.description = body.description;
  if (body.shortDescription !== undefined) payload.shortDescription = body.shortDescription;
  if (body.sku !== undefined) payload.sku = body.sku;
  if (body.barcode !== undefined) payload.barcode = body.barcode;
  if (body.altText !== undefined) payload.altText = body.altText;

  if (body.categoryId !== undefined && body.categoryId !== '') payload.category = body.categoryId;

  if (body.price !== undefined && body.price !== '') payload.price = Number(body.price);
  if (body.compareAtPrice !== undefined && body.compareAtPrice !== '') {
    payload.compareAtPrice = Number(body.compareAtPrice);
  }
  if (body.costPrice !== undefined && body.costPrice !== '') payload.costPrice = Number(body.costPrice);
  if (body.stock !== undefined && body.stock !== '') payload.stock = Number(body.stock);

  if (body.isActive !== undefined && body.isActive !== '') payload.isActive = String(body.isActive) === 'true';
  if (body.isFeatured !== undefined && body.isFeatured !== '') payload.isFeatured = String(body.isFeatured) === 'true';

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

// Uploaded image paths from multer (field name: images)
const getUploadedImages = (req: Request): string[] =>
  (req.files as Express.Multer.File[] | undefined)?.map((f) => `/uploads/${f.filename}`) ?? [];

// Delete files from uploads that are no longer referenced
const cleanupImages = (oldImages: string[], keep: string[]) => {
  oldImages.forEach((img) => {
    if (img && !keep.includes(img)) deleteUploadedFile(img);
  });
};

// Product SKU is required by the schema. The admin form pre-fills it, but
// direct API calls may omit it — generate a unique one instead of failing.
const generateUniqueSku = async (): Promise<string> => {
  let counter = (await Product.countDocuments()) + 1;
  while (await Product.exists({ sku: `SKU-${counter}` })) counter += 1;
  return `SKU-${counter}`;
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
    const uploaded = getUploadedImages(req);
    if (uploaded.length > 0) {
      payload.images = uploaded;
      payload.thumbnail = uploaded[0];
    }

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
      ? await Product.find({ _id: { $in: ids }, isActive: true })
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
    const uploaded = getUploadedImages(req);

    // An empty SKU on update means "keep the existing one" (avoids validation error)
    if (payload.sku !== undefined && !String(payload.sku).trim()) {
      delete payload.sku;
    }

    // Existing images kept by the client (JSON array of "/uploads/..." paths)
    const keptExisting: string[] = parseJsonField(req.body.existingImages, [])
      .filter((p: any) => typeof p === 'string' && p.startsWith('/uploads/'));

    // Fetch old product for image cleanup
    const existing = await Product.findById(req.params.id);
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

  static delete = catchAsync(async (req: Request, res: Response) => {
    const product = await Product.findById(req.params.id);
    if (product) {
      (product.images ?? []).forEach((img) => deleteUploadedFile(img));
    }

    await ProductService.delete(req.params.id);

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
    const limit = parseInt(req.query.limit as string) || 10;
    const products = await ProductService.getNewArrivals(limit);

    res.status(200).json({
      success: true,
      data: { products },
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
}
