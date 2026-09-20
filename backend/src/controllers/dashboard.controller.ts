import { Request, Response } from 'express';
import { Order } from '../models/order.model';
import { User } from '../models/user.model';
import { Product } from '../models/product.model';
import { catchAsync } from '../utils/catchAsync';

export class DashboardController {
  static getStats = catchAsync(async (req: Request, res: Response) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalOrders,
      ordersToday,
      ordersThisMonth,
      totalRevenue,
      revenueToday,
      revenueThisMonth,
      totalUsers,
      usersToday,
      totalProducts,
      pendingOrders,
      lowStockProducts,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfDay } }),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      Product.countDocuments(),
      Order.countDocuments({ orderStatus: 'pending' }),
      Product.countDocuments({
        $expr: {
          $lt: [
            { $sum: '$variants.stock' },
            10,
          ],
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          today: ordersToday,
          thisMonth: ordersThisMonth,
          pending: pendingOrders,
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          today: revenueToday[0]?.total || 0,
          thisMonth: revenueThisMonth[0]?.total || 0,
        },
        users: {
          total: totalUsers,
          today: usersToday,
        },
        products: {
          total: totalProducts,
          lowStock: lowStockProducts,
        },
      },
    });
  });

  static getRevenueChart = catchAsync(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const revenueData = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: { chart: revenueData },
    });
  });

  static getTopProducts = catchAsync(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;

    const topProducts = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 1,
          name: '$product.name',
          slug: '$product.slug',
          thumbnail: '$product.thumbnail',
          totalSold: 1,
          revenue: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: { products: topProducts },
    });
  });

  static getRecentOrders = catchAsync(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;

    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: { orders: recentOrders },
    });
  });

  static getOrderStatusDistribution = catchAsync(async (req: Request, res: Response) => {
    const distribution = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: { distribution },
    });
  });

  static getSalesByCategory = catchAsync(async (req: Request, res: Response) => {
    const salesByCategory = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          quantity: { $sum: '$items.quantity' },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 1,
          name: '$category.name',
          revenue: 1,
          quantity: 1,
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: { categories: salesByCategory },
    });
  });
}
