import { Order, IOrder, IOrderItem } from '../models/order.model';
import { Product } from '../models/product.model';
import { Cart } from '../models/cart.model';
import { Coupon } from '../models/coupon.model';
import { Notification } from '../models/notification.model';
import { NotFoundError, BadRequestError } from '../utils/AppError';
import { parsePagination, parseSort, buildPaginationResponse } from '../utils/pagination';
import { generateOrderNumber } from '../utils/helpers';

export interface CreateOrderData {
  userId: string;
  items: { product: string; variant?: string; quantity: number }[];
  shippingAddress: {
    fullName: string;
    phone: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: string;
  couponCode?: string;
  notes?: string;
}

export class OrderService {
  static async create(data: CreateOrderData): Promise<IOrder> {
    const orderItems: IOrderItem[] = [];
    let subtotal = 0;

    for (const item of data.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new NotFoundError(`Product ${item.product}`);
      }

      if (!product.isActive) {
        throw new BadRequestError(`Product "${product.name}" is no longer available`);
      }

      let itemPrice: number;
      let itemStock: number;
      let itemName: string = product.name;
      let itemImage: string = product.thumbnail || '';

      if (item.variant) {
        const variant = product.variants.find((v) => v._id && v._id.toString() === item.variant);
        if (!variant) {
          throw new NotFoundError(`Variant ${item.variant}`);
        }
        if (variant.stock < item.quantity) {
          throw new BadRequestError(`Insufficient stock for ${product.name} (${variant.size}/${variant.color})`);
        }
        // The admin panel no longer stores a per-variant price — the
        // product-level price always applies, so a price edit can never
        // leave a stale variant price behind.
        itemPrice = product.price > 0 ? product.price : variant.price;
        itemStock = variant.stock;
        itemName = variant.size
          ? `${product.name} - ${variant.size}`
          : product.name;
        itemImage = variant.image || product.thumbnail || '';
      } else {
        const totalStock = product.variants.length > 0
          ? product.variants.reduce((sum, v) => sum + v.stock, 0)
          : 0;
        if (totalStock > 0 && totalStock < item.quantity) {
          throw new BadRequestError(`Insufficient stock for ${product.name}`);
        }
        itemPrice = product.price;
        itemStock = totalStock;
      }

      if (itemPrice * item.quantity <= 0) {
        throw new BadRequestError(`Invalid price for ${itemName}`);
      }

      orderItems.push({
        product: product._id,
        variant: item.variant as any,
        name: itemName,
        price: itemPrice,
        quantity: item.quantity,
        image: itemImage,
      });

      subtotal += itemPrice * item.quantity;
    }

    let discount = 0;
    let couponId: string | undefined;

    if (data.couponCode) {
      const coupon = await Coupon.findOne({
        code: data.couponCode.toUpperCase(),
        isActive: true,
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

      if (coupon.minPurchase && subtotal < coupon.minPurchase) {
        throw new BadRequestError(`Minimum purchase of $${coupon.minPurchase} required`);
      }

      if (coupon.discountType === 'percentage') {
        discount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else if (coupon.discountType === 'fixed') {
        discount = Math.min(coupon.discountValue, subtotal);
      }

      coupon.usedCount += 1;
      await coupon.save();
      couponId = coupon._id.toString();
    }

    const shipping = 0; // Shipping is completely free
    const total = Math.max(0, Math.round((subtotal - discount + shipping) * 100) / 100);

    const order = await Order.create({
      user: data.userId,
      orderNumber: generateOrderNumber(),
      items: orderItems,
      shippingAddress: data.shippingAddress,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      shipping,
      total,
      coupon: couponId,
      notes: data.notes,
    });

    // Deduct stock
    for (const item of data.items) {
      if (item.variant) {
        // Clamp at zero so a variant can never hold negative stock.
        const prod = await Product.findById(item.product);
        const v = prod?.variants.find((x: any) => String(x._id) === String(item.variant));
        if (prod && v) {
          const next = Math.max(0, (Number(v.stock) || 0) - (Number(item.quantity) || 0));
          await Product.findByIdAndUpdate(
            item.product,
            { $set: { 'variants.$[elem].stock': next } },
            { arrayFilters: [{ 'elem._id': v._id }] }
          );
        }
      } else {
        // No specific variant chosen — deduct across variants that have stock
        // (oldest first) instead of blindly hitting the first variant.
        const prod = await Product.findById(item.product);
        let remaining = Number(item.quantity) || 0;
        if (prod && prod.variants && prod.variants.length > 0) {
          for (const v of prod.variants) {
            if (remaining <= 0) break;
            const take = Math.min(v.stock, remaining);
            if (take <= 0) continue;
            await Product.findByIdAndUpdate(item.product, {
              $inc: { 'variants.$[elem].stock': -take },
            }, {
              arrayFilters: [{ 'elem._id': v._id }],
            });
            remaining -= take;
          }
        }
      }
    }

    // Clear user's cart
    await Cart.findOneAndDelete({ user: data.userId });

    // Create notification
    await Notification.create({
      user: data.userId,
      type: 'order',
      title: 'Order Placed Successfully',
      message: `Your order #${order.orderNumber} has been placed successfully.`,
      data: { orderId: order._id, orderNumber: order.orderNumber },
    });

    return order;
  }

  /**
   * Guest checkout — no login required. Prices are read from the DB
   * (never trusted from the client). Creates an isGuest order.
   */
  static async createGuest(data: {
    items: { product: string; variant?: string; quantity: number }[];
    shippingAddress: {
      fullName: string;
      phone: string;
      address1: string;
      address2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    paymentMethod: string;
    guestEmail?: string;
    notes?: string;
  }): Promise<IOrder> {
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new BadRequestError('Cart items are required');
    }

    const orderItems: IOrderItem[] = [];
    let subtotal = 0;

    for (const item of data.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new NotFoundError(`Product ${item.product}`);
      }
      if (!product.isActive) {
        throw new BadRequestError(`Product "${product.name}" is no longer available`);
      }

      const quantity = Math.max(1, Math.min(99, Number(item.quantity) || 1));
      let itemName = product.name;
      let itemImage = product.thumbnail || '';

      // Per-variant stock: when the customer picked a size, that exact
      // variant's stock is validated and deducted. Otherwise fall back to
      // the product's total variant stock.
      if (item.variant) {
        const variant = product.variants.find(
          (v) => v._id && v._id.toString() === item.variant
        );
        if (!variant) {
          throw new NotFoundError(`Variant ${item.variant}`);
        }
        if (variant.stock < quantity) {
          throw new BadRequestError(
            `Insufficient stock for ${product.name}${variant.size ? ` (${variant.size})` : ''}`
          );
        }
        if (variant.size) {
          itemName = `${product.name} - ${variant.size}`;
        }
        itemImage = variant.image || product.thumbnail || '';
      } else {
        const totalStock = product.variants.length > 0
          ? product.variants.reduce((sum, v) => sum + v.stock, 0)
          : 0;
        if (totalStock > 0 && totalStock < quantity) {
          throw new BadRequestError(`Insufficient stock for ${product.name}`);
        }
      }

      if (product.price * quantity <= 0) {
        throw new BadRequestError(`Invalid price for ${product.name}`);
      }

      orderItems.push({
        product: product._id,
        variant: item.variant as any,
        name: itemName,
        price: product.price,
        quantity,
        image: itemImage,
      });
      subtotal += product.price * quantity;
    }

    const shipping = 0; // Shipping is completely free
    const total = Math.max(0, Math.round((subtotal + shipping) * 100) / 100);

    const order = await Order.create({
      user: null,
      isGuest: true,
      guestEmail: data.guestEmail,
      orderNumber: generateOrderNumber(),
      items: orderItems,
      shippingAddress: data.shippingAddress,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      subtotal: Math.round(subtotal * 100) / 100,
      discount: 0,
      shipping,
      total,
      notes: data.notes,
    });

    // Deduct stock — from the exact variant the customer selected, else
    // spread across variants that actually have stock (oldest first).
    for (const item of data.items) {
      if (item.variant) {
        // Clamp at zero so a variant can never hold negative stock.
        const prod = await Product.findById(item.product);
        const v = prod?.variants.find((x: any) => String(x._id) === String(item.variant));
        if (prod && v) {
          const next = Math.max(0, (Number(v.stock) || 0) - (Number(item.quantity) || 0));
          await Product.findByIdAndUpdate(
            item.product,
            { $set: { 'variants.$[elem].stock': next } },
            { arrayFilters: [{ 'elem._id': v._id }] }
          );
        }
      } else {
        const prod = await Product.findById(item.product);
        if (prod && prod.variants && prod.variants.length > 0) {
          let remaining = item.quantity;
          for (const v of prod.variants) {
            if (remaining <= 0) break;
            if (v.stock <= 0) continue;
            const take = Math.min(v.stock, remaining);
            await Product.findOneAndUpdate(
              { _id: prod._id, 'variants._id': v._id },
              { $inc: { 'variants.$[elem].stock': -take } },
              { arrayFilters: [{ 'elem._id': v._id }] }
            );
            remaining -= take;
          }
        }
      }
    }

    return order;
  }

  static async getAll(query: {
    page?: string;
    limit?: string;
    sort?: string;
    search?: string;
    status?: string;
    paymentStatus?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page, limit, skip } = parsePagination(query);
    const sort = parseSort(query.sort);

    const filter: Record<string, any> = {};

    if (query.userId) filter.user = query.userId;
    if (query.status) filter.orderStatus = query.status;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
    if (query.search) filter.orderNumber = new RegExp(query.search, 'i');

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .populate('coupon', 'code discountType discountValue')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return {
      data: orders,
      pagination: buildPaginationResponse(total, page, limit),
    };
  }

  static async getById(id: string): Promise<IOrder> {
    const order = await Order.findById(id)
      .populate('user', 'name email phone')
      .populate('coupon', 'code discountType discountValue')
      .populate({
        path: 'items.product',
        select: 'name slug thumbnail images price',
      });

    if (!order) {
      throw new NotFoundError('Order');
    }

    return order;
  }

  static async getByOrderNumber(orderNumber: string): Promise<IOrder> {
    const order = await Order.findOne({ orderNumber })
      .populate('user', 'name email phone')
      .populate('coupon', 'code discountType discountValue');

    if (!order) {
      throw new NotFoundError('Order');
    }

    return order;
  }

  static async updateStatus(id: string, status: string, trackingNumber?: string, shippingCarrier?: string): Promise<IOrder> {
    const order = await Order.findById(id);
    if (!order) {
      throw new NotFoundError('Order');
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError(`Invalid status: ${status}`);
    }

    order.orderStatus = status as any;

    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (shippingCarrier) order.shippingCarrier = shippingCarrier;

    if (status === 'cancelled') {
      // Restore stock
      for (const item of order.items) {
        if (item.variant) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { 'variants.$[elem].stock': item.quantity },
          }, {
            arrayFilters: [{ 'elem._id': item.variant }],
          });
        }
      }
    }

    await order.save();

    if (order.user) {
      await Notification.create({
        user: order.user,
        type: 'status',
        title: 'Order Status Updated',
        message: `Your order #${order.orderNumber} status has been updated to ${status}.`,
        data: { orderId: order._id, orderNumber: order.orderNumber },
      });
    }

    return order;
  }

  static async updatePaymentStatus(id: string, paymentStatus: string): Promise<IOrder> {
    const order = await Order.findById(id);
    if (!order) {
      throw new NotFoundError('Order');
    }

    const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      throw new BadRequestError(`Invalid payment status: ${paymentStatus}`);
    }

    order.paymentStatus = paymentStatus as any;
    await order.save();

    if (order.user) {
      await Notification.create({
        user: order.user,
        type: 'status',
        title: 'Payment Status Updated',
        message: `Your order #${order.orderNumber} payment status has been updated to ${paymentStatus}.`,
        data: { orderId: order._id, orderNumber: order.orderNumber },
      });
    }

    return order;
  }

  static async cancel(id: string, userId: string): Promise<IOrder> {
    const order = await Order.findOne({ _id: id, user: userId });
    if (!order) {
      throw new NotFoundError('Order');
    }

    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      throw new BadRequestError('Order cannot be cancelled at this stage');
    }

    order.orderStatus = 'cancelled';
    await order.save();

    // Restore stock
    for (const item of order.items) {
      if (item.variant) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { 'variants.$[elem].stock': item.quantity },
        }, {
          arrayFilters: [{ 'elem._id': item.variant }],
        });
      }
    }

    await Notification.create({
      user: userId,
      type: 'order',
      title: 'Order Cancelled',
      message: `Your order #${order.orderNumber} has been cancelled.`,
      data: { orderId: order._id, orderNumber: order.orderNumber },
    });

    return order;
  }

  static async getUserOrders(userId: string, query: { page?: string; limit?: string; sort?: string }) {
    const { page, limit, skip } = parsePagination(query);
    const sort = parseSort(query.sort);

    const filter = { user: userId };

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('coupon', 'code discountType discountValue')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return {
      data: orders,
      pagination: buildPaginationResponse(total, page, limit),
    };
  }
}
