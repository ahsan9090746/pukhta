import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  subtitle: string;
  image: string;
  mobileImage: string;
  altText: string;
  link: string;
  position: 'hero' | 'middle' | 'footer';
  isActive: boolean;
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
    mobileImage: { type: String, default: '' },
    altText: { type: String, default: '', trim: true },
    link: { type: String, trim: true, default: '' },
    position: {
      type: String,
      enum: ['hero', 'middle', 'footer'],
      default: 'hero',
    },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

bannerSchema.index({ position: 1, isActive: 1 });
bannerSchema.index({ sortOrder: 1 });

export const Banner: Model<IBanner> = mongoose.model<IBanner>('Banner', bannerSchema);
