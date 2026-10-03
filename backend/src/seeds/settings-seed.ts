import { Settings } from '../models/settings.model';
import { logger } from '../utils/logger';

const defaultSettings = {
  storeName: 'Footware',
  storeDescription: 'Premium footwear for everyone',
  storeEmail: 'info@footware.com',
  storePhone: '+92 300 0000000',
  // Drives the storefront map on /contact — keep it in sync with the real shop
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
  seo: {
    metaTitle: 'Footware - Premium Footwear Store',
    metaDescription: 'Shop the best footwear collection at Footware',
    keywords: ['footwear', 'shoes', 'sneakers', 'boots', 'sandals'],
  },
};

export const seedSettings = async (): Promise<void> => {
  try {
    const count = await Settings.countDocuments();
    if (count > 0) {
      logger.info(`Settings already seeded (${count} settings exist)`);
      return;
    }

    await Settings.create(defaultSettings);
    logger.info('Default settings created successfully');
  } catch (error) {
    logger.error('Error seeding settings:', error);
  }
};
