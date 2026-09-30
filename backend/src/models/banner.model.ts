import mongoose, { Schema, Document, Model } from 'mongoose';
import { deleteUploadedFile } from '../utils/upload';

export interface IBanner extends Document {
  title: string;
  /** Internal label only — never rendered over the artwork on the storefront. */
  subtitle: string;
  /** Desktop / large-screen artwork (required). */
  image: string;
  /** Mobile artwork — the storefront falls back to `image` when this is empty. */
  mobileImage: string;
  altText: string;
  link: string;
  linkType: 'url' | 'product' | 'categories';
  /** Banners live in the homepage hero slider only. */
  position: 'hero';
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  startDate?: Date;
  endDate?: Date;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [300, 'Subtitle cannot exceed 300 characters'],
      default: '',
    },
    image: {
      type: String,
      required: [true, 'Image is required'],
    },
    mobileImage: { type: String, default: '', trim: true },
    altText: { type: String, default: '', trim: true },
    link: { type: String, trim: true, default: '' },
    linkType: {
      type: String,
      enum: ['url', 'product', 'categories'],
      default: 'url',
    },
    position: {
      type: String,
      enum: ['hero'],
      default: 'hero',
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },
    // Hero sort position — 1-based, unique across banners (1, 2, 3, ...)
    sortOrder: {
      type: Number,
      required: [true, 'Sort order is required'],
      min: [1, 'Sort order must start from 1'],
      default: 1,
    },
  },
  { timestamps: true }
);

bannerSchema.index({ position: 1, isActive: 1 });
// Two banners can never share the same hero slot. The partial filter keeps
// soft-deleted documents from reserving their old position.
bannerSchema.index(
  { sortOrder: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

// PERMANENT-delete file cleanup: when a banner is actually removed from the
// DB (findOneAndDelete / deleteOne — NOT the soft delete), its uploaded
// desktop + mobile image files are deleted from the uploads folder.
bannerSchema.post('findOneAndDelete', function (doc) {
  deleteUploadedFile(doc?.image);
  deleteUploadedFile(doc?.mobileImage);
});

bannerSchema.pre('deleteOne', { document: false, query: true }, async function () {
  (this as any).__deletedDoc = await this.model.findOne(this.getFilter()).lean();
});

bannerSchema.post('deleteOne', { document: false, query: true }, function () {
  deleteUploadedFile((this as any).__deletedDoc?.image);
  deleteUploadedFile((this as any).__deletedDoc?.mobileImage);
});

export const Banner: Model<IBanner> = mongoose.model<IBanner>('Banner', bannerSchema);
