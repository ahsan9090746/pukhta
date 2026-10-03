import crypto from 'crypto';
import { Counter } from '../models/counter.model';

export const generateRandomToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

export const generateOrderNumber = async (): Promise<string> => {
  const counter = await Counter.findOneAndUpdate(
    { name: 'orderNumber' },
    [{
      $set: {
        seq: {
          $cond: {
            if: { $lt: ['$seq', 9001] },
            then: 9001,
            else: { $add: ['$seq', 1] },
          },
        },
      },
    }],
    { new: true, upsert: true }
  );
  return `ORD-${counter!.seq}`;
};

/**
 * Normalizes a phone number for matching: strips spaces, dashes and
 * parentheses, and converts the Pakistani country-code format
 * (+92XXXXXXXXXX / 92XXXXXXXXXX) to the local leading-zero format
 * (0XXXXXXXXXX).
 */
export const normalizePhone = (phone: string): string => {
  let cleaned = (phone || '').replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('+92')) {
    cleaned = `0${cleaned.slice(3)}`;
  } else if (cleaned.startsWith('92') && cleaned.length >= 11) {
    cleaned = `0${cleaned.slice(2)}`;
  }
  return cleaned;
};

/**
 * Returns the common formatting variants of a phone number (as typed,
 * normalized, and international forms) so order tracking matches the
 * number regardless of how it was entered at checkout.
 */
export const getPhoneVariants = (phone: string): string[] => {
  const raw = (phone || '').trim();
  const normalized = normalizePhone(raw);
  const variants = new Set<string>();

  if (raw) variants.add(raw);
  if (normalized) variants.add(normalized);
  if (normalized.startsWith('0')) {
    variants.add(`+92${normalized.slice(1)}`);
    variants.add(`92${normalized.slice(1)}`);
  }

  return Array.from(variants).filter((variant) => variant.length >= 7);
};

/**
 * Masks a phone number for privacy (e.g. 03001234567 -> 0300******67).
 * Used when a customer's orders are listed by phone search.
 */
export const maskPhone = (phone: string = ''): string => {
  if (!phone) return '';
  if (phone.length <= 4) return '****';
  const hidden = '*'.repeat(Math.max(3, phone.length - 6));
  return `${phone.slice(0, 4)}${hidden}${phone.slice(-2)}`;
};

export const calculateDiscount = (price: number, compareAtPrice: number): number => {
  if (compareAtPrice <= 0 || price >= compareAtPrice) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
};

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(price);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(email);
};

export const sanitizeString = (str: string): string => {
  return str.trim().replace(/\s+/g, ' ');
};

export const removeUndefined = (obj: Record<string, any>): Record<string, any> => {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined && obj[key] !== null) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};
