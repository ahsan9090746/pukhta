import { Product, IProduct } from '../models/product.model';
import { NotFoundError, BadRequestError } from '../utils/AppError';
import { parsePagination, parseSort, buildSearchFilter, buildPaginationResponse } from '../utils/pagination';
import { generateSlug } from '../utils/slugify';
import { removeUndefined } from '../utils/helpers';
import { NOT_DELETED, softDeleteFields } from '../utils/softDelete';
import { getMultipleCategoriesAndDescendants } from '../utils/categoryTree';

/**
 * `.lean()` queries skip Mongoose virtuals, so the computed `stock` and
 * `discountPercentage` fields would be missing from list responses (making the
 * storefront think every product is out of stock). This adds them back.
 */
const withComputedFields = <T extends Record<string, any>>(product: T) => ({
  ...product,
  stock: Array.isArray(product.variants)
    ? product.variants.reduce((sum: number, v: any) => sum + (Number(v?.stock) || 0), 0)
    : 0,
  discountPercentage:
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0,
});

export class ProductService {
  // Category populate used on single-product reads: includes the FULL ancestor
  // chain (root → … → direct parent) so the storefront can render a
  // "Parent / Child" breadcrumb without an extra request. Deeper sub-category
  // levels are trimmed on the frontend.
  static CATEGORY_WITH_ANCESTORS = {
    path: 'categories',
    select: 'name slug level parent ancestors',
    populate: { path: 'ancestors', select: 'name slug level' },
  };
  static async create(data: Partial<IProduct>): Promise<IProduct> {
    if (data.name && !data.slug) {
      data.slug = generateSlug(data.name);
    }

    if (data.variants && data.variants.length > 0) {
      const skus = data.variants.map((v) => v.sku);
      const uniqueSkus = new Set(skus);
      if (uniqueSkus.size !== skus.length) {
        throw new BadRequestError('Variant SKUs must be unique');
      }
    }

    return Product.create(data);
  }

  static async getAll(query: {
    page?: string;
    limit?: string;
    sort?: string;
    search?: string;
    category?: string;
    categories?: string;
    minPrice?: string;
    maxPrice?: string;
    isActive?: string;
    isFeatured?: string;
    isNewArrival?: string;
    sizes?: string;
    colors?: string;
    onSale?: string;
    inStock?: string;
  }) {
    const { page, limit, skip } = parsePagination(query);
    const sort = parseSort(query.sort);

    const filter: Record<string, any> = { ...NOT_DELETED };

    if (query.search) {
      // SKU search is supported so the admin banner picker (and the storefront
      // search box) can find a product by its product-level or variant SKU.
      Object.assign(
        filter,
        buildSearchFilter(query.search, ['name', 'description', 'tags', 'sku', 'variants.sku'])
      );
    }

    // Support both single category (backward compat) and multiple categories
    // Include all descendant categories so parent category shows child/sub-category products
    let categoryFilterIds: string[] = [];
    if (query.categories) {
      categoryFilterIds = query.categories.split(',').filter(Boolean);
    } else if (query.category) {
      categoryFilterIds = [query.category];
    }
    
    if (categoryFilterIds.length > 0) {
      const expandedIds = await getMultipleCategoriesAndDescendants(categoryFilterIds);
      filter.categories = { $in: expandedIds };
    }
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
    if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured === 'true';
    if (query.isNewArrival !== undefined) filter.isNewArrival = query.isNewArrival === 'true';

    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) filter.price.$gte = parseFloat(query.minPrice);
      if (query.maxPrice) filter.price.$lte = parseFloat(query.maxPrice);
    }

    if (query.sizes) {
      filter.sizes = { $in: query.sizes.split(',') };
    }

    if (query.colors) {
      filter.colors = { $in: query.colors.split(',') };
    }

    // On sale: compareAtPrice > price
    if (query.onSale === 'true') {
      filter.$expr = { $gt: ['$compareAtPrice', '$price'] };
    }

    // In stock: variants stock sum > 0 or (no variants and stock > 0)
    if (query.inStock === 'true') {
      filter.$or = [
        { variants: { $elemMatch: { stock: { $gt: 0 } } } },
        { variants: { $size: 0 }, stock: { $gt: 0 } },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        // List responses skip heavy fields the listing UI never renders
        // (descriptions, SEO meta, cost price) — single-product reads still
        // return the full document.
        .select('-description -metaTitle -metaDescription -costPrice -__v')
        .populate('categories', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return {
      data: products.map(withComputedFields),
      pagination: buildPaginationResponse(total, page, limit),
    };
  }

  static async getById(id: string): Promise<IProduct> {
    const product = await Product.findOne({ _id: id, ...NOT_DELETED }).populate(
      ProductService.CATEGORY_WITH_ANCESTORS
    );

    if (!product) {
      throw new NotFoundError('Product');
    }

    return product;
  }

  static async getBySlug(slug: string): Promise<IProduct> {
    const product = await Product.findOne({ slug, ...NOT_DELETED }).populate(
      ProductService.CATEGORY_WITH_ANCESTORS
    );

    if (!product) {
      throw new NotFoundError('Product');
    }

    return product;
  }

  static async update(id: string, data: Partial<IProduct>): Promise<IProduct> {
    if (data.name && !data.slug) {
      data.slug = generateSlug(data.name);
    }

    const updateData = removeUndefined(data);

    const product = await Product.findOneAndUpdate(
      { _id: id, ...NOT_DELETED },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).populate('categories', 'name slug');

    if (!product) {
      throw new NotFoundError('Product');
    }

    return product;
  }

  /**
   * Soft delete: the document is flagged instead of removed so it can be
   * audited/restored later. Uploaded images are intentionally kept on disk —
   * `ProductController.delete` no longer deletes them.
   */
  static async delete(id: string): Promise<void> {
    const product = await Product.findOneAndUpdate(
      { _id: id, ...NOT_DELETED },
      {
        $set: softDeleteFields({
          isActive: false,
          isFeatured: false,
          isNewArrival: false,
        }),
      },
      { new: true }
    );

    if (!product) {
      throw new NotFoundError('Product');
    }
  }

  static async updateStock(id: string, variantId: string | undefined, quantity: number): Promise<void> {
    const product = await Product.findOne({ _id: id, ...NOT_DELETED });
    if (!product) {
      throw new NotFoundError('Product');
    }

    if (variantId) {
      const variant = product.variants.find((v) => v._id && v._id.toString() === variantId);
      if (!variant) {
        throw new NotFoundError('Variant');
      }
      if (variant.stock + quantity < 0) {
        throw new BadRequestError('Insufficient stock');
      }
      variant.stock += quantity;
    } else {
      if (product.variants.length === 0 && product.stock + quantity < 0) {
        throw new BadRequestError('Insufficient stock');
      }
    }

    await product.save();
  }

  static async getFeatured(limit: number = 10) {
    const products = await Product.find({ isFeatured: true, isActive: true, ...NOT_DELETED })
      .populate('categories', 'name slug')
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
    return products.map(withComputedFields);
  }

  static async getNewArrivals(query: {
    page?: string;
    limit?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    sizes?: string;
    colors?: string;
    onSale?: string;
    inStock?: string;
  } = {}) {
    const { page, limit, skip } = parsePagination(query);
    const sort = parseSort(query.sort);

    const filter: Record<string, any> = { isNewArrival: true, isActive: true, ...NOT_DELETED };

    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) filter.price.$gte = parseFloat(query.minPrice);
      if (query.maxPrice) filter.price.$lte = parseFloat(query.maxPrice);
    }

    if (query.sizes) {
      filter.sizes = { $in: query.sizes.split(',') };
    }

    if (query.colors) {
      filter.colors = { $in: query.colors.split(',') };
    }

    if (query.onSale === 'true') {
      filter.$expr = { $gt: ['$compareAtPrice', '$price'] };
    }

    if (query.inStock === 'true') {
      filter.$or = [
        { variants: { $elemMatch: { stock: { $gt: 0 } } } },
        { variants: { $size: 0 }, stock: { $gt: 0 } },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        // List responses skip heavy fields the listing UI never renders
        // (descriptions, SEO meta, cost price) — single-product reads still
        // return the full document.
        .select('-description -metaTitle -metaDescription -costPrice -__v')
        .populate('categories', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return {
      data: products.map(withComputedFields),
      pagination: buildPaginationResponse(total, page, limit),
    };
  }

  static async getBestSellers(limit: number = 10) {
    const products = await Product.find({ isActive: true, ...NOT_DELETED })
      .populate('categories', 'name slug')
      .limit(limit)
      .sort({ numReviews: -1, averageRating: -1 })
      .lean();
    return products.map(withComputedFields);
  }
}
