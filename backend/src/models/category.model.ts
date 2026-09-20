import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description: string;
  image: string;
  altText: string;
  parent: Types.ObjectId | null;
  ancestors: Types.ObjectId[];
  level: number;
  path: string;
  isActive: boolean;
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
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    ancestors: [{ type: Schema.Types.ObjectId, ref: 'Category', index: true }],
    level: { type: Number, default: 0, min: 0, max: 2, index: true },
    path: { type: String, default: '', index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.index({ parent: 1, sortOrder: 1 });
categorySchema.index({ level: 1, isActive: 1 });

categorySchema.virtual('levelLabel').get(function (this: ICategory) {
  return ['Parent', 'Child', 'Sub-category'][this.level] || 'Sub-category';
});

categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

export const Category: Model<ICategory> = mongoose.model<ICategory>('Category', categorySchema);