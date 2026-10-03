import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { catchAsync } from '../utils/catchAsync';

export class AuthController {
  static register = catchAsync(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;
    const { user, accessToken, refreshToken } = await AuthService.register({ name, email, password }, res);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  });

  static login = catchAsync(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await AuthService.login(
      { email, password },
      res
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken,
      },
    });
  });

  static adminLogin = catchAsync(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await AuthService.adminLogin(
      { email, password },
      res
    );

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken,
      },
    });
  });

  static logout = catchAsync(async (req: Request, res: Response) => {
    await AuthService.logout(req.user!._id.toString(), res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  });

  static forgotPassword = catchAsync(async (req: Request, res: Response) => {
    await AuthService.forgotPassword(req.body.email);

    res.status(200).json({
      success: true,
      message: 'If the email exists, a reset link has been sent',
    });
  });

  static resetPassword = catchAsync(async (req: Request, res: Response) => {
    await AuthService.resetPassword(req.body.token, req.body.password);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  });

  static resetPasswordParam = catchAsync(async (req: Request, res: Response) => {
    await AuthService.resetPassword(req.params.token, req.body.password);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  });

  static verifyEmail = catchAsync(async (req: Request, res: Response) => {
    await AuthService.verifyEmail(req.body.token);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  });

  static verifyEmailParam = catchAsync(async (req: Request, res: Response) => {
    await AuthService.verifyEmail(req.params.token);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  });

  static refreshToken = catchAsync(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token not provided',
      });
    }

    const tokens = await AuthService.refreshTokens(refreshToken, res);

    res.status(200).json({
      success: true,
      data: tokens,
    });
  });

  static getMe = catchAsync(async (req: Request, res: Response) => {
    const user = await AuthService.getMe(req.user!._id.toString());

    res.status(200).json({
      success: true,
      data: { user },
    });
  });

  static updateProfile = catchAsync(async (req: Request, res: Response) => {
    const user = await AuthService.updateProfile(req.user!._id.toString(), req.body);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  });

  static changePassword = catchAsync(async (req: Request, res: Response) => {
    await AuthService.changePassword(
      req.user!._id.toString(),
      req.body.currentPassword,
      req.body.newPassword
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  });
}
