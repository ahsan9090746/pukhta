import { Cart, ICart } from '../models/cart.model';
import { Product } from '../models/product.model';
import { Coupon } from '../models/coupon.model';
import { NotFoundError, BadRequestError } from '../utils/AppError';
import { NOT_DELETED } from '../utils/softDelete';

export class CartService {
  static async getCart(userId: string): Promise<ICart> {
    let cart = await Cart.findOne({ user: userId })
      .populate({
        path: 'items.product',
        select: 'name slug price compareAtPrice thumbnail variants isActive',
      })
      .populate('coupon', 'code discountType discountValue');

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    return cart;
  }

  static async addItem(
    userId: string,
    productId: string,
    quantity: number,
    variantId?: string
  ): Promise<ICart> {
    const product = await Product.findOne({ _id: productId, ...NOT_DELETED });
    if (!product || !product.isActive) {
      throw new NotFoundError('Product');
    }

    let price: number;
    if (variantId) {
      const variant = product.variants.find((v) => v._id && v._id.toString() === variantId);
      if (!variant) {
        throw new NotFoundError('Variant');
      }
      if (variant.stock < quantity) {
        throw new BadRequestError('Insufficient stock');
      }
      price = variant.price;
    } else {
      price = product.price;
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        (!variantId || item.variant?.toString() === variantId)
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        product: product._id,
        variant: variantId as any,
        quantity,
        price,
      });
    }

    await cart.save();

    return this.getCart(userId);
  }

  static async updateItemQuantity(
    userId: string,
    itemId: string,
    quantity: number
  ): Promise<ICart> {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new NotFoundError('Cart');
    }

    const item = cart.items.find((i) => i._id && i._id.toString() === itemId);
    if (!item) {
      throw new NotFoundError('Cart item');
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i._id && i._id.toString() !== itemId);
    } else {
      const product = await Product.findOne({ _id: item.product, ...NOT_DELETED });
      if (product) {
        if (item.variant) {
          const variant = product.variants.find((v) => v._id && v._id.toString() === item.variant?.toString());
          if (variant && variant.stock < quantity) {
            throw new BadRequestError('Insufficient stock');
          }
        }
      }
      item.quantity = quantity;
    }

    await cart.save();
    return this.getCart(userId);
  }

  static async removeItem(userId: string, itemId: string): Promise<ICart> {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new NotFoundError('Cart');
    }

    const item = cart.items.find((i) => i._id && i._id.toString() === itemId);
    if (!item) {
      throw new NotFoundError('Cart item');
    }

    cart.items = cart.items.filter((i) => i._id && i._id.toString() !== itemId);
    await cart.save();

    return this.getCart(userId);
  }

  static async clearCart(userId: string): Promise<ICart> {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new NotFoundError('Cart');
    }

    cart.items = [];
    cart.coupon = undefined;
    cart.discount = 0;
    await cart.save();

    return this.getCart(userId);
  }

  static async applyCoupon(userId: string, code: string): Promise<ICart> {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new NotFoundError('Cart');
    }

    if (cart.items.length === 0) {
      throw new BadRequestError('Cart is empty');
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      ...NOT_DELETED,
    });

    if (!coupon) {
      throw new BadRequestError('Invalid coupon code');
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      throw new BadRequestError('Coupon has expired');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestError('Coupon usage limit reached');
    }

    if (coupon.minPurchase && cart.subtotal < coupon.minPurchase) {
      throw new BadRequestError(
        `Minimum purchase of $${coupon.minPurchase} required`
      );
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (cart.subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === 'fixed') {
      discount = Math.min(coupon.discountValue, cart.subtotal);
    }

    cart.coupon = coupon._id;
    cart.discount = Math.round(discount * 100) / 100;
    await cart.save();

    return this.getCart(userId);
  }

  static async removeCoupon(userId: string): Promise<ICart> {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new NotFoundError('Cart');
    }

    cart.coupon = undefined;
    cart.discount = 0;
    await cart.save();

    return this.getCart(userId);
  }
}
