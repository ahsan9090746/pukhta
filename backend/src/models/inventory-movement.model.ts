import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInventoryMovement extends Document {
  product: mongoose.Types.ObjectId;
  variant?: mongoose.Types.ObjectId;
  type: 'purchase' | 'adjustment' | 'sale' | 'return';
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string;
  notes?: string;
  performedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variant: {
      type: Schema.Types.ObjectId,
    },
    type: {
      type: String,
      enum: ['purchase', 'adjustment', 'sale', 'return'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
      min: 0,
    },
    newStock: {
      type: Number,
      required: true,
      min: 0,
    },
    reference: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, maxlength: [500, 'Notes cannot exceed 500 characters'] },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

inventoryMovementSchema.index({ product: 1, createdAt: -1 });
inventoryMovementSchema.index({ variant: 1 });
inventoryMovementSchema.index({ type: 1 });
inventoryMovementSchema.index({ performedBy: 1 });

export const InventoryMovement: Model<IInventoryMovement> = mongoose.model<IInventoryMovement>(
  'InventoryMovement',
  inventoryMovementSchema
);
