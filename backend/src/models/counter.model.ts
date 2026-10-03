import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICounter extends Document {
  name: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 9000 },
});

export const Counter: Model<ICounter> = mongoose.model<ICounter>('Counter', counterSchema);
