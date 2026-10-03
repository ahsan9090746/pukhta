import mongoose, { Schema, Document, Model } from 'mongoose';
import { deleteUploadedFile } from '../utils/upload';

export interface IProductVariant {
  _id?: mongoose.Types.ObjectId;
  size: string;
  color: string;
  price: number;
  stock: number;
  sku: string;
  image?: string;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  categories: mongoose.Types.ObjectId[];
  tags: string[];
  images: string[];
  altText: string;
  metaTitle: string;
  metaDescription: string;
  thumbnail: string;
  price: number;
  compareAtPrice?: number;
  costPrice: number;
  sku: string;
  variants: IProductVariant[];
  sizes: string[];
  colors: string[];
  stock: number;
  averageRating: number;
  numReviews: number;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  isFeatured: boolean;
  isNewArrival: boolean;
  discountPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

const productVariantSchema = new Schema<IProductVariant>(
  {
    size: { type: String, required: false, default: '', trim: true },
    color: { type: String, required: false, default: '', trim: true },
    price: { type: Number, required: true, min: 0, default: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, trim: true, default: '' },
    image: { type: String, default: '' },
  },
  { _id: true }
);

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [5001, 'Description cannot exceed 5001 characters'],
    },
    shortDescription: {
      type: String,
      default: '',
    },
    categories: [{
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    }],
    tags: [{ type: String, trim: true }],
    images: [{ type: String }],
    altText: { type: String, default: '', trim: true },
    metaTitle: { type: String, default: '', trim: true, maxlength: 60 },
    metaDescription: { type: String, default: '', trim: true, maxlength: 160 },
    thumbnail: { type: String, default: '' },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare at price cannot be negative'],
    },
    costPrice: {
      type: Number,
      default: 0,
      min: [0, 'Cost price cannot be negative'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
    },
    variants: [productVariantSchema],
    sizes: [{ type: String }],
    colors: [{ type: String }],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ categories: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isDeleted: 1, isActive: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isNewArrival: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ isDeleted: 1, isActive: 1, categories: 1 });
productSchema.index({ isDeleted: 1, isActive: 1, isFeatured: 1 });
productSchema.index({ isDeleted: 1, isActive: 1, isNewArrival: 1 });
productSchema.index({ isDeleted: 1, isActive: 1, averageRating: -1 });

// Slug + SKU stay unique — but only among products that still exist. Without
// the partial filter a soft-deleted product would keep its slug/SKU reserved
// forever, so re-creating a product with the same name would fail with a
// duplicate-key error. Synced in config/db.ts via syncIndexes().
productSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
productSchema.index(
  { sku: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

productSchema.virtual('stock').get(function () {
  if (this.variants && this.variants.length > 0) {
    return this.variants.reduce((total, variant) => total + variant.stock, 0);
  }
  return 0;
});

productSchema.virtual('discountPercentage').get(function () {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

productSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  }
  next();
});

// PERMANENT-delete file cleanup: when a product is actually removed from the
// DB (findOneAndDelete / deleteOne — NOT the soft delete), its uploaded image
// files are deleted from the uploads folder automatically.
const deleteProductImageFiles = (doc: { images?: string[] } | null) => {
  (doc?.images || []).forEach((img) => deleteUploadedFile(img));
};

productSchema.post('findOneAndDelete', function (doc) {
  deleteProductImageFiles(doc);
});

productSchema.pre('deleteOne', { document: false, query: true }, async function () {
  (this as any).__deletedDoc = await this.model.findOne(this.getFilter()).lean();
});

productSchema.post('deleteOne', { document: false, query: true }, function () {
  deleteProductImageFiles((this as any).__deletedDoc);
});

export const Product: Model<IProduct> = mongoose.model<IProduct>('Product', productSchema);
