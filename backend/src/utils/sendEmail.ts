import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from './logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

let cachedTransporter: Transporter | null = null;

/** True when SMTP credentials + sender + owner inbox are all present. */
export function isEmailConfigured(): boolean {
  if (config.email.enabled === false) return false;
  const s = config.smtp;
  if (!s.host || !s.user || !s.pass) return false;
  if (!config.email.ownerEmail) return false;
  return true;
}

/** One-line startup log. Never logs passwords. */
export function logEmailStatus(): void {
  if (isEmailConfigured()) {
    logger.info(
      `Email notifications enabled via ${config.smtp.host}:${config.smtp.port} -> owner ${config.email.ownerEmail}`
    );
  } else if (config.email.enabled === false) {
    logger.warn('Email notifications disabled: EMAIL_ENABLED=false');
  } else {
    logger.warn(
      'Email notifications disabled: set SMTP_HOST, SMTP_USER, SMTP_PASS and OWNER_EMAIL in backend/.env to enable'
    );
  }
}

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
  return cachedTransporter;
}

/** For tests — drops the cached transporter so re-mocks take effect. */
export function __resetEmailTransporterForTests(): void {
  cachedTransporter = null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(amount: number, currency: string): string {
  const n = Number(amount) || 0;
  try {
    return `${currency} ${n.toLocaleString('en-PK')}`;
  } catch {
    return `${currency} ${n}`;
  }
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const to = (options.to || '').trim();
  if (!to) {
    throw new Error('sendEmail: recipient address is required');
  }
  if (config.email.enabled === false) {
    logger.warn(`Email skipped (EMAIL_ENABLED=false): "${options.subject}" -> ${to}`);
    return;
  }
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    throw new Error(
      'Email is not configured: set SMTP_HOST, SMTP_USER and SMTP_PASS in backend/.env'
    );
  }

  const mailOptions = {
    from: config.smtp.from,
    to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo,
  };

  try {
    await getTransporter().sendMail(mailOptions);
    logger.info(`Email sent to ${to} :: ${options.subject}`);
  } catch (error) {
    logger.error(`Email send error to ${to}: ${(error as Error).message}`);
    throw error;
  }
};

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Verify Your Email - Footware',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">Verify Your Email</h2>
        <p style="color: #666; line-height: 1.6;">
          Thank you for registering with Footware. Please click the button below to verify your email address.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}"
              style="background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p style="color: #999; font-size: 12px;">
          If you did not create an account, please ignore this email.
        </p>
      </div>
    `,
    text: `Verify your email: ${verificationUrl}`,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Password Reset - Footware',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
        <p style="color: #666; line-height: 1.6;">
          You requested a password reset. Please click the button below to set a new password.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
              style="background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #999; font-size: 12px;">
          If you did not request a password reset, please ignore this email. The link expires in 10 minutes.
        </p>
      </div>
    `,
    text: `Reset your password: ${resetUrl}`,
  });
};

// ---------------------------------------------------------------------------
// Order emails (replaces the old WhatsApp owner alerts)
// ---------------------------------------------------------------------------

export interface OrderEmailItem {
  name: string;
  sku?: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number;
}

export interface OrderEmailData {
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
  items: OrderEmailItem[];
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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  bank_deposit: 'Bank Deposit',
  card: 'Credit / Debit Card',
  stripe: 'Card (Stripe)',
  paypal: 'PayPal',
};

function paymentLabel(method?: string): string {
  if (!method) return '-';
  return PAYMENT_METHOD_LABELS[method] || method;
}

export function formatOrderEmailSubject(data: OrderEmailData): string {
  return `New Order #${data.orderNumber} — ${money(data.total, data.currency || 'PKR')} (${data.isGuest ? 'Guest' : 'Registered'})`;
}

export function formatOrderEmailText(data: OrderEmailData): string {
  const currency = data.currency || 'PKR';
  const lines: string[] = [];
  lines.push(`NEW ORDER #${data.orderNumber}`);
  lines.push(`Type: ${data.isGuest ? 'Guest' : 'Registered'}`);
  lines.push(`Name: ${data.fullName || '-'}`);
  lines.push(`Phone: ${data.phone || '-'}`);
  lines.push(`Email: ${data.email || '-'}`);
  lines.push(
    `Address: ${[data.address1, data.address2].filter(Boolean).join(', ') || '-'}`
  );
  lines.push(
    `City: ${[data.city, data.state, data.postalCode, data.country].filter(Boolean).join(', ') || '-'}`
  );
  lines.push('');
  lines.push('Items:');
  for (const it of data.items || []) {
    lines.push(
      `- ${it.name} | SKU: ${it.sku || '-'} | Size: ${it.size || '-'} | Color: ${it.color || '-'} | Qty: ${it.quantity} | ${money((Number(it.price) || 0) * (Number(it.quantity) || 0), currency)}`
    );
  }
  lines.push('');
  lines.push(`Subtotal: ${money(data.subtotal, currency)}`);
  lines.push(
    `Discount${data.couponCode ? ` (${data.couponCode})` : ''}: ${money(data.discount || 0, currency)}`
  );
  lines.push(`Shipping: ${money(data.shipping || 0, currency)}`);
  lines.push(`TOTAL: ${money(data.total, currency)}`);
  lines.push(`Payment: ${paymentLabel(data.paymentMethod)} (${data.paymentStatus || 'pending'})`);
  if (data.createdAt) {
    const d = data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt);
    lines.push(`Time: ${isNaN(d.getTime()) ? String(data.createdAt) : d.toLocaleString('en-GB')}`);
  }
  if (data.adminUrl) lines.push(`Admin: ${data.adminUrl}`);
  return lines.join('\n');
}

export function formatOrderEmailHtml(data: OrderEmailData): string {
  const currency = data.currency || 'PKR';
  const rows = (data.items || [])
    .map(
      (it) => `
        <tr>
          <td style="padding:8px;border:1px solid #eee;">${escapeHtml(it.name)}<br/><small style="color:#888;">SKU: ${escapeHtml(it.sku || '-')} | Size: ${escapeHtml(it.size || '-')} | Color: ${escapeHtml(it.color || '-')}</small></td>
          <td style="padding:8px;border:1px solid #eee;text-align:center;">${Number(it.quantity) || 0}</td>
          <td style="padding:8px;border:1px solid #eee;text-align:right;">${escapeHtml(money((Number(it.price) || 0) * (Number(it.quantity) || 0), currency))}</td>
        </tr>`
    )
    .join('');

  return `
    <div style="max-width: 640px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; color:#222;">
      <h2 style="margin:0 0 4px;">New Order #${escapeHtml(data.orderNumber)}</h2>
      <p style="color:#666;margin:0 0 16px;">${data.isGuest ? 'Guest checkout' : 'Registered customer'} &middot; ${escapeHtml(paymentLabel(data.paymentMethod))} (${escapeHtml(data.paymentStatus || 'pending')})</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr><td style="padding:6px 0;color:#666;">Customer</td><td style="padding:6px 0;"><strong>${escapeHtml(data.fullName || '-')}</strong> (${escapeHtml(data.phone || '-')})<br/>${escapeHtml(data.email || '-')}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Address</td><td style="padding:6px 0;">${escapeHtml([data.address1, data.address2].filter(Boolean).join(', ') || '-')}<br/>${escapeHtml([data.city, data.state, data.postalCode, data.country].filter(Boolean).join(', ') || '-')}</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f7f7f7;">
          <th style="padding:8px;border:1px solid #eee;text-align:left;">Item</th>
          <th style="padding:8px;border:1px solid #eee;">Qty</th>
          <th style="padding:8px;border:1px solid #eee;text-align:right;">Amount</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <table style="width:100%;margin-top:12px;border-collapse:collapse;">
        <tr><td style="padding:4px 0;color:#666;">Subtotal</td><td style="padding:4px 0;text-align:right;">${escapeHtml(money(data.subtotal, currency))}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Discount${data.couponCode ? ` (${escapeHtml(data.couponCode)})` : ''}</td><td style="padding:4px 0;text-align:right;">${escapeHtml(money(data.discount || 0, currency))}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Shipping</td><td style="padding:4px 0;text-align:right;">${escapeHtml(money(data.shipping || 0, currency))}</td></tr>
        <tr><td style="padding:8px 0;font-size:18px;"><strong>Total</strong></td><td style="padding:8px 0;text-align:right;font-size:18px;"><strong>${escapeHtml(money(data.total, currency))}</strong></td></tr>
      </table>
      ${data.adminUrl ? `<p style="margin-top:16px;"><a href="${escapeHtml(data.adminUrl)}" style="background:#000;color:#fff;padding:10px 22px;text-decoration:none;border-radius:5px;">Open in Admin</a></p>` : ''}
    </div>`;
}

/**
 * Owner alert for a new order. Skips silently when email is disabled or
 * misconfigured (order flow must never break); throws on SMTP failure so
 * the caller can log it fire-and-forget.
 */
export async function sendOrderOwnerEmail(data: OrderEmailData): Promise<void> {
  if (config.email.enabled === false) return;
  const owner = (config.email.ownerEmail || '').trim();
  if (!owner) {
    logger.warn('Order email skipped: OWNER_EMAIL is not set');
    return;
  }
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    logger.warn('Order email skipped: SMTP is not configured');
    return;
  }
  await sendEmail({
    to: owner,
    subject: formatOrderEmailSubject(data),
    html: formatOrderEmailHtml(data),
    text: formatOrderEmailText(data),
  });
}

/** Customer order confirmation (registered user or guest email). Never throws for missing address. */
export async function sendOrderCustomerEmail(
  customerEmail: string | undefined,
  data: OrderEmailData
): Promise<void> {
  const to = (customerEmail || '').trim();
  if (!to) return;
  if (config.email.enabled === false) return;
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) return;
  await sendEmail({
    to,
    subject: `Order #${data.orderNumber} confirmed — Footware`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2>Thank you, ${escapeHtml(data.fullName || 'customer')}!</h2>
        <p style="color:#555;">Your order <strong>#${escapeHtml(data.orderNumber)}</strong> has been received and is being processed.</p>
        ${formatOrderEmailHtml(data)}
      </div>`,
    text: `Thank you! Your order #${data.orderNumber} (${money(data.total, data.currency || 'PKR')}) has been received.\n\n${formatOrderEmailText(data)}`,
  });
}
