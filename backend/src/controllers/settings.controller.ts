import { Request, Response } from 'express';
import { Settings } from '../models/settings.model';
import { catchAsync } from '../utils/catchAsync';
import { deleteUploadedFile, renameUploadedEntityFiles } from '../utils/upload';

const defaultSettings = {
  storeName: 'Footware',
  storeDescription: 'Premium footwear for everyone',
  storeEmail: 'info@footware.com',
  storePhone: '',
  // Drives the storefront map on /contact
  storeAddress: 'Namak Mandi Chowk, Peshawar',
  storeLogo: '',
  logoLight: '',
  logoDark: '',
  currency: 'PKR',
  freeShippingThreshold: 0,
  shippingCost: 0,
  socialMedia: {
    facebook: '',
    instagram: '',
    twitter: '',
    youtube: '',
    pinterest: '',
    linkedin: '',
    whatsapp: '',
    tiktok: '',
  },
  seo: { metaTitle: '', metaDescription: '', keywords: [] as string[] },
};

export class SettingsController {
  static getSettings = catchAsync(async (req: Request, res: Response) => {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(defaultSettings);
    }

    res.status(200).json({
      success: true,
      data: { settings },
    });
  });

  static updateSettings = catchAsync(async (req: Request, res: Response) => {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(defaultSettings);
    }

    // Handle logo uploads — each file is renamed to "<settingsId><suffix>.<ext>"
    // inside uploads/settings/ (storeLogo: "", logoLight: "-light", logoDark: "-dark").
    const uploadedFiles = (req.files || {}) as Record<string, Express.Multer.File[] | undefined>;

    const pickLogoFile = (field: string): Express.Multer.File | undefined => {
      const fromFields = uploadedFiles[field]?.[0];
      if (fromFields) return fromFields;
      // Fallback for a single-file upload whose field name matches the slot
      return req.file && req.file.fieldname === field ? req.file : undefined;
    };

    const LOGO_SLOTS = [
      { field: 'storeLogo', suffix: '', removeFlag: 'removeLogo' },
      { field: 'logoLight', suffix: '-light', removeFlag: 'removeLogoLight' },
      { field: 'logoDark', suffix: '-dark', removeFlag: 'removeLogoDark' },
    ] as const;

    LOGO_SLOTS.forEach(({ field, suffix, removeFlag }) => {
      const current = (settings as any)[field] as string | undefined;
      const file = pickLogoFile(field);

      // New upload replaces the previous file (old one is deleted)
      if (file) {
        if (current) deleteUploadedFile(current);
        const [renamedPath] = renameUploadedEntityFiles(
          [file],
          'settings',
          String(settings._id),
          suffix
        );
        (settings as any)[field] = renamedPath || '';
        return;
      }

      // Removal is only honoured when no new file was sent for this slot
      if (String(req.body[removeFlag] || '') === 'true') {
        if (current) deleteUploadedFile(current);
        (settings as any)[field] = '';
      }
    });

    // Update fields
    const fields = [
      'storeName', 'storeDescription', 'storeEmail', 'storePhone',
      'storeAddress', 'currency', 'freeShippingThreshold', 'shippingCost',
    ];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        (settings as any)[field] = req.body[field];
      }
    });

    // Update social media
    if (req.body.socialMedia) {
      try {
        const social = typeof req.body.socialMedia === 'string'
          ? JSON.parse(req.body.socialMedia)
          : req.body.socialMedia;
        settings.socialMedia = { ...settings.socialMedia, ...social };
      } catch {}
    }

    // Update SEO
    if (req.body.seo) {
      try {
        const seo = typeof req.body.seo === 'string'
          ? JSON.parse(req.body.seo)
          : req.body.seo;
        settings.seo = { ...settings.seo, ...seo };
      } catch {}
    }

    // Update keywords separately (sent as JSON array string)
    if (req.body.keywords) {
      try {
        settings.seo.keywords = typeof req.body.keywords === 'string'
          ? JSON.parse(req.body.keywords)
          : req.body.keywords;
      } catch {}
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: { settings },
    });
  });
}
