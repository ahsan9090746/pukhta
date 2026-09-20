import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';

interface SiteSettings {
  storeName: string;
  storeDescription: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  currency: string;
  freeShippingThreshold: number;
  shippingCost: number;
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
}

let siteSettings: SiteSettings = {
  storeName: 'Footware',
  storeDescription: 'Premium footwear for everyone',
  storeEmail: 'info@footware.com',
  storePhone: '+92 332 9090746',
  storeAddress: 'Peshawar, Pakistan',
  currency: 'PKR',
  freeShippingThreshold: 0,
  shippingCost: 0,
  socialMedia: {
    facebook: '',
    instagram: '',
    twitter: '',
    youtube: '',
  },
  seo: {
    metaTitle: 'Footware - Premium Footwear Store',
    metaDescription: 'Shop the latest footwear trends. Quality shoes for men, women, and kids.',
    keywords: ['shoes', 'footwear', 'sneakers', 'boots', 'sandals'],
  },
};

export class SettingsController {
  static getSettings = catchAsync(async (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: { settings: siteSettings },
    });
  });

  static updateSettings = catchAsync(async (req: Request, res: Response) => {
    siteSettings = { ...siteSettings, ...req.body };

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: { settings: siteSettings },
    });
  });

}
