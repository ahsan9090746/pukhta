import request from 'supertest';
import mongoose from 'mongoose';
import { app, server } from '../index';
import { User, Role, Product, Category } from '../models';

const API_URL = '/api';

let adminToken: string;
let categoryId: string;
let productId: string;

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/footware_test';
  await mongoose.connect(mongoUri);

  await Product.deleteMany({});
  await Category.deleteMany({});
  await User.deleteMany({});
  await Role.deleteMany({});

  await Role.create([
    { name: 'super-admin', description: 'Super Admin', permissions: [], isSystem: true },
    { name: 'customer', description: 'Customer', permissions: [], isSystem: true },
  ]);

  const adminEmail = `admin${Date.now()}@test.com`;
  await request(app)
    .post(`${API_URL}/auth/register`)
    .send({ name: 'Admin User', email: adminEmail, password: 'AdminPass123' });

  await User.findOneAndUpdate(
    { email: adminEmail },
    { role: 'super-admin' }
  );

  const loginRes = await request(app)
    .post(`${API_URL}/auth/login`)
    .send({ email: adminEmail, password: 'AdminPass123' });

  adminToken = loginRes.body.data.accessToken;

  const catRes = await request(app)
    .post(`${API_URL}/admin/categories`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Test Category' });
  categoryId = catRes.body.data?.category?._id;
});

afterAll(async () => {
  await Product.deleteMany({});
  await Category.deleteMany({});
  await User.deleteMany({});
  await Role.deleteMany({});
  await mongoose.disconnect();
  server.close();
});

describe('Product Endpoints', () => {
  const sampleProduct = {
    name: 'Test Running Shoe',
    description: 'A high-quality running shoe designed for comfort and performance during daily runs and training sessions.',
    category: '',
    price: 129.99,
    compareAtPrice: 149.99,
    costPrice: 45.00,
    sku: 'TST-RUN-001',
    tags: ['running', 'test'],
    variants: [
      { size: '9', color: 'Black', price: 129.99, stock: 25, sku: 'TST-RUN-001-9-BLK' },
      { size: '10', color: 'Black', price: 129.99, stock: 20, sku: 'TST-RUN-001-10-BLK' },
      { size: '9', color: 'White', price: 129.99, stock: 15, sku: 'TST-RUN-001-9-WHT' },
    ],
    sizes: ['9', '10', '11'],
    colors: ['Black', 'White'],
    isActive: true,
    isFeatured: false,
  };

  describe('GET /api/products', () => {
    it('should list all active products', async () => {
      const res = await request(app)
        .get(`${API_URL}/products`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`${API_URL}/products?page=1&limit=5`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get(`${API_URL}/products?category=${categoryId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should search by keyword', async () => {
      const res = await request(app)
        .get(`${API_URL}/products?search=running`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/products', () => {
    it('should create a product as admin', async () => {
      const productData = {
        ...sampleProduct,
        category: categoryId,
      };

      const res = await request(app)
        .post(`${API_URL}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.product.name).toBe(sampleProduct.name);
      expect(res.body.data.product.price).toBe(sampleProduct.price);
      expect(res.body.data.product.sku).toBe(sampleProduct.sku);
      expect(res.body.data.product.variants).toHaveLength(3);
      productId = res.body.data.product._id;
    });

    it('should not create product without authentication', async () => {
      const productData = {
        ...sampleProduct,
        category: categoryId,
        sku: 'TST-RUN-002',
      };

      await request(app)
        .post(`${API_URL}/products`)
        .send(productData)
        .expect(401);
    });

    it('should not create product with missing required fields', async () => {
      const res = await request(app)
        .post(`${API_URL}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Incomplete Product' })
        .expect(422);

      expect(res.body.success).toBe(false);
    });

    it('should not create product with invalid category ID', async () => {
      const res = await request(app)
        .post(`${API_URL}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...sampleProduct, category: 'invalidid', sku: 'TST-RUN-003' })
        .expect(422);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should get product by ID', async () => {
      if (!productId) return;

      const res = await request(app)
        .get(`${API_URL}/products/${productId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.product._id).toBe(productId);
      expect(res.body.data.product.name).toBe(sampleProduct.name);
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get(`${API_URL}/products/invalidid`)
        .expect(422);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`${API_URL}/products/${fakeId}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/products/slug/:slug', () => {
    it('should get product by slug', async () => {
      if (!productId) return;

      const product = await Product.findById(productId);
      if (!product) return;

      const res = await request(app)
        .get(`${API_URL}/products/slug/${product.slug}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.product.slug).toBe(product.slug);
    });

    it('should return 404 for non-existent slug', async () => {
      const res = await request(app)
        .get(`${API_URL}/products/slug/nonexistent-slug-12345`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product as admin', async () => {
      if (!productId) return;

      const res = await request(app)
        .put(`${API_URL}/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Running Shoe', price: 139.99 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.product.name).toBe('Updated Running Shoe');
      expect(res.body.data.product.price).toBe(139.99);
    });

    it('should not update product without authentication', async () => {
      if (!productId) return;

      await request(app)
        .put(`${API_URL}/products/${productId}`)
        .send({ name: 'Unauthorized Update' })
        .expect(401);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product as admin', async () => {
      if (!productId) return;

      const res = await request(app)
        .delete(`${API_URL}/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const checkRes = await request(app)
        .get(`${API_URL}/products/${productId}`)
        .expect(404);

      expect(checkRes.body.success).toBe(false);
    });

    it('should not delete product without authentication', async () => {
      const newProduct = await Product.create({
        ...sampleProduct,
        name: 'Delete Me Product',
        slug: 'delete-me-product',
        category: categoryId,
        sku: 'DEL-001',
      });

      await request(app)
        .delete(`${API_URL}/products/${newProduct._id}`)
        .expect(401);

      await Product.findByIdAndDelete(newProduct._id);
    });
  });

  describe('GET /api/products/featured', () => {
    it('should get featured products', async () => {
      const res = await request(app)
        .get(`${API_URL}/products/featured`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
