import request from 'supertest';
import mongoose from 'mongoose';
import { app, server } from '../index';
import { User, Role, Product, Category, Order } from '../models';

const API_URL = '/api';

let customerToken: string;
let adminToken: string;
let productId: string;
let orderId: string;

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/footware_test';
  await mongoose.connect(mongoUri);

  await Order.deleteMany({});
  await Product.deleteMany({});
  await Category.deleteMany({});
  await User.deleteMany({});
  await Role.deleteMany({});

  await Role.create([
    { name: 'super-admin', description: 'Super Admin', permissions: [], isSystem: true },
    { name: 'customer', description: 'Customer', permissions: [], isSystem: true },
  ]);

  // Register customer
  const customerEmail = `ordercustomer${Date.now()}@test.com`;
  await request(app)
    .post(`${API_URL}/auth/register`)
    .send({
      name: 'Order Customer',
      email: customerEmail,
      password: 'Customer123',
    });

  const customerLogin = await request(app)
    .post(`${API_URL}/auth/login`)
    .send({ email: customerEmail, password: 'Customer123' });

  customerToken = customerLogin.body.data.accessToken;

  // Register admin
  const adminEmail = `orderadmin${Date.now()}@test.com`;
  await request(app)
    .post(`${API_URL}/auth/register`)
    .send({
      name: 'Order Admin',
      email: adminEmail,
      password: 'AdminPass123',
    });

  await User.findOneAndUpdate(
    { email: adminEmail },
    { role: 'super-admin' }
  );

  const adminLogin = await request(app)
    .post(`${API_URL}/auth/login`)
    .send({ email: adminEmail, password: 'AdminPass123' });

  adminToken = adminLogin.body.data.accessToken;

  // Create category
  const catRes = await request(app)
    .post(`${API_URL}/admin/categories`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Order Test Category' });
  const catId = catRes.body.data?.category?._id;

  // Create a test product
  const productRes = await request(app)
    .post(`${API_URL}/products`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Order Test Product',
      description: 'A test product specifically for order testing with all required fields for validation.',
      category: catId,
      price: 99.99,
      costPrice: 35.00,
      sku: 'ORD-TEST-001',
      variants: [
        { size: '9', stock: 100 },
      ],
      sizes: ['9'],
      colors: ['Black'],
    });

  productId = productRes.body.data?.product?._id;
});

afterAll(async () => {
  await Order.deleteMany({});
  await Product.deleteMany({});
  await Category.deleteMany({});
  await User.deleteMany({});
  await Role.deleteMany({});
  await mongoose.disconnect();
  if (server.listening) server.close();
});

describe('Order Endpoints', () => {
  const sampleShippingAddress = {
    fullName: 'John Order',
    phone: '+1 (555) 999-0001',
    address1: '789 Order Street',
    city: 'Testville',
    state: 'CA',
    postalCode: '90210',
    country: 'US',
  };

  describe('POST /api/orders', () => {
    it('should create an order as authenticated customer', async () => {
      if (!productId) return;

      const res = await request(app)
        .post(`${API_URL}/orders`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ product: productId, quantity: 2 }],
          shippingAddress: sampleShippingAddress,
          paymentMethod: 'stripe',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.order).toBeDefined();
      expect(res.body.data.order.orderNumber).toBeDefined();
      expect(res.body.data.order.items).toHaveLength(1);
      expect(res.body.data.order.shippingAddress.fullName).toBe('John Order');
      expect(res.body.data.order.paymentMethod).toBe('stripe');
      expect(res.body.data.order.orderStatus).toBe('pending');
      expect(res.body.data.order.subtotal).toBeGreaterThan(0);
      expect(res.body.data.order.total).toBeGreaterThan(0);
      orderId = res.body.data.order._id;
    });

    it('should not create order without authentication', async () => {
      await request(app)
        .post(`${API_URL}/orders`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          shippingAddress: sampleShippingAddress,
          paymentMethod: 'stripe',
        })
        .expect(401);
    });

    it('should not create order with missing shipping address', async () => {
      const res = await request(app)
        .post(`${API_URL}/orders`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          paymentMethod: 'stripe',
        })
        .expect(422);

      expect(res.body.success).toBe(false);
    });

    it('should not create order with missing payment method', async () => {
      const res = await request(app)
        .post(`${API_URL}/orders`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          shippingAddress: sampleShippingAddress,
        })
        .expect(422);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/orders/my-orders', () => {
    it('should get customer orders', async () => {
      const res = await request(app)
        .get(`${API_URL}/orders/my-orders`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should not get orders without authentication', async () => {
      await request(app)
        .get(`${API_URL}/orders/my-orders`)
        .expect(401);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should get order by ID', async () => {
      if (!orderId) return;

      const res = await request(app)
        .get(`${API_URL}/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.order._id).toBe(orderId);
    });

    it('should return 400 for invalid order ID', async () => {
      const res = await request(app)
        .get(`${API_URL}/orders/invalidid`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(422);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    it('should update order status as admin', async () => {
      if (!orderId) return;

      const res = await request(app)
        .put(`${API_URL}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'confirmed',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.order.orderStatus).toBe('confirmed');
    });

    it('should update order status with tracking info', async () => {
      if (!orderId) return;

      const res = await request(app)
        .put(`${API_URL}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'shipped',
          trackingNumber: 'TRK123456789',
          shippingCarrier: 'FedEx',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.order.orderStatus).toBe('shipped');
      expect(res.body.data.order.trackingNumber).toBe('TRK123456789');
      expect(res.body.data.order.shippingCarrier).toBe('FedEx');
    });

    it('should not update order status without admin permissions', async () => {
      if (!orderId) return;

      await request(app)
        .put(`${API_URL}/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'delivered' })
        .expect(403);
    });

    it('should not update order status without authentication', async () => {
      if (!orderId) return;

      await request(app)
        .put(`${API_URL}/orders/${orderId}/status`)
        .send({ status: 'delivered' })
        .expect(401);
    });
  });

  describe('PUT /api/orders/:id/cancel', () => {
    it('should cancel an order', async () => {
      // Create a new order to cancel
      const createRes = await request(app)
        .post(`${API_URL}/orders`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ product: productId, quantity: 1 }],
          shippingAddress: sampleShippingAddress,
          paymentMethod: 'paypal',
        });

      const cancelOrderId = createRes.body.data.order._id;

      const res = await request(app)
        .put(`${API_URL}/orders/${cancelOrderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.order.orderStatus).toBe('cancelled');
    });
  });

  describe('GET /api/orders (Admin)', () => {
    it('should list all orders as admin', async () => {
      const res = await request(app)
        .get(`${API_URL}/orders`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should not list all orders as customer', async () => {
      await request(app)
        .get(`${API_URL}/orders`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });
});
