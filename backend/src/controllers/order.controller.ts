import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import { catchAsync } from '../utils/catchAsync';
import { NotFoundError } from '../utils/AppError';

export class OrderController {
  /**
   * Guest checkout — no authentication required.
   * Validates items server-side and creates an isGuest order.
   */
  static createGuest = catchAsync(async (req: Request, res: Response) => {
    const items = (req.body.items ?? []).map((i: any) => ({
      product: i.productId ?? i.product,
      variant: i.variantId ?? i.variant,
      quantity: i.quantity,
    }));

    const order = await OrderService.createGuest({
      items,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
      guestEmail: req.body.guestEmail,
      notes: req.body.notes,
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: { order },
    });
  });

  /**
   * Public order tracking for guest orders (by order number).
   * Only isGuest orders are exposed, with limited fields.
   */
  static getGuestOrder = catchAsync(async (req: Request, res: Response) => {
    const order = await OrderService.getByOrderNumber(req.params.orderNumber);

    if (!order.isGuest) {
      throw new NotFoundError('Order');
    }

    res.status(200).json({
      success: true,
      data: {
        order: {
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          subtotal: order.subtotal,
          shipping: order.shipping,
          total: order.total,
          createdAt: order.createdAt,
          items: order.items.map((i) => ({
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            image: i.image,
          })),
          shippingAddress: {
            fullName: order.shippingAddress.fullName,
            city: order.shippingAddress.city,
          },
        },
      },
    });
  });

  /**
   * Public order tracking — no authentication required.
   * Accepts { orderCode?, phone? }; at least one is required
   * (also enforced by validateTrackOrder in the route).
   */
  static track = catchAsync(async (req: Request, res: Response) => {
    const orders = await OrderService.trackOrders({
      orderCode: req.body.orderCode,
      phone: req.body.phone,
    });

    if (orders.length === 0) {
      throw new NotFoundError('Order');
    }

    res.status(200).json({
      success: true,
      data: { orders },
    });
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const order = await OrderService.create({
      userId: req.user!._id.toString(),
      items: req.body.items,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
      couponCode: req.body.couponCode,
      notes: req.body.notes,
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: { order },
    });
  });

  static getAll = catchAsync(async (req: Request, res: Response) => {
    const result = await OrderService.getAll(req.query as any);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const order = await OrderService.getById(req.params.id);

    res.status(200).json({
      success: true,
      data: { order },
    });
  });

  static getByOrderNumber = catchAsync(async (req: Request, res: Response) => {
    const order = await OrderService.getByOrderNumber(req.params.orderNumber);

    res.status(200).json({
      success: true,
      data: { order },
    });
  });

  static updateStatus = catchAsync(async (req: Request, res: Response) => {
    const { status, trackingNumber, shippingCarrier } = req.body;
    const order = await OrderService.updateStatus(
      req.params.id,
      status,
      trackingNumber,
      shippingCarrier
    );

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: { order },
    });
  });

  static updatePaymentStatus = catchAsync(async (req: Request, res: Response) => {
    const { paymentStatus } = req.body;
    const order = await OrderService.updatePaymentStatus(req.params.id, paymentStatus);

    res.status(200).json({
      success: true,
      message: 'Payment status updated',
      data: { order },
    });
  });

  static cancel = catchAsync(async (req: Request, res: Response) => {
    const order = await OrderService.cancel(req.params.id, req.user!._id.toString());

    res.status(200).json({
      success: true,
      message: 'Order cancelled',
      data: { order },
    });
  });

  static getUserOrders = catchAsync(async (req: Request, res: Response) => {
    const result = await OrderService.getUserOrders(
      req.user!._id.toString(),
      req.query as any
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  });
}
