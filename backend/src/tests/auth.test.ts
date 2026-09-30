import request from 'supertest';
import mongoose from 'mongoose';
import { app, server } from '../index';
import { User, Role } from '../models';

const API_URL = '/api';

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/footware_test';
  await mongoose.connect(mongoUri);
  await User.deleteMany({});
  await Role.deleteMany({});

  await Role.create([
    { name: 'super-admin', description: 'Super Admin', permissions: [], isSystem: true },
    { name: 'customer', description: 'Customer', permissions: [], isSystem: true },
  ]);
});

afterAll(async () => {
  await User.deleteMany({});
  await Role.deleteMany({});
  await mongoose.disconnect();
  if (server.listening) server.close();
});

describe('Auth Endpoints', () => {
  const testUser = {
    name: 'Test User',
    email: `testuser${Date.now()}@example.com`,
    password: 'TestPass123',
  };

  let authToken: string;
  let refreshToken: string;
  let userId: string;

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post(`${API_URL}/auth/register`)
        .send(testUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.name).toBe(testUser.name);
      expect(res.body.data.user.role).toBe('customer');
      expect(res.body.data.accessToken).toBeDefined();
      userId = res.body.data.user._id;
    });

    it('should not register with duplicate email', async () => {
      const res = await request(app)
        .post(`${API_URL}/auth/register`)
        .send(testUser)
        .expect(409);

      expect(res.body.success).toBe(false);
    });

    it('should not register with invalid email', async () => {
      const res = await request(app)
        .post(`${API_URL}/auth/register`)
        .send({ name: 'User', email: 'invalid', password: 'TestPass123' })
        .expect(422);

      expect(res.body.success).toBe(false);
    });

    it('should not register with short password', async () => {
      const res = await request(app)
        .post(`${API_URL}/auth/register`)
        .send({ name: 'User', email: 'another@example.com', password: '123' })
        .expect(422);

      expect(res.body.success).toBe(false);
    });

    it('should not register with missing fields', async () => {
      const res = await request(app)
        .post(`${API_URL}/auth/register`)
        .send({})
        .expect(422);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post(`${API_URL}/auth/login`)
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
      authToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should not login with wrong password', async () => {
      const res = await request(app)
        .post(`${API_URL}/auth/login`)
        .send({ email: testUser.email, password: 'WrongPassword123' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should not login with non-existent email', async () => {
      const res = await request(app)
        .post(`${API_URL}/auth/login`)
        .send({ email: 'nonexistent@example.com', password: 'TestPass123' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should not login with missing fields', async () => {
      const res = await request(app)
        .post(`${API_URL}/auth/login`)
        .send({})
        .expect(422);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user profile with valid token', async () => {
      const res = await request(app)
        .get(`${API_URL}/auth/me`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.name).toBe(testUser.name);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get(`${API_URL}/auth/me`)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get(`${API_URL}/auth/me`)
        .set('Authorization', 'Bearer invalidtoken123')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update user profile', async () => {
      const res = await request(app)
        .put(`${API_URL}/auth/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Updated Name');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    it('should change password with valid current password', async () => {
      const res = await request(app)
        .put(`${API_URL}/auth/change-password`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentPassword: testUser.password, newPassword: 'NewPass456' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should not change password with wrong current password', async () => {
      const res = await request(app)
        .put(`${API_URL}/auth/change-password`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentPassword: 'WrongPass', newPassword: 'NewPass789' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me - Unauthorized Access', () => {
    it('should deny access to protected routes without token', async () => {
      const routes = [
        { method: 'get', url: `${API_URL}/auth/me` },
        { method: 'put', url: `${API_URL}/auth/profile` },
      ];

      for (const route of routes) {
        const res = await (request(app) as any)[route.method](route.url).expect(401);
        expect(res.body.success).toBe(false);
      }
    });
  });
});
