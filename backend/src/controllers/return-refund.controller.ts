import { Request, Response } from 'express';
import { ReturnRefund } from '../models/return-refund.model';
import { Order } from '../models/order.model';
import { Product } from '../models/product.model';
import { NotFoundError, BadRequestError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { parsePagination, parseSort, buildPaginationResponse } from '../utils/pagination';

export class ReturnRefundController {
  static create = catchAsync(async (req: Request, res: Response) => {
    const { orderId, items, notes } = req.body;
    const userId = req.user!._id;

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      throw new NotFoundError('Order');
    }

    if (!['delivered', 'shipped'].includes(order.orderStatus)) {
      throw new BadRequestError('Order must be delivered or shipped to request a return');
    }

    let refundAmount = 0;
    const returnItems = items.map((item: any) => {
      const orderItem = order.items.find((i) => i._id && i._id.toString() === item.orderItem);
      if (!orderItem) {
        throw new NotFoundError(`Order item ${item.orderItem}`);
      }

      if (item.quantity > orderItem.quantity) {
        throw new BadRequestError('Return quantity cannot exceed ordered quantity');
      }

      const itemRefund = orderItem.price * item.quantity;
      refundAmount += itemRefund;

      return {
        orderItem: item.orderItem,
        quantity: item.quantity,
        reason: item.reason,
        status: 'pending',
      };
    });

    const returnRefund = await ReturnRefund.create({
      order: orderId,
      user: userId,
      items: returnItems,
      refundAmount: Math.round(refundAmount * 100) / 100,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Return request submitted successfully',
      data: { returnRefund },
    });
  });

  static getAll = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as any);
    const sort = parseSort(req.query.sort as string);

    const filter: Record<string, any> = {};
    if (req.query.status) filter.refundStatus = req.query.status;
    if (req.query.userId) filter.user = req.query.userId;

    const [returns, total] = await Promise.all([
      ReturnRefund.find(filter)
        .populate('user', 'name email')
        .populate('order', 'orderNumber total')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      ReturnRefund.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: returns,
        pagination: buildPaginationResponse(total, page, limit),
      },
    });
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const returnRefund = await ReturnRefund.findById(req.params.id)
      .populate('user', 'name email')
      .populate('order', 'orderNumber items total');

    if (!returnRefund) {
      throw new NotFoundError('Return request');
    }

    res.status(200).json({
      success: true,
      data: { returnRefund },
    });
  });

  static updateStatus = catchAsync(async (req: Request, res: Response) => {
    const { status, itemStatuses } = req.body;

    const returnRefund = await ReturnRefund.findById(req.params.id);
    if (!returnRefund) {
      throw new NotFoundError('Return request');
    }

    if (itemStatuses && Array.isArray(itemStatuses)) {
      itemStatuses.forEach((update: any) => {
        const item = returnRefund.items.find((i) => i._id && i._id.toString() === update.itemId);
        if (item) {
          item.status = update.status;
        }
      });
    }

    if (status) {
      returnRefund.refundStatus = status;
    }

    await returnRefund.save();

    if (status === 'completed') {
      for (const item of returnRefund.items) {
        if (item.status === 'approved') {
          const order = await Order.findById(returnRefund.order);
          if (order) {
            const orderItem = order.items.find((i) => i._id && i._id.toString() === item.orderItem.toString());
            if (orderItem) {
              if (orderItem.variant) {
                await Product.findByIdAndUpdate(orderItem.product, {
                  $inc: { 'variants.$[elem].stock': item.quantity },
                }, {
                  arrayFilters: [{ 'elem._id': orderItem.variant }],
                });
              } else {
                await Product.findByIdAndUpdate(orderItem.product, {
                  $inc: { 'variants.0.stock': item.quantity },
                });
              }
            }
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Return status updated',
      data: { returnRefund },
    });
  });

  static getMyReturns = catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as any);
    const sort = parseSort(req.query.sort as string);

    const filter = { user: req.user!._id };

    const [returns, total] = await Promise.all([
      ReturnRefund.find(filter)
        .populate('order', 'orderNumber total')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      ReturnRefund.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: returns,
        pagination: buildPaginationResponse(total, page, limit),
      },
    });
  });
}
