import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { deleteUploadedFile } from '../utils/upload';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description: string;
  image: string;
  altText: string;
  metaTitle: string;
  metaDescription: string;
  parent: Types.ObjectId | null;
  ancestors: Types.ObjectId[];
  level: number;
  path: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  /** Featured on the storefront home page "Shop by Category" section */
  showOnHome: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [120, 'Category name cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, trim: true, default: '' },
    image: { type: String, default: '' },
    altText: { type: String, default: '', trim: true },
    metaTitle: { type: String, default: '', trim: true, maxlength: 60 },
    metaDescription: { type: String, default: '', trim: true, maxlength: 160 },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    ancestors: [{ type: Schema.Types.ObjectId, ref: 'Category', index: true }],
    level: { type: Number, default: 0, min: 0, max: 2, index: true },
    path: { type: String, default: '', index: true },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    showOnHome: { type: Boolean, default: false, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.index({ parent: 1, sortOrder: 1 });
categorySchema.index({ level: 1, isActive: 1 });
categorySchema.index({ isDeleted: 1, isActive: 1 });

categorySchema.virtual('levelLabel').get(function (this: ICategory) {
  return ['Parent', 'Child', 'Sub-category'][this.level] || 'Sub-category';
});

categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

// PERMANENT-delete file cleanup: when a category is actually removed from the
// DB (findOneAndDelete / deleteOne — NOT the soft delete), its uploaded image
// file is deleted from the uploads folder automatically.
categorySchema.post('findOneAndDelete', function (doc) {
  deleteUploadedFile(doc?.image);
});

categorySchema.pre('deleteOne', { document: false, query: true }, async function () {
  (this as any).__deletedDoc = await this.model.findOne(this.getFilter()).lean();
});

categorySchema.post('deleteOne', { document: false, query: true }, function () {
  deleteUploadedFile((this as any).__deletedDoc?.image);
});

export const Category: Model<ICategory> = mongoose.model<ICategory>('Category', categorySchema);