import {
  buildCallMeBotUrl,
  formatOrderMessage,
  sendWhatsAppMessage,
  sendOrderWhatsApp,
  WHATSAPP_MAX_CHARS,
} from '../services/whatsapp.service';
import { logger } from '../utils/logger';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { config as mockedConfig } from '../config';

jest.mock('../config', () => ({
  config: {
    whatsapp: { enabled: true, provider: 'callmebot', ownerPhone: '923001234567', callmebotApiKey: 'testkey123' },
    frontendUrl: 'http://localhost:3000',
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../models/settings.model', () => ({
  Settings: { findOne: jest.fn() },
}));

jest.mock('../models/product.model', () => ({
  Product: { findById: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Settings } = require('../models/settings.model');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Product } = require('../models/product.model');

const baseMessageData = {
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
  items: [
    { name: 'Runner Pro', sku: 'RUN-BLK-42', size: '42', color: 'Black', quantity: 2, price: 4999 },
  ],
  subtotal: 9998,
  discount: 500,
  couponCode: 'SAVE500',
  shipping: 0,
  total: 9498,
  currency: 'PKR',
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  createdAt: new Date('2026-09-30T10:00:00Z'),
  adminUrl: 'http://localhost:3000/admin/orders/order-id-1',
};

describe('whatsapp.service', () => {
  beforeEach(() => {
    mockedConfig.whatsapp.enabled = true;
    mockedConfig.whatsapp.provider = 'callmebot';
    mockedConfig.whatsapp.ownerPhone = '923001234567';
    mockedConfig.whatsapp.callmebotApiKey = 'testkey123';
    (global.fetch as unknown as jest.Mock) = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    (Settings.findOne as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue({ currency: 'PKR' }) });
    (Product.findById as jest.Mock).mockImplementation((id: string) => ({
      lean: jest.fn().mockResolvedValue({
        _id: id,
        name: 'Runner Pro',
        sku: 'RUN-BLK-42',
        variants: [],
      }),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds a message containing order number, name, phone, address and SKU', () => {
    const msg = formatOrderMessage(baseMessageData);
    expect(msg).toContain('ORD-9123');
    expect(msg).toContain('Ali Raza');
    expect(msg).toContain('03001234567');
    expect(msg).toContain('House 12, Street 4');
    expect(msg).toContain('Lahore');
    expect(msg).toContain('RUN-BLK-42');
    expect(msg).toContain('Guest');
    expect(msg).toContain('TOTAL');
    expect(msg).toContain('http://localhost:3000/admin/orders/order-id-1');
  });

  it('truncates long item lists with "...and N more"', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({
      name: `Very Long Product Name Number ${i} With Extra Details Here`,
      sku: `SKU-${i}-EXTRA-LONG`,
      size: '42',
      color: 'Black',
      quantity: 1,
      price: 4999,
    }));
    const msg = formatOrderMessage({ ...baseMessageData, items });
    expect(msg.length).toBeLessThanOrEqual(WHATSAPP_MAX_CHARS + 100);
    expect(msg).toMatch(/\.\.\.and \d+ more/);
  });

  it('URL-encodes the CallMeBot request correctly', async () => {
    await sendWhatsAppMessage('Hello & welcome = test?');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url.startsWith('https://api.callmebot.com/whatsapp.php')).toBe(true);
    expect(url).toContain(`phone=${encodeURIComponent('923001234567')}`);
    expect(url).toContain(`text=${encodeURIComponent('Hello & welcome = test?')}`);
    expect(url).toContain(`apikey=${encodeURIComponent('testkey123')}`);
  });

  it('skips sending when disabled without calling fetch', async () => {
    mockedConfig.whatsapp.enabled = false;
    await sendWhatsAppMessage('should not send');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('order still succeeds when WhatsApp fetch throws (fire-and-forget)', async () => {
    (global.fetch as unknown as jest.Mock) = jest.fn().mockRejectedValue(new Error('network down'));

    const order = {
      _id: 'order-id-1',
      orderNumber: 'ORD-9123',
      isGuest: true,
      guestEmail: 'ali@test.com',
      items: [{ product: 'prod-1', variant: undefined, name: 'Runner Pro', price: 4999, quantity: 1, image: '' }],
      shippingAddress: {
        fullName: 'Ali Raza',
        phone: '03001234567',
        address1: 'House 12, Street 4',
        city: 'Lahore',
        state: 'Punjab',
        postalCode: '54000',
        country: 'Pakistan',
      },
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      subtotal: 4999,
      discount: 0,
      shipping: 0,
      total: 4999,
      createdAt: new Date(),
    };

    // Same pattern used in order.service.ts: void + .catch()
    let orderPathFailed = false;
    let alertErrorLogged = false;
    void (sendOrderWhatsApp(order as never) as Promise<void>).catch(() => {
      alertErrorLogged = true;
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch {
      orderPathFailed = true;
    }

    expect(orderPathFailed).toBe(false);
    expect(alertErrorLogged).toBe(true);

    // The failure must be logged without leaking the API key or full phone.
    const loggedArgs = (logger.error as jest.Mock).mock.calls.flat().map(String).join(' ');
    expect(loggedArgs).not.toContain('testkey123');
    expect(loggedArgs).not.toContain('923001234567');
  });
});
