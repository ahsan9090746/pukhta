import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'super-admin' | 'admin' | 'staff' | 'customer';
  avatar?: string;
  phone?: string;
  isVerified: boolean;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  refreshToken?: string;
  passwordResetToken?: string;
  passwordResetExpire?: Date;
  emailVerificationToken?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['super-admin', 'admin', 'staff', 'customer'],
      default: 'customer',
    },
    avatar: { type: String, default: '' },
    phone: { type: String, trim: true, default: '' },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    refreshToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpire: { type: Date, select: false },
    emailVerificationToken: { type: String, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isDeleted: 1, isActive: 1 });
userSchema.index({ isDeleted: 1, createdAt: -1 });

// Emails are unique among accounts that still exist. A soft-deleted account
// releases its email so the same person (or a re-created staff member) can
// register again with it. Synced in config/db.ts via syncIndexes().
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function (): string {
  return jwt.sign(
    { id: this._id.toString(), email: this.email, role: this.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpire as any }
  );
};

userSchema.methods.generateRefreshToken = function (): string {
  return jwt.sign(
    { id: this._id.toString() },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpire as any }
  );
};

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
