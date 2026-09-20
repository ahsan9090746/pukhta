import { Request, Response } from 'express';
import { Review } from '../models/review.model';
import { Product } from '../models/product.model';
import { Order } from '../models/order.model';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { parsePagination, parseSort, buildPaginationResponse } from '../utils/pagination';

export class ReviewController {
  static create = catchAsync(async (req: Request, res: Response) => {
    const { productId, rating, title, comment, images } = req.body;
    const userId = req.user!._id;

    const existingReview = await Review.findOne({ user: userId, product: productId });
    if (existingReview) {
      throw new BadRequestError('You have already reviewed this product');
    }

    const hasPurchased = await Order.findOne({
      user: userId,
      'items.product': productId,
      paymentStatus: 'paid',
    });

    const review = await Review.create({
      user: userId,
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

    const filter = {
      product: req.params.productId,
      status: 'approved',
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

    res.status(200).json({
      success: true,
      data: {
        data: reviews,
        pagination: buildPaginationResponse(total, page, limit),
      },
    });
  });

  static getAll = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as any);
    const sort = parseSort(req.query.sort as string);

    const filter: Record<string, any> = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.productId) filter.product = req.query.productId;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('user', 'name email avatar')
        .populate('product', 'name slug')
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
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!review) {
      throw new NotFoundError('Review');
    }

    if (status === 'approved') {
      await (Review as any).calcAverageRating(review.product);
    }

    res.status(200).json({
      success: true,
      message: `Review ${status}`,
      data: { review },
    });
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const review = await Review.findById(req.params.id);
    if (!review) {
      throw new NotFoundError('Review');
    }

    if (review.user.toString() !== req.user!._id.toString() && !['super-admin', 'admin'].includes(req.user!.role)) {
      throw new ForbiddenError('Not authorized to delete this review');
    }

    const productId = review.product;
    await Review.findByIdAndDelete(req.params.id);

    await (Review as any).calcAverageRating(productId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  });

  static markHelpful = catchAsync(async (req: Request, res: Response) => {
    const review = await Review.findById(req.params.id);
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
}
