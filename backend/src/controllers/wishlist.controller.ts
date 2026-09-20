import { Request, Response } from 'express';
import { Wishlist } from '../models/wishlist.model';
import { Product } from '../models/product.model';
import { NotFoundError, BadRequestError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';

export class WishlistController {
  static getWishlist = catchAsync(async (req: Request, res: Response) => {
    let wishlist = await Wishlist.findOne({ user: req.user!._id })
      .populate({
        path: 'products',
        select: 'name slug price compareAtPrice thumbnail category',
        populate: [{ path: 'category', select: 'name slug' }],
      });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user!._id, products: [] });
    }

    res.status(200).json({
      success: true,
      data: { wishlist },
    });
  });

  static addToWishlist = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Product');
    }

    let wishlist = await Wishlist.findOne({ user: req.user!._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user!._id, products: [] });
    }

    if (wishlist.products.includes(productId)) {
      throw new BadRequestError('Product already in wishlist');
    }

    wishlist.products.push(productId);
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist',
      data: { wishlist },
    });
  });

  static removeFromWishlist = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user!._id });
    if (!wishlist) {
      throw new NotFoundError('Wishlist');
    }

    const index = wishlist.products.indexOf(productId as any);
    if (index === -1) {
      throw new NotFoundError('Product in wishlist');
    }

    wishlist.products.splice(index, 1);
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      data: { wishlist },
    });
  });

  static clearWishlist = catchAsync(async (req: Request, res: Response) => {
    const wishlist = await Wishlist.findOne({ user: req.user!._id });
    if (wishlist) {
      wishlist.products = [];
      await wishlist.save();
    }

    res.status(200).json({
      success: true,
      message: 'Wishlist cleared',
      data: { wishlist: wishlist || { products: [] } },
    });
  });
}
