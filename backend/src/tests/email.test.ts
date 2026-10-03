import {
  formatOrderEmailSubject,
  formatOrderEmailText,
  formatOrderEmailHtml,
  sendOrderOwnerEmail,
  sendOrderCustomerEmail,
  isEmailConfigured,
  __resetEmailTransporterForTests,
} from '../utils/sendEmail';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { config as mockedConfig } from '../config';

jest.mock('../config', () => ({
  config: {
    frontendUrl: 'http://localhost:3000',
    smtp: { host: 'smtp.gmail.com', port: 587, user: 'shop@test.com', pass: 'secret', from: 'shop@test.com' },
    email: { enabled: true, ownerEmail: 'owner@test.com', adminEmail: 'admin@test.com' },
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'test-id' });

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn(() => ({ sendMail: sendMailMock })) },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { logger } = require('../utils/logger');

const baseOrder = {
  orderNumber: 'ORD-9123',
  orderId: 'order-id-1',
  isGuest: true,
  fullName: 'Ali Raza',
  phone: '03001234567',
  email: 'ali@test.com',
  address1: 'House 12, Street 4',
  address2: '',
  city: 'Lahore',
  state: 'Punjab',
  postalCode: '54000',
  country: 'Pakistan',
  items: [{ name: 'Runner Pro', sku: 'RUN-BLK-42', size: '42', color: 'Black', quantity: 2, price: 4999 }],
  subtotal: 9998,
  discount: 500,
  couponCode: 'SAVE500',
  shipping: 0,
  total: 9498,
  currency: 'PKR',
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  createdAt: new Date('2026-09-30T10:00:00Z'),
  adminUrl: 'http://localhost:3000/admin9090746/orders/order-id-1',
};

describe('email notifications (SMTP)', () => {
  beforeEach(() => {
    mockedConfig.email.enabled = true;
    mockedConfig.email.ownerEmail = 'owner@test.com';
    mockedConfig.smtp.host = 'smtp.gmail.com';
    mockedConfig.smtp.user = 'shop@test.com';
    mockedConfig.smtp.pass = 'secret';
    sendMailMock.mockClear();
    __resetEmailTransporterForTests();
  });

  it('isEmailConfigured is true when SMTP + owner inbox are set', () => {
    expect(isEmailConfigured()).toBe(true);
  });

  it('isEmailConfigured is false when SMTP creds are missing', () => {
    mockedConfig.smtp.pass = '';
    expect(isEmailConfigured()).toBe(false);
  });

  it('formats subject/text/html with order number, customer, SKU and total', () => {
    expect(formatOrderEmailSubject(baseOrder)).toContain('ORD-9123');
    const text = formatOrderEmailText(baseOrder);
    expect(text).toContain('ORD-9123');
    expect(text).toContain('Ali Raza');
    expect(text).toContain('03001234567');
    expect(text).toContain('House 12, Street 4');
    expect(text).toContain('Lahore');
    expect(text).toContain('RUN-BLK-42');
    expect(text).toContain('TOTAL');
    const html = formatOrderEmailHtml(baseOrder);
    expect(html).toContain('ORD-9123');
    expect(html).toContain('Runner Pro');
    expect(html).toContain('admin9090746/orders/order-id-1');
  });

  it('escapes HTML in customer-controlled fields', () => {
    const html = formatOrderEmailHtml({ ...baseOrder, fullName: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('sends the owner alert to OWNER_EMAIL', async () => {
    await sendOrderOwnerEmail(baseOrder);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mail = sendMailMock.mock.calls[0][0];
    expect(mail.to).toBe('owner@test.com');
    expect(mail.subject).toContain('ORD-9123');
    expect(mail.html).toContain('Runner Pro');
  });

  it('skips owner alert silently when email is disabled', async () => {
    mockedConfig.email.enabled = false;
    await sendOrderOwnerEmail(baseOrder);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('skips owner alert with a warning when OWNER_EMAIL is missing', async () => {
    mockedConfig.email.ownerEmail = '';
    await sendOrderOwnerEmail(baseOrder);
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('sends the customer confirmation to the customer address', async () => {
    await sendOrderCustomerEmail('ali@test.com', baseOrder);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0][0].to).toBe('ali@test.com');
  });

  it('skips customer email when address is missing', async () => {
    await sendOrderCustomerEmail('', baseOrder);
    await sendOrderCustomerEmail(undefined, baseOrder);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('order flow pattern: SMTP failure rejects so caller can log, order itself unaffected', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('SMTP down'));
    let orderPathFailed = false;
    let alertErrorLogged = false;
    try {
      await sendOrderOwnerEmail(baseOrder).catch(() => {
        alertErrorLogged = true;
      });
    } catch {
      orderPathFailed = true;
    }
    expect(orderPathFailed).toBe(false);
    expect(alertErrorLogged).toBe(true);
  });
});
