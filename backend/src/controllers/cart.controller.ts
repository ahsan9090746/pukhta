import { Request, Response } from 'express';
import { CartService } from '../services/cart.service';
import { catchAsync } from '../utils/catchAsync';

export class CartController {
  static getCart = catchAsync(async (req: Request, res: Response) => {
    const cart = await CartService.getCart(req.user!._id.toString());

    res.status(200).json({
      success: true,
      data: { cart },
    });
  });

  static addItem = catchAsync(async (req: Request, res: Response) => {
    const { productId, quantity, variantId } = req.body;
    const cart = await CartService.addItem(
      req.user!._id.toString(),
      productId,
      quantity || 1,
      variantId
    );

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: { cart },
    });
  });

  static updateItemQuantity = catchAsync(async (req: Request, res: Response) => {
    const { quantity } = req.body;
    const cart = await CartService.updateItemQuantity(
      req.user!._id.toString(),
      req.params.itemId,
      quantity
    );

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      data: { cart },
    });
  });

  static removeItem = catchAsync(async (req: Request, res: Response) => {
    const cart = await CartService.removeItem(
      req.user!._id.toString(),
      req.params.itemId
    );

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: { cart },
    });
  });

  static clearCart = catchAsync(async (req: Request, res: Response) => {
    const cart = await CartService.clearCart(req.user!._id.toString());

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: { cart },
    });
  });

  static applyCoupon = catchAsync(async (req: Request, res: Response) => {
    const { code } = req.body;
    const cart = await CartService.applyCoupon(req.user!._id.toString(), code);

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: { cart },
    });
  });

  static removeCoupon = catchAsync(async (req: Request, res: Response) => {
    const cart = await CartService.removeCoupon(req.user!._id.toString());

    res.status(200).json({
      success: true,
      message: 'Coupon removed',
      data: { cart },
    });
  });
}
