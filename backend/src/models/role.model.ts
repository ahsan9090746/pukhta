import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    permissions: [
      {
        type: String,
        enum: [
          'products.view',
          'products.create',
          'products.edit',
          'products.delete',
          'orders.view',
          'orders.manage',
          'customers.view',
          'customers.manage',
          'categories.manage',
          'categories.view',
          'coupons.manage',
          'banners.manage',
          'reviews.manage',
          'reviews.view',
          'inventory.manage',
          'inventory.view',
          'analytics.view',
          'settings.manage',
          'staff.manage',
          'dashboard.view',
        ],
      },
    ],
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Role: Model<IRole> = mongoose.model<IRole>('Role', roleSchema);
