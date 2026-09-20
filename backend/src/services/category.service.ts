import { Types } from 'mongoose';
import { Category } from '../models/category.model';
import { Product } from '../models/product.model';
import { BadRequestError, NotFoundError } from '../utils/AppError';
import { deleteUploadedFile } from '../utils/upload';

export const MAX_CATEGORY_LEVEL = 2;

const toId = (value: any): string | null => (value ? String(value) : null);

export const toSlug = (value: string): string =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

export interface CategoryQueryOptions {
  includeInactive?: boolean;
  search?: string;
  parentId?: string | null;
  level?: number;
}

export class CategoryService {
  static async getProductCounts(): Promise<{ direct: Record<string, number>; total: Record<string, number> }> {
    const aggregated = await Product.aggregate([
      { $match: { category: { $ne: null } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const direct: Record<string, number> = {};
    aggregated.forEach((row: any) => {
      if (row && row._id) direct[String(row._id)] = Number(row.count) || 0;
    });

    const categories = await Category.find().select('_id ancestors').lean();
    const total: Record<string, number> = {};

    categories.forEach((cat: any) => {
      total[String(cat._id)] = direct[String(cat._id)] || 0;
    });

    categories.forEach((cat: any) => {
      const own = direct[String(cat._id)] || 0;
      if (!own) return;
      const ancestors: any[] = Array.isArray(cat.ancestors) ? cat.ancestors : [];
      ancestors.forEach((ancestorId: any) => {
        const key = String(ancestorId);
        total[key] = (total[key] || 0) + own;
      });
    });

    return { direct, total };
  }

  static buildFilter(options: CategoryQueryOptions = {}): Record<string, any> {
    const filter: Record<string, any> = {};

    if (!options.includeInactive) {
      filter.isActive = { $ne: false };
    }

    if (options.parentId === null) {
      filter.parent = null;
    } else if (options.parentId) {
      filter.parent = new Types.ObjectId(options.parentId);
    }

    if (typeof options.level === 'number' && !Number.isNaN(options.level)) {
      filter.level = options.level;
    }

    if (options.search) {
      filter.name = { $regex: String(options.search), $options: 'i' };
    }

    return filter;
  }

  static async getFlat(options: CategoryQueryOptions = {}) {
    const { direct, total } = await this.getProductCounts();
    const list = await Category.find(this.buildFilter(options))
      .sort({ level: 1, sortOrder: 1, name: 1 })
      .lean();

    return list.map((cat: any) => ({
      ...cat,
      productCount: direct[String(cat._id)] || 0,
      totalProductCount: total[String(cat._id)] || 0,
      children: [] as any[],
    }));
  }
