import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { SiteVisit, SiteVisitType } from '../models/site-visit.model';
import { Order } from '../models/order.model';
import { catchAsync } from '../utils/catchAsync';
import { BadRequestError } from '../utils/AppError';
import {
  recordSiteVisit,
  getVisitorContext,
  parseDevice,
  parseBrowser,
} from '../middleware/analytics.middleware';

const VALID_TYPES: SiteVisitType[] = ['page_view', 'add_to_cart', 'checkout_started', 'purchase'];

/** Clamp ?days= into a sane 1-90 range, defaulting to 7 */
const parseDays = (raw: unknown): number => {
  const days = parseInt(String(raw), 10);
  if (Number.isNaN(days)) return 7;
  return Math.min(Math.max(days, 1), 90);
};

/** Start of `days` days ago (today included), at local midnight */
const getRangeStart = (days: number): Date => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
};

const cleanPath = (value: unknown): string =>
  typeof value === 'string' ? value.slice(0, 300) : '';

export class AnalyticsController {
  /**
   * Public endpoint used by the storefront client tracker.
   * Body: { type, path?, productId? }
   * Identity: x-visitor-id / x-session-id headers (falls back to cookies/hash).
   */
  static trackEvent = catchAsync(async (req: Request, res: Response) => {
    const type = req.body?.type as SiteVisitType;

    if (!VALID_TYPES.includes(type)) {
      throw new BadRequestError('Invalid analytics event type');
    }

    let key: string;
    let path = '';
    let productId: string | null = null;

    if (type === 'page_view') {
      path = cleanPath(req.body.path) || '/';
      key = path;
    } else if (type === 'add_to_cart') {
      productId = typeof req.body.productId === 'string' ? req.body.productId : null;
      if (!productId || !Types.ObjectId.isValid(productId)) {
        throw new BadRequestError('A valid productId is required');
      }
      path = cleanPath(req.body.path);
      key = productId;
    } else {
      // checkout_started / purchase — one event per session (key = type)
      key = type;
      path = cleanPath(req.body.path);
    }

    const userAgent = req.get('user-agent') || '';
    const { visitorId, sessionId } = getVisitorContext(req);

    await recordSiteVisit({
      type,
      sessionId,
      visitorId,
      key,
      path,
      productId,
      device: parseDevice(userAgent),
      browser: parseBrowser(userAgent),
      ip: req.ip,
      userAgent,
      user: req.user?._id,
    });

    res.status(202).json({ success: true, data: { tracked: true } });
  });

  /** Range summary: visitors, page views, sessions, orders, revenue, funnel endpoints */
  static getSummary = catchAsync(async (req: Request, res: Response) => {
    const days = parseDays(req.query.days);
    const start = getRangeStart(days);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const timeFilter = { createdAt: { $gte: start } };

    const [identityAgg, pageViews, orderAgg, pendingOrders, onlineAgg, checkouts, purchases] =
      await Promise.all([
        SiteVisit.aggregate([
          { $match: timeFilter },
          {
            $group: {
              _id: null,
              visitors: { $addToSet: '$visitorId' },
              sessions: { $addToSet: '$sessionId' },
            },
          },
          {
            $project: {
              _id: 0,
              visitors: { $size: '$visitors' },
              sessions: { $size: '$sessions' },
            },
          },
        ]),
        SiteVisit.countDocuments({ type: 'page_view', ...timeFilter }),
        Order.aggregate([
          { $match: { paymentStatus: 'paid', ...timeFilter } },
          { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        ]),
        Order.countDocuments({ orderStatus: 'pending' }),
        SiteVisit.aggregate([
          { $match: { createdAt: { $gte: fiveMinutesAgo } } },
          { $group: { _id: null, online: { $addToSet: '$visitorId' } } },
          { $project: { _id: 0, online: { $size: '$online' } } },
        ]),
        SiteVisit.countDocuments({ type: 'checkout_started', ...timeFilter }),
        SiteVisit.countDocuments({ type: 'purchase', ...timeFilter }),
      ]);

    const visitors = identityAgg[0]?.visitors || 0;
    const sessions = identityAgg[0]?.sessions || 0;

    res.status(200).json({
      success: true,
      data: {
        visitors,
        sessions,
        pageViews,
        orders: orderAgg[0]?.orders || 0,
        revenue: orderAgg[0]?.revenue || 0,
        pendingOrders,
        checkouts,
        purchases,
        onlineNow: onlineAgg[0]?.online || 0,
        conversionRate: sessions
          ? Math.round((purchases / sessions) * 10000) / 100
          : 0,
      },
    });
  });

  /** Daily visitor/page-view/session trend for the last `days` days */
  static getVisitorTrends = catchAsync(async (req: Request, res: Response) => {
    const days = parseDays(req.query.days);
    const start = getRangeStart(days);

    const trend = await SiteVisit.aggregate([
      { $match: { type: 'page_view', createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          visitorSet: { $addToSet: '$visitorId' },
          sessionSet: { $addToSet: '$sessionId' },
          pageViews: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          visitors: { $size: '$visitorSet' },
          sessions: { $size: '$sessionSet' },
          pageViews: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    res.status(200).json({ success: true, data: { trend } });
  });

  /** Most visited storefront pages */
  static getTopPages = catchAsync(async (req: Request, res: Response) => {
    const days = parseDays(req.query.days);
    const limit = Math.min(parseInt(String(req.query.limit), 10) || 10, 50);
    const start = getRangeStart(days);

    const pages = await SiteVisit.aggregate([
      { $match: { type: 'page_view', createdAt: { $gte: start } } },
      {
        $group: {
          _id: '$path',
          views: { $sum: 1 },
          visitorSet: { $addToSet: '$visitorId' },
        },
      },
      {
        $project: {
          _id: 0,
          path: '$_id',
          views: 1,
          visitors: { $size: '$visitorSet' },
        },
      },
      { $sort: { views: -1 } },
      { $limit: limit },
    ]);

    res.status(200).json({ success: true, data: { pages } });
  });

  /** Best-selling products (paid orders) in range */
  static getTopProducts = catchAsync(async (req: Request, res: Response) => {
    const days = parseDays(req.query.days);
    const limit = Math.min(parseInt(String(req.query.limit), 10) || 10, 50);
    const start = getRangeStart(days);

    const products = await Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: start } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { unitsSold: -1 } },
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
          unitsSold: 1,
          revenue: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, data: { products } });
  });

  /** Revenue/units grouped by product category in range */
  static getSalesByCategory = catchAsync(async (req: Request, res: Response) => {
    const days = parseDays(req.query.days);
    const start = getRangeStart(days);

    const categories = await Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: start } } },
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

    res.status(200).json({ success: true, data: { categories } });
  });

  /** Simple conversion funnel: product views -> add to cart -> checkout -> purchase */
  static getConversionFunnel = catchAsync(async (req: Request, res: Response) => {
    const days = parseDays(req.query.days);
    const start = getRangeStart(days);
    const timeFilter = { createdAt: { $gte: start } };

    const [views, addToCart, checkout, purchase] = await Promise.all([
      SiteVisit.countDocuments({ type: 'page_view', path: /^\/product(\/|$)/, ...timeFilter }),
      SiteVisit.countDocuments({ type: 'add_to_cart', ...timeFilter }),
      SiteVisit.countDocuments({ type: 'checkout_started', ...timeFilter }),
      SiteVisit.countDocuments({ type: 'purchase', ...timeFilter }),
    ]);

    res.status(200).json({
      success: true,
      data: { funnel: { views, addToCart, checkout, purchase } },
    });
  });
}