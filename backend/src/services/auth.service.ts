import crypto from 'crypto';
import { User, IUser } from '../models/user.model';
import { AppError, NotFoundError, UnauthorizedError, ConflictError, BadRequestError, ForbiddenError } from '../utils/AppError';
import { generateTokens, setTokenCookies, clearTokenCookies } from '../utils/generateTokens';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/sendEmail';
import { Response } from 'express';

export class AuthService {
  static async register(data: { name: string; email: string; password: string }, res?: Response): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const user = await User.create(data);
    const { accessToken, refreshToken } = generateTokens(user);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    await user.save({ validateBeforeSave: false });

    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch {
      // Email sending failed, but user is created
    }

    if (res) {
      setTokenCookies(res, accessToken, refreshToken);
    }

    return { user, accessToken, refreshToken };
  }

  static async login(data: { email: string; password: string }, res: Response): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const user = await User.findOne({ email: data.email }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account has been deactivated');
    }

    const isPasswordValid = await user.comparePassword(data.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const { accessToken, refreshToken } = generateTokens(user);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    setTokenCookies(res, accessToken, refreshToken);

    return { user, accessToken, refreshToken };
  }

  /**
   * Admin/Staff only login — customers are rejected.
   * Role is verified BEFORE issuing tokens/cookies.
   */
  static async adminLogin(data: { email: string; password: string }, res: Response): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const user = await User.findOne({ email: data.email }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account has been deactivated');
    }

    const isPasswordValid = await user.comparePassword(data.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.role === 'customer') {
      throw new ForbiddenError(
        'Access denied. This login is only for admin and staff members.'
      );
    }

    const { accessToken, refreshToken } = generateTokens(user);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    setTokenCookies(res, accessToken, refreshToken);

    return { user, accessToken, refreshToken };
  }

  static async logout(userId: string, res: Response): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshToken: undefined });
    clearTokenCookies(res);
  }

  static async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch {
      user.passwordResetToken = undefined;
      user.passwordResetExpire = undefined;
      await user.save({ validateBeforeSave: false });
      throw new AppError('There was an error sending the email. Try again later.', 500);
    }
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpire: { $gt: Date.now() },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save();
  }

  static async verifyEmail(token: string): Promise<void> {
    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      throw new BadRequestError('Invalid verification token');
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });
  }

  static async refreshTokens(refreshToken: string, res: Response): Promise<{ accessToken: string; refreshToken: string }> {
    const jwt = await import('jsonwebtoken');
    const { config } = await import('../config');

    let decoded;
    try {
      decoded = jwt.default.verify(refreshToken, config.jwtRefreshSecret) as { id: string };
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    const tokens = generateTokens(user);

    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    return tokens;
  }

  static async getMe(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  static async updateProfile(userId: string, data: Partial<IUser>): Promise<IUser> {
    const allowedFields = ['name', 'phone', 'avatar', 'preferences'];
    const updates: Record<string, any> = {};

    Object.keys(data).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[key] = (data as any)[key];
      }
    });

    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundError('User');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();
  }
}
