import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShort extends Document {
  video: string; // "/uploads/videos/<filename>"
  category?: mongoose.Types.ObjectId | null;
  product?: mongoose.Types.ObjectId | null;
  sortOrder: number;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const shortSchema = new Schema<IShort>(
  {
    video: {
      type: String,
      required: [true, 'Video is required'],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    sortOrder: {
      type: Number,
      default: 0,
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

shortSchema.index({ sortOrder: 1 });
shortSchema.index({ isDeleted: 1, sortOrder: 1 });

export const Short: Model<IShort> = mongoose.model<IShort>('Short', shortSchema);