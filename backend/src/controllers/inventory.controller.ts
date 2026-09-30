import { Request, Response } from 'express';
import { Product } from '../models/product.model';
import { InventoryMovement } from '../models/inventory-movement.model';
import { NotFoundError, BadRequestError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { parsePagination, parseSort, buildPaginationResponse } from '../utils/pagination';
import { logger } from '../utils/logger';
import { NOT_DELETED } from '../utils/softDelete';

export class InventoryController {
  static getInventory = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as any);
    const sort = parseSort(req.query.sort as string);

    const filter: Record<string, any> = { ...NOT_DELETED };
    if (req.query.lowStock === 'true') {
      filter.$expr = { $lt: [{ $sum: '$variants.stock' }, 10] };
    }
    if (req.query.outOfStock === 'true') {
      filter.$expr = { $eq: [{ $sum: '$variants.stock' }, 0] };
    }
    if (req.query.search) {
      filter.$or = [
        { name: new RegExp(req.query.search as string, 'i') },
        { sku: new RegExp(req.query.search as string, 'i') },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('name sku variants thumbnail isActive')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const inventoryData = products.map((product) => ({
      ...product,
      totalStock: product.variants.reduce((sum, v) => sum + v.stock, 0),
      variants: product.variants.map((v) => ({
        _id: v._id,
        size: v.size,
        color: v.color,
        sku: v.sku,
        stock: v.stock,
      })),
    }));

    res.status(200).json({
      success: true,
      data: {
        data: inventoryData,
        pagination: buildPaginationResponse(total, page, limit),
      },
    });
  });

  static updateStock = catchAsync(async (req: Request, res: Response) => {
    const { productId, variantId, notes } = req.body;

    // Coerce inputs – multipart/form or string payloads must not break the math
    const quantity = Number(req.body.quantity) || 0;
    const allowedTypes = ['purchase', 'adjustment', 'sale', 'return'];
    const requestedType = String(req.body.type || 'adjustment');
    const type = allowedTypes.includes(requestedType) ? requestedType : 'adjustment';

    if (quantity === 0) {
      throw new BadRequestError('Quantity must not be zero');
    }

    const product = await Product.findOne({ _id: productId, ...NOT_DELETED });
    if (!product) {
      throw new NotFoundError('Product');
    }

    let previousStock: number;
    let newStock: number;

    if (variantId) {
      const variant = product.variants.find((v) => v._id && v._id.toString() === variantId);
      if (!variant) {
        throw new NotFoundError('Variant');
      }

      previousStock = Number(variant.stock) || 0;
      newStock = previousStock + quantity;

      if (newStock < 0) {
        throw new BadRequestError('Stock cannot be negative');
      }

      variant.stock = newStock;
    } else {
      if (product.variants.length > 0) {
        previousStock = Number(product.variants[0].stock) || 0;
        newStock = previousStock + quantity;
        if (newStock < 0) {
          throw new BadRequestError('Stock cannot be negative');
        }
        product.variants[0].stock = newStock;
      } else {
        throw new BadRequestError('Product has no variants');
      }
    }

    await product.save();

    // Movement log is best-effort: a logging failure must never roll back stock
    try {
      await InventoryMovement.create({
        product: productId,
        variant: variantId,
        type,
        quantity: Math.abs(quantity),
        previousStock,
        newStock,
        notes,
        performedBy: req.user!._id,
      });
    } catch (err) {
      logger.warn(`Inventory movement log failed: ${(err as Error).message}`);
    }

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        product: {
          _id: product._id,
          name: product.name,
          sku: product.sku,
        },
        previousStock,
        newStock,
      },
    });
  });

  static bulkUpdateStock = catchAsync(async (req: Request, res: Response) => {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new BadRequestError('Updates array is required');
    }

    const results = [];

    for (const update of updates) {
      const product = await Product.findOne({ _id: update.productId, ...NOT_DELETED });
      if (!product) {
        results.push({
          productId: update.productId,
          success: false,
          error: 'Product not found',
        });
        continue;
      }

      if (update.variantId) {
        const variant = product.variants.find((v) => v._id && v._id.toString() === update.variantId);
        if (!variant) {
          results.push({
            productId: update.productId,
            variantId: update.variantId,
            success: false,
            error: 'Variant not found',
          });
          continue;
        }

        const previousStock = Number(variant.stock) || 0;
        const newQuantity = Number(update.quantity) || 0;

        if (newQuantity < 0) {
          results.push({
            productId: update.productId,
            variantId: update.variantId,
            success: false,
            error: 'Stock cannot be negative',
          });
          continue;
        }

        variant.stock = newQuantity;

        await product.save();

        try {
          await InventoryMovement.create({
            product: update.productId,
            variant: update.variantId,
            type: 'adjustment',
            quantity: Math.abs(newQuantity - previousStock),
            previousStock,
            newStock: newQuantity,
            notes: 'Bulk update',
            performedBy: req.user!._id,
          });
        } catch (err) {
          logger.warn(`Inventory movement log failed: ${(err as Error).message}`);
        }

        results.push({
          productId: update.productId,
          variantId: update.variantId,
          success: true,
          previousStock,
          newStock: newQuantity,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk update completed',
      data: { results },
    });
  });

  static getMovements = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as any);
    const sort = parseSort(req.query.sort as string);

    const filter: Record<string, any> = {};
    if (req.query.productId) filter.product = req.query.productId;
    if (req.query.type) filter.type = req.query.type;

    const [movements, total] = await Promise.all([
      InventoryMovement.find(filter)
        .populate('product', 'name sku variants')
        .populate('performedBy', 'name email role')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryMovement.countDocuments(filter),
    ]);

    // Attach variant details from product variants
    const enriched = movements.map((m: any) => {
      let variantDetails = null;
      if (m.variant && m.product?.variants) {
        variantDetails = m.product.variants.find(
          (v: any) => v._id?.toString() === m.variant?.toString()
        );
      }
      return {
        ...m,
        variantDetails: variantDetails
          ? { size: variantDetails.size, color: variantDetails.color, sku: variantDetails.sku }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        data: enriched,
        pagination: buildPaginationResponse(total, page, limit),
      },
    });
  });

  static getLowStockProducts = catchAsync(async (req: Request, res: Response) => {
    const threshold = parseInt(req.query.threshold as string) || 10;

    const products = await Product.find({
      isActive: true,
      ...NOT_DELETED,
      $expr: { $lt: [{ $sum: '$variants.stock' }, threshold] },
    })
      .select('name sku variants thumbnail')
      .sort({ createdAt: -1 })
      .lean();

    const data = products.map((product) => ({
      ...product,
      totalStock: product.variants.reduce((sum, v) => sum + v.stock, 0),
    }));

    res.status(200).json({
      success: true,
      data: { products: data },
    });
  });
}
