import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { config } from '../config';
import { IUser } from '../models/user.model';

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export const generateTokens = (user: IUser) => {
  const accessToken = jwt.sign(
    { id: (user._id as Types.ObjectId).toString(), email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpire as any }
  );

  const refreshToken = jwt.sign(
    { id: (user._id as Types.ObjectId).toString() },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpire as any }
  );

  return { accessToken, refreshToken };
};

export const setTokenCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  const accessTokenMaxAge = 15 * 60 * 1000; // 15 minutes
  const refreshTokenMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: accessTokenMaxAge,
    path: '/',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: refreshTokenMaxAge,
    path: '/',
  });
};

export const clearTokenCookies = (res: Response): void => {
  res.cookie('accessToken', '', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): { id: string } => {
  return jwt.verify(token, config.jwtRefreshSecret) as { id: string };
};
