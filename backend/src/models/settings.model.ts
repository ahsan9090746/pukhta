import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  storeName: string;
  storeDescription: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  storeLogo: string;
  /** Logo for light backgrounds (light-mode header) */
  logoLight: string;
  /** Logo for dark backgrounds (dark-mode header/footer) */
  logoDark: string;
  currency: string;
  freeShippingThreshold: number;
  shippingCost: number;
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
    pinterest: string;
    linkedin: string;
    whatsapp: string;
    tiktok: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    storeName: { type: String, default: 'Footware', trim: true, maxlength: 200 },
    storeDescription: { type: String, default: '', trim: true, maxlength: 500 },
    storeEmail: { type: String, default: '', trim: true },
    storePhone: { type: String, default: '', trim: true },
    storeAddress: { type: String, default: '', trim: true },
    storeLogo: { type: String, default: '' },
    // Theme-aware logo variants — `storeLogo` remains the fallback for both
    logoLight: { type: String, default: '' },
    logoDark: { type: String, default: '' },
    currency: { type: String, default: 'PKR', trim: true },
    freeShippingThreshold: { type: Number, default: 0, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    socialMedia: {
      facebook: { type: String, default: '', trim: true },
      instagram: { type: String, default: '', trim: true },
      twitter: { type: String, default: '', trim: true },
      youtube: { type: String, default: '', trim: true },
      pinterest: { type: String, default: '', trim: true },
      linkedin: { type: String, default: '', trim: true },
      whatsapp: { type: String, default: '', trim: true },
      tiktok: { type: String, default: '', trim: true },
    },
    seo: {
      metaTitle: { type: String, default: '', trim: true, maxlength: 200 },
      metaDescription: { type: String, default: '', trim: true, maxlength: 500 },
      keywords: [{ type: String, trim: true }],
    },
  },
  { timestamps: true }
);

export const Settings: Model<ISettings> = mongoose.model<ISettings>('Settings', settingsSchema);
