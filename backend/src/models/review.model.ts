import mongoose, { Schema, Document, Model } from 'mongoose';
import { NOT_DELETED } from '../utils/softDelete';

export interface IReview extends Document {
  user?: mongoose.Types.ObjectId;
  /** Guest reviewers (no account): display name + email used for de-duplication. */
  guestName: string;
  guestEmail: string;
  /**
   * The product a customer review belongs to. Admin testimonials (`isFake`)
   * are NOT tied to any product — they only feed the home page section.
   */
  product?: mongoose.Types.ObjectId;
  /**
   * Legacy field: bulk fake reviews used to list every affected product here.
   * Nothing writes it any more (fake reviews are product-independent); kept so
   * rows created by the old flow still load.
   */
  products: mongoose.Types.ObjectId[];
  rating: number;
  title: string;
  comment: string;
  images: string[];
  isVerified: boolean;
  isFake: boolean;
  fakeName: string;
  fakeAvatar: string;
  helpful: number;
  helpfulUsers: mongoose.Types.ObjectId[];
  status: 'pending' | 'approved' | 'rejected';
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    guestName: {
      type: String,
      default: '',
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    guestEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      maxlength: [200, 'Email cannot exceed 200 characters'],
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      // Optional: admin testimonials (`isFake`) have no product at all.
      required: false,
    },
    // Legacy bulk-fake-review product list — no longer written. Fake reviews
    // are pure home-page testimonials and never touch product ratings.
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        default: [],
      },
    ],
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    images: [{ type: String }],
    isVerified: { type: Boolean, default: false },
    isFake: { type: Boolean, default: false },
    fakeName: { type: String, default: '', trim: true },
    fakeAvatar: { type: String, default: '' },
    helpful: { type: Number, default: 0, min: 0 },
    helpfulUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// One review per account per product — partial so guest reviews (no user)
// never collide with each other on the unique index, and so a review that the
// admin soft-deleted no longer blocks the customer from reviewing again.
// `isFake` rows are excluded too: a bulk fake review points `product` at the
// first affected product, so two bulk reviews from the same admin would
// otherwise collide on the same (user, product) pair.
reviewSchema.index(
  { user: 1, product: 1 },
  {
    unique: true,
    partialFilterExpression: {
      user: { $exists: true },
      isDeleted: false,
      isFake: { $eq: false },
    },
  }
);
reviewSchema.index({ guestEmail: 1, product: 1 });
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ products: 1, status: 1 });
reviewSchema.index({ createdAt: -1 });

reviewSchema.statics.calcAverageRating = async function (productId: mongoose.Types.ObjectId | string) {
  // Mongoose never casts aggregation pipelines, and most callers pass raw
  // string ids (e.g. req.body.productId) — without an explicit cast the
  // $match silently returns nothing and product stats stay at 0 forever.
  const targetId =
    productId instanceof mongoose.Types.ObjectId
      ? productId
      : new mongoose.Types.ObjectId(String(productId));

  const stats = await this.aggregate([
    // Only genuine customer reviews count towards a product's rating —
    // admin testimonials (`isFake`) are home-page only. Soft-deleted reviews
    // are excluded as well.
    {
      $match: {
        $or: [{ product: targetId }, { products: targetId }],
        isFake: { $ne: true },
        status: 'approved',
        ...NOT_DELETED,
      },
    },
    {
      // Group by a constant: the $match above is already scoped to the
      // requested product, and bulk fake rows carry `product` = their first
      // affected product — grouping by `$product` would bucket them under a
      // different id and stats[0] would then update the wrong product.
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  const Product = mongoose.model('Product');
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(targetId, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      numReviews: stats[0].numReviews,
    });
  } else {
    await Product.findByIdAndUpdate(targetId, {
      averageRating: 0,
      numReviews: 0,
    });
  }
};

export const Review: Model<IReview> = mongoose.model<IReview>('Review', reviewSchema);
