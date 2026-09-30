import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Types of trackable analytics events.
 * - page_view:       any storefront page (recorded by the client tracker)
 * - add_to_cart:     item added to cart
 * - checkout_started: visitor reached the checkout flow
 * - purchase:        order placed successfully
 */
export type SiteVisitType = 'page_view' | 'add_to_cart' | 'checkout_started' | 'purchase';

export interface ISiteVisit extends Document {
  type: SiteVisitType;
  /** Anonymous visitor identifier (persists across sessions via localStorage) */
  visitorId: string;
  /** Session identifier (30-minute sliding window on the client) */
  sessionId: string;
  /** Dedupe key: path for page views, productId for add_to_cart, type for funnel stages */
  key: string;
  path: string;
  productId?: mongoose.Types.ObjectId | null;
  device: 'desktop' | 'mobile' | 'tablet' | 'other';
  browser?: string;
  ip?: string;
  userAgent?: string;
  user?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const siteVisitSchema = new Schema<ISiteVisit>(
  {
    type: {
      type: String,
      required: true,
      enum: ['page_view', 'add_to_cart', 'checkout_started', 'purchase'],
    },
    visitorId: {
      type: String,
      required: true,
      trim: true,
    },
    sessionId: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      trim: true,
      default: '',
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'other'],
      default: 'other',
    },
    browser: { type: String, trim: true, default: '' },
    ip: { type: String, trim: true, default: '' },
    userAgent: { type: String, trim: true, default: '' },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// One event per session/type/key — used with upsert so repeats are deduped server-side
siteVisitSchema.index({ sessionId: 1, type: 1, key: 1 }, { unique: true });
siteVisitSchema.index({ type: 1, createdAt: -1 });
siteVisitSchema.index({ createdAt: -1 });
siteVisitSchema.index({ visitorId: 1, createdAt: -1 });
siteVisitSchema.index({ productId: 1 });

export const SiteVisit: Model<ISiteVisit> = mongoose.model<ISiteVisit>(
  'SiteVisit',
  siteVisitSchema
);