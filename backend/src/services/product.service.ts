import { Product, IProduct } from '../models/product.model';
import { NotFoundError, BadRequestError } from '../utils/AppError';
import { parsePagination, parseSort, buildSearchFilter, buildPaginationResponse } from '../utils/pagination';
import { generateSlug } from '../utils/slugify';
import { removeUndefined } from '../utils/helpers';

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
    minPrice?: string;
    maxPrice?: string;
    isActive?: string;
    isFeatured?: string;
    sizes?: string;
    colors?: string;
  }) {
    const { page, limit, skip } = parsePagination(query);
    const sort = parseSort(query.sort);

    const filter: Record<string, any> = {};

    if (query.search) {
      Object.assign(filter, buildSearchFilter(query.search, ['name', 'description', 'tags']));
    }

    if (query.category) filter.category = query.category;
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
    if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured === 'true';

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

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
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
    const product = await Product.findById(id).populate('category', 'name slug');

    if (!product) {
      throw new NotFoundError('Product');
    }

    return product;
  }

  static async getBySlug(slug: string): Promise<IProduct> {
    const product = await Product.findOne({ slug }).populate('category', 'name slug');

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

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('category', 'name slug');

    if (!product) {
      throw new NotFoundError('Product');
    }

    return product;
  }

  static async delete(id: string): Promise<void> {
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      throw new NotFoundError('Product');
    }
  }

  static async updateStock(id: string, variantId: string | undefined, quantity: number): Promise<void> {
    const product = await Product.findById(id);
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
    const products = await Product.find({ isFeatured: true, isActive: true })
      .populate('category', 'name slug')
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
    return products.map(withComputedFields);
  }

  static async getNewArrivals(limit: number = 10) {
    const products = await Product.find({ isActive: true })
      .populate('category', 'name slug')
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
    return products.map(withComputedFields);
  }

  static async getBestSellers(limit: number = 10) {
    const products = await Product.find({ isActive: true })
      .populate('category', 'name slug')
      .limit(limit)
      .sort({ numReviews: -1, averageRating: -1 })
      .lean();
    return products.map(withComputedFields);
  }
}
