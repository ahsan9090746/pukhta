import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISize extends Document {
  label: string;
  pk: string;
  eu: string;
  us: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sizeSchema = new Schema<ISize>(
  {
    label: {
      type: String,
      required: [true, 'Size label is required'],
      trim: true,
      unique: true,
    },
    pk: { type: String, required: true, trim: true },
    eu: { type: String, required: true, trim: true },
    us: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

sizeSchema.index({ isActive: 1, sortOrder: 1 });

export const Size: Model<ISize> = mongoose.model<ISize>('Size', sizeSchema);
