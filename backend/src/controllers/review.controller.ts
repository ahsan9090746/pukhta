import { Request, Response } from 'express';
import { Review } from '../models/review.model';
import { Order } from '../models/order.model';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { parsePagination, parseSort, buildPaginationResponse } from '../utils/pagination';
import { NOT_DELETED, softDeleteFields } from '../utils/softDelete';

export class ReviewController {
  static create = catchAsync(async (req: Request, res: Response) => {
    const { productId, rating, title, comment, images, name, email } = req.body;
    const userId = req.user?._id;
    const guestName = typeof name === 'string' ? name.trim() : '';
    const guestEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (userId) {
      const existingReview = await Review.findOne({ user: userId, product: productId, ...NOT_DELETED });
      if (existingReview) {
        throw new BadRequestError('You have already reviewed this product');
      }
    } else {
      // Guest review — name + email are required to attribute and de-duplicate it
      if (!guestName || !guestEmail) {
        throw new BadRequestError('Name and email are required');
      }
      const existingReview = await Review.findOne({ guestEmail, product: productId, ...NOT_DELETED });
      if (existingReview) {
        throw new BadRequestError('You have already reviewed this product');
      }
    }

    const hasPurchased = userId
      ? await Order.findOne({
          user: userId,
          'items.product': productId,
          paymentStatus: 'paid',
        })
      : null;

    const review = await Review.create({
      user: userId,
      guestName: userId ? '' : guestName,
      guestEmail: userId ? '' : guestEmail,
      product: productId,
      rating,
      title,
      comment,
      images,
      isVerified: !!hasPurchased,
    });

    await (Review as any).calcAverageRating(productId);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: { review },
    });
  });

  static getProductReviews = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as any);
    const sort = parseSort(req.query.sort as string);

    // Bulk fake reviews store the full product list in `products`, so both
    // single-product rows and legacy bulk rows must be matched through `$or`.
    // Admin testimonials (`isFake`) are home-page only, never part of a
    // product's review list.
    const filter = {
      $or: [{ product: req.params.productId }, { products: req.params.productId }],
      isFake: { $ne: true },
      status: 'approved',
      ...NOT_DELETED,
    };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('user', 'name avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    const mapped = reviews.map((r: any) => ({
      ...r,
      fakeName: r.fakeName || '',
      fakeAvatar: r.fakeAvatar || '',
      isFake: r.isFake || false,
    }));

    res.status(200).json({
      success: true,
      data: {
        data: mapped,
        pagination: buildPaginationResponse(total, page, limit),
      },
    });
  });

  static getFeatured = catchAsync(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 12, 50);

    // The storefront home page shows two separate feeds:
    //   ?type=fake → admin-authored testimonials (top section)
    //   ?type=real → genuine customer reviews (list underneath)
    // Omitting `type` keeps the legacy behaviour (every approved review).
    const type = req.query.type as string | undefined;
    const filter: Record<string, any> = { status: 'approved', ...NOT_DELETED };
    if (type === 'fake') filter.isFake = true;
    // `$ne: true` also catches reviews written before the flag existed.
    else if (type === 'real') filter.isFake = { $ne: true };

    // Testimonials carry no product, so those lookups are skipped for them.
    let query = Review.find(filter).populate('user', 'name avatar');
    if (type !== 'fake') {
      query = query
        .populate('product', 'name slug images')
        .populate('products', 'name slug images');
    }

    const reviews = await query.sort({ createdAt: -1 }).limit(limit).lean();

    const mapped = reviews.map((r: any) => {
      // Bulk fake reviews keep the product list in `products` — fall back to
      // the first populated entry when there is no single `product`.
      const product = r.product || (Array.isArray(r.products) ? r.products.find((p: any) => p) : null);
      return {
        _id: r._id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        images: r.images || [],
        isVerified: !!(r.isVerified || r.isFake),
        isFake: !!r.isFake,
        name:
          r.isFake && r.fakeName
            ? r.fakeName
            : r.user?.name || r.guestName || 'Verified Buyer',
        avatar: r.isFake && r.fakeAvatar ? r.fakeAvatar : r.user?.avatar || '',
        productName: product?.name || '',
        productSlug: product?.slug || '',
        productImage: product?.images?.[0] || '',
        createdAt: r.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      data: { reviews: mapped },
    });
  });

  static getAll = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as any);
    const sort = parseSort(req.query.sort as string);

    const filter: Record<string, any> = { ...NOT_DELETED };
    if (req.query.status) filter.status = req.query.status;
    // The admin panel splits this list into two sections: the real reviews
    // customers submitted (?isFake=false) and the admin-authored ones
    // (?isFake=true) that feed the home page testimonials.
    if (req.query.isFake !== undefined && req.query.isFake !== '') {
      // `$ne: true` keeps reviews created before the flag existed in the real list.
      filter.isFake =
        String(req.query.isFake) === 'true' ? true : { $ne: true };
    }
    if (req.query.productId) {
      filter.$or = [{ product: req.query.productId }, { products: req.query.productId }];
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('user', 'name email avatar')
        .populate('product', 'name slug')
        .populate('products', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: reviews,
        pagination: buildPaginationResponse(total, page, limit),
      },
    });
  });

  static updateStatus = catchAsync(async (req: Request, res: Response) => {
    const { status } = req.body;
    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status },
      { new: true }
    );

    if (!review) {
      throw new NotFoundError('Review');
    }

    // Recalculate every product this review applies to — a bulk fake review
    // carries the full list in `products`. Runs for any status change so a
    // rejected review drops out of the averages as well.
    const affectedProducts: any[] = review.products?.length ? review.products : [review.product];
    for (const productId of affectedProducts.filter(Boolean)) {
      await (Review as any).calcAverageRating(productId);
    }

    res.status(200).json({
      success: true,
      message: `Review ${status}`,
      data: { review },
    });
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const review = await Review.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!review) {
      throw new NotFoundError('Review');
    }

    if (review.user?.toString() !== req.user!._id.toString() && !['super-admin', 'admin'].includes(req.user!.role)) {
      throw new ForbiddenError('Not authorized to delete this review');
    }

    const productIds: any[] = review.products?.length ? review.products : [review.product];

    // Soft delete: the row stays in the DB (and the author is freed up to
    // review the product again). Rejected status keeps it out of every
    // approved-only storefront query as well.
    await Review.findByIdAndUpdate(req.params.id, {
      $set: softDeleteFields({ status: 'rejected' }),
    });

    for (const productId of productIds.filter(Boolean)) {
      await (Review as any).calcAverageRating(productId);
    }

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  });

  static markHelpful = catchAsync(async (req: Request, res: Response) => {
    const review = await Review.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!review) {
      throw new NotFoundError('Review');
    }

    const userId = req.user!._id;
    const alreadyMarked = review.helpfulUsers.includes(userId);

    if (alreadyMarked) {
      review.helpfulUsers = review.helpfulUsers.filter(
        (id) => id.toString() !== userId.toString()
      );
      review.helpful -= 1;
    } else {
      review.helpfulUsers.push(userId);
      review.helpful += 1;
    }

    await review.save();

    res.status(200).json({
      success: true,
      data: { helpful: review.helpful, marked: !alreadyMarked },
    });
  });

  static createFakeReview = catchAsync(async (req: Request, res: Response) => {
    const { rating, title, comment, fakeName, fakeAvatar } = req.body;

    // Admin testimonials are deliberately product-independent: they only feed
    // the home page section, so nothing here reads products or recalculates
    // any product's rating (that used to scan the whole catalogue).
    const review = await Review.create({
      user: req.user!._id,
      rating,
      title,
      comment,
      isFake: true,
      fakeName: fakeName || '',
      fakeAvatar: fakeAvatar || '',
      status: 'approved',
    });

    res.status(201).json({
      success: true,
      message: 'Testimonial added',
      data: { review },
    });
  });
}
