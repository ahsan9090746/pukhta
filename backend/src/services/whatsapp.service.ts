import { config } from '../config';
import { logger } from '../utils/logger';
import { maskPhone } from '../utils/helpers';
import { Product } from '../models/product.model';
import { Settings } from '../models/settings.model';
import type { IOrder } from '../models/order.model';

export const WHATSAPP_TIMEOUT_MS = 8000;
export const WHATSAPP_MAX_CHARS = 1500;

/**
 * Provider abstraction — a future Meta Cloud API provider only needs to
 * implement this interface and be selected in `sendWhatsAppMessage`
 * without touching any order code.
 */
export interface WhatsAppProvider {
  readonly name: string;
  send(text: string): Promise<void>;
}

export function buildCallMeBotUrl(phone: string, text: string, apiKey: string): string {
  return (
    'https://api.callmebot.com/whatsapp.php' +
    `?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(text)}` +
    `&apikey=${encodeURIComponent(apiKey)}`
  );
}

export class CallMeBotProvider implements WhatsAppProvider {
  readonly name = 'callmebot';

  constructor(
    private readonly ownerPhone: string,
    private readonly apiKey: string,
    private readonly timeoutMs: number = WHATSAPP_TIMEOUT_MS
  ) {}

  async send(text: string): Promise<void> {
    const url = buildCallMeBotUrl(this.ownerPhone, text, this.apiKey);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      if (!res.ok) {
        throw new Error(`CallMeBot request failed with HTTP ${res.status}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}

// Placeholder for a future Meta Cloud API implementation:
// export class MetaCloudProvider implements WhatsAppProvider { ... }

export function isWhatsAppConfigured(): boolean {
  const w = config.whatsapp;
  if (!w.enabled) return false;
  if (!w.ownerPhone) return false;
  if (w.provider === 'callmebot') {
    return Boolean(w.callmebotApiKey);
  }
  return true;
}

/** Logs one line at startup. Never logs the API key or the full phone number. */
export function logWhatsAppStatus(): void {
  if (isWhatsAppConfigured()) {
    logger.info(`WhatsApp notifications enabled via provider "${config.whatsapp.provider}"`);
  } else {
    logger.warn(
      'WhatsApp notifications disabled: set WHATSAPP_ENABLED=true, WHATSAPP_OWNER_PHONE and CALLMEBOT_API_KEY to enable'
    );
  }
}

/**
 * Sends a plain-text WhatsApp message to the store owner.
 * Silently skips when disabled/misconfigured; throws on provider failure
 * so the caller can log it (the order flow must catch it fire-and-forget).
 */
export async function sendWhatsAppMessage(text: string): Promise<void> {
  if (!isWhatsAppConfigured()) return;
  const providerName = config.whatsapp.provider || 'callmebot';
  if (providerName === 'callmebot') {
    const provider = new CallMeBotProvider(config.whatsapp.ownerPhone, config.whatsapp.callmebotApiKey);
    await provider.send(text);
    return;
  }
  throw new Error(`Unsupported WHATSAPP_PROVIDER: ${providerName}`);
}

export interface OrderMessageItem {
  name: string;
  sku?: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number;
}

export interface OrderMessageData {
  orderNumber: string;
  orderId?: string;
  isGuest?: boolean;
  fullName?: string;
  phone?: string;
  email?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  items: OrderMessageItem[];
  subtotal: number;
  discount?: number;
  couponCode?: string;
  shipping?: number;
  total: number;
  currency?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt?: Date | string;
  adminUrl?: string;
}

function money(amount: number, currency: string): string {
  const n = Number(amount) || 0;
  return `${currency} ${n.toLocaleString('en-PK')}`;
}

/** Builds the WhatsApp-friendly plain-text order alert (<= ~1500 chars). */
export function formatOrderMessage(data: OrderMessageData): string {
  const currency = data.currency || 'PKR';
  const type = data.isGuest ? 'Guest' : 'Registered';
  const address = [data.address1, data.address2].filter(Boolean).join(', ');
  const cityLine = [data.city, data.state, data.postalCode, data.country].filter(Boolean).join(', ');

  const itemLines: string[] = [];
  let omitted = 0;
  const lines: string[] = [];
  lines.push(`NEW ORDER #${data.orderNumber}`);
  lines.push(`Type: ${type}`);
  lines.push(`Name: ${data.fullName || '-'}`);
  lines.push(`Phone: ${data.phone || '-'}`);
  lines.push(`Email: ${data.email || '-'}`);
  lines.push(`Address: ${address || '-'}`);
  lines.push(`City: ${cityLine || '-'}`);
  lines.push('');
  lines.push('Items:');

  const header = lines.join('\n');
  const footerFor = (shownSubtotal: number, shownCount: number, omittedCount: number): string => {
    const f: string[] = [];
    if (omittedCount > 0) f.push(`...and ${omittedCount} more item(s)`);
    f.push('');
    f.push(`Subtotal: ${money(shownSubtotal, currency)}`);
    f.push(`Discount${data.couponCode ? ` (${data.couponCode})` : ''}: ${money(data.discount || 0, currency)}`);
    f.push(`Shipping: ${money(data.shipping || 0, currency)}`);
    f.push(`TOTAL: ${money(data.total, currency)}`);
    f.push(`Payment: ${data.paymentMethod || '-'} (${data.paymentStatus || 'pending'})`);
    if (data.createdAt) {
      const d = data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt);
      f.push(`Time: ${isNaN(d.getTime()) ? String(data.createdAt) : d.toLocaleString('en-GB')}`);
    }
    if (data.adminUrl) f.push(`Admin: ${data.adminUrl}`);
    void shownCount;
    return f.join('\n');
  };

  // Grow the item list while staying under the char budget.
  const allItems = data.items || [];
  let shownSubtotal = 0;
  for (let i = 0; i < allItems.length; i++) {
    const it = allItems[i];
    const line = `- ${it.name} | SKU: ${it.sku || '-'} | Size: ${it.size || '-'} | Color: ${it.color || '-'} | Qty: ${it.quantity} | ${money((Number(it.price) || 0) * (Number(it.quantity) || 0), currency)}`;
    const candidate = [...itemLines, line];
    const testMsg = [header, ...candidate, footerFor(shownSubtotal + (Number(it.price) || 0) * (Number(it.quantity) || 0), candidate.length, allItems.length - candidate.length)].join('\n');
    if (testMsg.length > WHATSAPP_MAX_CHARS && candidate.length > 1) {
      omitted = allItems.length - itemLines.length;
      break;
    }
    itemLines.push(line);
    shownSubtotal += (Number(it.price) || 0) * (Number(it.quantity) || 0);
    if (testMsg.length > WHATSAPP_MAX_CHARS) {
      // Single huge item — keep it, truncation handled by hard slice below.
      break;
    }
  }
  if (itemLines.length === 0 && allItems.length > 0) {
    const it = allItems[0];
    itemLines.push(`- ${it.name} | SKU: ${it.sku || '-'} | Qty: ${it.quantity} | ${money((Number(it.price) || 0) * (Number(it.quantity) || 0), currency)}`);
    omitted = allItems.length - 1;
  } else if (itemLines.length < allItems.length && omitted === 0) {
    omitted = allItems.length - itemLines.length;
  }

  let message = [header, ...itemLines, footerFor(data.subtotal, itemLines.length, omitted)].join('\n');
  if (message.length > WHATSAPP_MAX_CHARS + 100) {
    message = message.slice(0, WHATSAPP_MAX_CHARS) + '\n...(truncated)';
  }
  return message;
}

function productIdOf(ref: unknown): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object') {
    const o = ref as { _id?: unknown; toString?: () => string };
    if (o._id) return String(o._id);
    try {
      return String(ref);
    } catch {
      return '';
    }
  }
  return String(ref);
}

/**
 * Builds + sends the new-order WhatsApp alert. Never throws for disabled
 * config (skips silently); throws on provider failure so the order flow can
 * log it via `.catch()` without affecting the order itself.
 */
export async function sendOrderWhatsApp(order: IOrder): Promise<void> {
  if (!isWhatsAppConfigured()) return;

  let currency = 'PKR';
  try {
    const settings = await Settings.findOne().lean();
    if (settings?.currency) currency = settings.currency;
  } catch {
    // Fall through with default — settings must never break the alert.
  }

  let couponCode: string | undefined;
  try {
    const couponRef = (order as unknown as { coupon?: unknown }).coupon;
    if (couponRef && typeof couponRef === 'object' && 'code' in (couponRef as Record<string, unknown>)) {
      couponCode = String((couponRef as Record<string, unknown>).code);
    }
  } catch {
    couponCode = undefined;
  }

  const items: OrderMessageItem[] = [];
  for (const item of order.items || []) {
    let productName = item.name;
    let sku = '';
    let size = '';
    let color = '';
    try {
      const ref = (item as unknown as { product?: unknown }).product;
      const populated = ref && typeof ref === 'object' && 'name' in (ref as Record<string, unknown>)
        ? (ref as unknown as { name: string; sku?: string; variants?: Array<{ _id?: unknown; sku?: string; size?: string; color?: string }> })
        : null;
      const pid = populated ? '' : productIdOf(ref);
      const product = populated ?? (pid ? await Product.findById(pid).lean() : null);
      if (product) {
        productName = product.name || item.name;
        sku = product.sku || '';
        const variantId = String((item as unknown as { variant?: unknown }).variant || '');
        const variant = variantId
          ? (product.variants || []).find((v) => String(v._id) === variantId)
          : undefined;
        if (variant) {
          sku = variant.sku || sku;
          size = variant.size || '';
          color = variant.color || '';
        }
      }
    } catch {
      // Keep snapshot values — enrichment must never break the alert.
    }
    items.push({ name: productName, sku, size, color, quantity: item.quantity, price: item.price });
  }

  const addr = order.shippingAddress || ({} as IOrder['shippingAddress']);
  const userRef = (order as unknown as { user?: unknown }).user;
  const userEmail =
    userRef && typeof userRef === 'object' && 'email' in (userRef as Record<string, unknown>)
      ? String((userRef as Record<string, unknown>).email)
      : undefined;

  const message = formatOrderMessage({
    orderNumber: order.orderNumber,
    orderId: String((order as unknown as { _id?: unknown })._id || ''),
    isGuest: order.isGuest,
    fullName: addr.fullName,
    phone: addr.phone,
    email: order.guestEmail || userEmail || '-',
    address1: addr.address1,
    address2: addr.address2,
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    country: addr.country,
    items,
    subtotal: order.subtotal,
    discount: order.discount,
    couponCode,
    shipping: order.shipping,
    total: order.total,
    currency,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    adminUrl: `${config.frontendUrl}/admin/orders/${String((order as unknown as { _id?: unknown })._id || '')}`,
  });

  try {
    await sendWhatsAppMessage(message);
    logger.info(`WhatsApp order alert sent for order #${order.orderNumber}`);
  } catch (err) {
    // Never include the API key or full phone number in logs.
    logger.error(
      `WhatsApp order alert failed for order #${order.orderNumber} (owner ${maskPhone(config.whatsapp.ownerPhone)}): ${(err as Error).message}`
    );
    throw err;
  }
}
