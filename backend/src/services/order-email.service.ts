import { config } from '../config';
import { logger } from '../utils/logger';
import { Product } from '../models/product.model';
import { Settings } from '../models/settings.model';
import type { IOrder } from '../models/order.model';
import {
  sendOrderOwnerEmail,
  sendOrderCustomerEmail,
  type OrderEmailData,
  type OrderEmailItem,
} from '../utils/sendEmail';

/**
 * Builds the email payload from an order (enriching product names/SKUs like
 * the old alert did) and sends:
 *   1. owner alert  -> OWNER_EMAIL (from env)
 *   2. customer copy -> registered user email or guestEmail (if present)
 * Never throws for missing config (skips silently); throws on SMTP failure
 * so the order flow can log it via `.catch()` without affecting the order.
 */
export async function sendOrderEmails(order: IOrder): Promise<void> {
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

  const items: OrderEmailItem[] = [];
  for (const item of order.items || []) {
    let productName = item.name;
    let sku = '';
    let size = '';
    let color = '';
    try {
      const ref = (item as unknown as { product?: unknown }).product;
      const populated =
        ref && typeof ref === 'object' && 'name' in (ref as Record<string, unknown>)
          ? (ref as unknown as {
              name: string;
              sku?: string;
              variants?: Array<{ _id?: unknown; sku?: string; size?: string; color?: string }>;
            })
          : null;
      const pid = populated
        ? ''
        : (() => {
            if (!ref) return '';
            if (typeof ref === 'string') return ref;
            if (typeof ref === 'object') {
              const o = ref as { _id?: unknown };
              if (o._id) return String(o._id);
              try {
                return String(ref);
              } catch {
                return '';
              }
            }
            return String(ref);
          })();
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
  const customerEmail = order.guestEmail || userEmail;

  const data: OrderEmailData = {
    orderNumber: order.orderNumber,
    orderId: String((order as unknown as { _id?: unknown })._id || ''),
    isGuest: order.isGuest,
    fullName: addr.fullName,
    phone: addr.phone,
    email: customerEmail || '-',
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
    adminUrl: `${config.frontendUrl}/admin9090746/orders/${String(
      (order as unknown as { _id?: unknown })._id || ''
    )}`,
  };

  try {
    // Owner first (most important), then customer copy — customer failure
    // alone must not mask a successful owner alert.
    await sendOrderOwnerEmail(data);
    if (customerEmail && customerEmail !== '-') {
      try {
        await sendOrderCustomerEmail(customerEmail, data);
      } catch (err) {
        logger.error(
          `Customer order email failed for order #${order.orderNumber}: ${(err as Error).message}`
        );
      }
    }
    logger.info(`Order emails processed for order #${order.orderNumber}`);
  } catch (err) {
    logger.error(`Order owner email failed for order #${order.orderNumber}: ${(err as Error).message}`);
    throw err;
  }
}
