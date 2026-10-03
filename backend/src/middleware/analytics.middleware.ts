import { Request, Response } from 'express';
import crypto from 'crypto';
import { SiteVisit, SiteVisitType } from '../models/site-visit.model';

/**
 * Analytics middleware
 * --------------------
 * This app is fully decoupled: the Next.js storefront talks to the backend
 * over /api only, so real page views are reported by the client tracker
 * (frontend/src/lib/analytics.ts) through POST /analytics/track with
 * x-visitor-id / x-session-id headers.
 *
 * This middleware provides:
 *  - getVisitorContext(): resolves visitor/session identity from headers,
 *    cookies, or a stable IP+UA hash fallback.
 *  - trackVisit(): passive global middleware that records page views for any
 *    non-API traffic the backend serves (keeps working if the store is ever
 *    served through this server). Skips bots, /api and /uploads.
 */

const BOT_REGEX =
  /(bot|crawler|spider|crawling|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|telegrambot)/i;

const MAX_AGE_5_MIN = 5 * 60 * 1000;

export const parseDevice = (ua: string): 'desktop' | 'mobile' | 'tablet' | 'other' => {
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/mobi|android|iphone/i.test(ua)) return 'mobile';
  if (ua) return 'desktop';
  return 'other';
};

export const parseBrowser = (ua: string): string => {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/chrome\//i.test(ua)) return 'Chrome';
  if (/safari\//i.test(ua)) return 'Safari';
  if (/firefox\//i.test(ua)) return 'Firefox';
  return 'Other';
};

/** Stable anonymous id for clients that send no identity headers/cookies */
const stableHash = (req: Request, salt: string): string =>
  crypto
    .createHash('sha1')
    .update(`${req.ip || ''}|${req.get('user-agent') || ''}|${salt}`)
    .digest('hex')
    .slice(0, 24);

export function getVisitorContext(req: Request): {
  visitorId: string;
  sessionId: string;
} {
  const headerVisitor = req.get('x-visitor-id');
  const headerSession = req.get('x-session-id');
  const cookieVisitor = (req.cookies as Record<string, string> | undefined)?.visitorId;
  const cookieSession = (req.cookies as Record<string, string> | undefined)?.sessionId;

  const visitorId =
    (typeof headerVisitor === 'string' && headerVisitor.trim()) ||
    (typeof cookieVisitor === 'string' && cookieVisitor.trim()) ||
    `anon-${stableHash(req, 'visitor')}`;

  const sessionId =
    (typeof headerSession === 'string' && headerSession.trim()) ||
    (typeof cookieSession === 'string' && cookieSession.trim()) ||
    `anon-${stableHash(req, 'session')}`;

  return { visitorId, sessionId };
}

/**
 * Fire-and-forget event recording. Dedupes via a single upsert on the
 * { sessionId, type, key } unique index — repeated events never create extra
 * documents and nothing is loaded into memory.
 */
export function recordSiteVisit(data: {
  type: SiteVisitType;
  sessionId: string;
  visitorId: string;
  key: string;
  path?: string;
  productId?: string | null;
  device?: string;
  browser?: string;
  ip?: string;
  userAgent?: string;
  user?: unknown;
}): Promise<unknown> {
  return SiteVisit.findOneAndUpdate(
    { sessionId: data.sessionId, type: data.type, key: data.key },
    {
      $setOnInsert: {
        type: data.type,
        sessionId: data.sessionId,
        visitorId: data.visitorId,
        key: data.key,
        path: data.path ?? '',
        productId: data.productId ?? null,
        device: data.device ?? 'other',
        browser: data.browser ?? '',
        ip: data.ip ?? '',
        userAgent: (data.userAgent ?? '').slice(0, 300),
        user: data.user ?? null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export const trackVisit = (req: Request, res: Response, next: (err?: unknown) => void) => {
  try {
    // Only track navigations (GET), never API data fetches or static files
    if (req.method !== 'GET') return next();

    const path = (req.originalUrl || req.url || '').split('?')[0];
    if (!path || path.startsWith('/api') || path.startsWith('/uploads')) return next();

    const userAgent = req.get('user-agent') || '';
    if (BOT_REGEX.test(userAgent)) return next();

    const { visitorId, sessionId } = getVisitorContext(req);

    recordSiteVisit({
      type: 'page_view',
      sessionId,
      visitorId,
      key: path.slice(0, 300),
      path: path.slice(0, 300),
      device: parseDevice(userAgent),
      browser: parseBrowser(userAgent),
      ip: req.ip,
      userAgent,
      user: req.user?._id,
    }).catch(() => {
      // Analytics must never break a request
    });
  } catch {
    // never block the request because of analytics
  }

  next();
};

export const FIVE_MINUTES_MS = MAX_AGE_5_MIN;