import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReturnItem {
  _id?: mongoose.Types.ObjectId;
  orderItem: mongoose.Types.ObjectId;
  quantity: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface IReturnRefund extends Document {
  order: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  items: IReturnItem[];
  refundAmount: number;
  refundStatus: 'pending' | 'approved' | 'rejected' | 'completed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const returnItemSchema = new Schema<IReturnItem>(
  {
    orderItem: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { _id: true }
);

const returnRefundSchema = new Schema<IReturnRefund>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [returnItemSchema],
    refundAmount: {
      type: Number,
      required: true,
      min: [0, 'Refund amount cannot be negative'],
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  { timestamps: true }
);

returnRefundSchema.index({ order: 1 });
returnRefundSchema.index({ user: 1 });
returnRefundSchema.index({ refundStatus: 1 });
returnRefundSchema.index({ createdAt: -1 });

export const ReturnRefund: Model<IReturnRefund> = mongoose.model<IReturnRefund>(
  'ReturnRefund',
  returnRefundSchema
);
