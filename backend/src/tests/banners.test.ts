import request from 'supertest';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { app, server } from '../index';
import { User, Role, Banner, Product, Category } from '../models';
import { deleteUploadedFile } from '../utils/upload';

const API_URL = '/api';

const DESKTOP_PNG = { filename: 'hero-desktop.png', contentType: 'image/png' };
const DESKTOP_JPG = { filename: 'hero-desktop.jpg', contentType: 'image/jpeg' };
const MOBILE_PNG = { filename: 'hero-mobile.png', contentType: 'image/png' };

const imageBuffer = (label: string) => Buffer.from(`fake-${label}-image-bytes`);

let adminToken: string;
let categoryId: string;
let productId: string;
const createdBannerIds: string[] = [];
const createdImagePaths: string[] = [];

const uploadsPath = (...parts: string[]) => path.join(process.cwd(), 'uploads', ...parts);

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/footware_test';
  await mongoose.connect(mongoUri);

  await Banner.deleteMany({});
  await Product.deleteMany({});
  await Category.deleteMany({});
  await User.deleteMany({});
  await Role.deleteMany({});

  await Role.create([
    { name: 'super-admin', description: 'Super Admin', permissions: [], isSystem: true },
    { name: 'customer', description: 'Customer', permissions: [], isSystem: true },
  ]);

  const adminEmail = `banner-admin${Date.now()}@test.com`;
  await request(app)
    .post(`${API_URL}/auth/register`)
    .send({ name: 'Banner Admin', email: adminEmail, password: 'AdminPass123' });

  await User.findOneAndUpdate({ email: adminEmail }, { role: 'super-admin' });

  const loginRes = await request(app)
    .post(`${API_URL}/auth/login`)
    .send({ email: adminEmail, password: 'AdminPass123' });

  adminToken = loginRes.body.data.accessToken;

  const catRes = await request(app)
    .post(`${API_URL}/admin/categories`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Banner Test Category' });
  categoryId = catRes.body.data?.category?._id;

  const productRes = await request(app)
    .post(`${API_URL}/admin/products`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Banner Link Sneaker',
      description: 'A sneaker used to verify SKU search inside the banner link picker.',
      category: categoryId,
      price: 99,
      sku: 'BNRSKU12345',
    });
  productId = productRes.body.data?.product?._id;
});

afterAll(async () => {
  // Remove every image written by this suite, then the documents
  createdImagePaths.forEach((imagePath) => deleteUploadedFile(imagePath));
  await Banner.deleteMany({});
  await Product.deleteMany({});
  await Category.deleteMany({});
  await User.deleteMany({});
  await Role.deleteMany({});
  await mongoose.disconnect();
  if (server.listening) server.close();
});

describe('Banner Endpoints', () => {
  describe('POST /api/admin/banners', () => {
    it('creates the first banner in the hero position with sort order 1', async () => {
      const res = await request(app)
        .post(`${API_URL}/admin/banners`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Hero Banner One')
        .field('link', '/product-category')
        .field('linkType', 'url')
        .field('sortOrder', '1')
        .field('isActive', 'true')
        .attach('image', imageBuffer('one-desktop'), DESKTOP_PNG)
        .attach('mobileImage', imageBuffer('one-mobile'), MOBILE_PNG)
        .expect(201);

      const banner = res.body.data.banner;
      createdBannerIds.push(banner._id);
      createdImagePaths.push(banner.image, banner.mobileImage);

      expect(banner.position).toBe('hero');
      expect(banner.sortOrder).toBe(1);
      // Desktop artwork keeps the canonical name, mobile artwork gets "-mobile"
      expect(banner.image).toBe(`/uploads/banner/${banner._id}.png`);
      expect(banner.mobileImage).toBe(`/uploads/banner/${banner._id}-mobile.png`);
      // Alt text is auto-filled from the title when left empty
      expect(banner.altText).toBe('Hero Banner One');
      expect(fs.existsSync(uploadsPath('banner', `${banner._id}.png`))).toBe(true);
      expect(fs.existsSync(uploadsPath('banner', `${banner._id}-mobile.png`))).toBe(true);
    });

    it('auto-assigns the next free sort order (2, then 3)', async () => {
      const second = await request(app)
        .post(`${API_URL}/admin/banners`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Hero Banner Two')
        .field('linkType', 'url')
        .field('link', '/product-category')
        .attach('image', imageBuffer('two-desktop'), DESKTOP_PNG)
        .expect(201);

      const third = await request(app)
        .post(`${API_URL}/admin/banners`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Hero Banner Three')
        .field('linkType', 'url')
        .field('link', '/product-category')
        .attach('image', imageBuffer('three-desktop'), DESKTOP_PNG)
        .expect(201);

      createdBannerIds.push(second.body.data.banner._id, third.body.data.banner._id);
      createdImagePaths.push(second.body.data.banner.image, third.body.data.banner.image);

      expect(second.body.data.banner.sortOrder).toBe(2);
      expect(third.body.data.banner.sortOrder).toBe(3);
    });

    it('keeps an explicitly requested free sort order and accepts hidden banners', async () => {
      const res = await request(app)
        .post(`${API_URL}/admin/banners`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Hero Banner Four (hidden)')
        .field('linkType', 'url')
        .field('link', '/product-category')
        .field('sortOrder', '4')
        .field('isActive', 'false')
        .attach('image', imageBuffer('four-desktop'), DESKTOP_PNG)
        .expect(201);

      createdBannerIds.push(res.body.data.banner._id);
      createdImagePaths.push(res.body.data.banner.image);

      expect(res.body.data.banner.sortOrder).toBe(4);
      expect(res.body.data.banner.isActive).toBe(false);
    });

    it('rejects a sort order that is already taken', async () => {
      const res = await request(app)
        .post(`${API_URL}/admin/banners`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Duplicate Position')
        .field('linkType', 'url')
        .field('link', '/product-category')
        .field('sortOrder', '1')
        .attach('image', imageBuffer('duplicate'), DESKTOP_PNG)
        .expect(400);

      expect(res.body.error).toMatch(/already used/i);
      expect(res.body.error).toContain('Hero Banner One');
    });

    it('rejects a sort order below 1', async () => {
      const res = await request(app)
        .post(`${API_URL}/admin/banners`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Bad Sort Order')
        .field('sortOrder', '0')
        .attach('image', imageBuffer('bad-sort'), DESKTOP_PNG)
        .expect(422);

      expect(res.body.success).toBe(false);
    });

    it('rejects any position other than hero', async () => {
      await request(app)
        .post(`${API_URL}/admin/banners`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Middle Banner')
        .field('position', 'middle')
        .attach('image', imageBuffer('middle'), DESKTOP_PNG)
        .expect(422);
    });

    it('rejects a banner without a desktop image', async () => {
      const res = await request(app)
        .post(`${API_URL}/admin/banners`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Mobile Only')
        .attach('mobileImage', imageBuffer('mobile-only'), MOBILE_PNG)
        .expect(400);

      expect(res.body.error).toBe('Banner image is required');
    });

    it('requires authentication', async () => {
      await request(app)
        .post(`${API_URL}/admin/banners`)
        .field('title', 'No Auth')
        .attach('image', imageBuffer('no-auth'), DESKTOP_PNG)
        .expect(401);
    });
  });

  describe('GET /api/banners/active', () => {
    it('returns only active hero banners ordered by sort order', async () => {
      const res = await request(app).get(`${API_URL}/banners/active`).expect(200);

      const banners = res.body.data.banners;
      expect(banners.length).toBe(3);
      expect(banners.map((b: any) => b.sortOrder)).toEqual([1, 2, 3]);
      expect(banners.every((b: any) => b.position === 'hero')).toBe(true);
      expect(banners[0].image).toBeTruthy();
    });
  });

  describe('PUT /api/admin/banners/:id', () => {
    let secondBannerId: string;

    beforeAll(async () => {
      const adminList = await request(app)
        .get(`${API_URL}/admin/banners?limit=100`)
        .set('Authorization', `Bearer ${adminToken}`);
      secondBannerId = adminList.body.data.data.find((b: any) => b.sortOrder === 2)._id;
    });

    it('updates the title/link and keeps its own sort order', async () => {
      const res = await request(app)
        .put(`${API_URL}/admin/banners/${secondBannerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Hero Banner Two Updated')
        .field('altText', 'Updated alt text')
        .field('link', '/product-category?tab=new-arrival')
        .field('linkType', 'url')
        .field('sortOrder', '2')
        .field('isActive', 'true')
        .expect(200);

      expect(res.body.data.banner.title).toBe('Hero Banner Two Updated');
      expect(res.body.data.banner.altText).toBe('Updated alt text');
      expect(res.body.data.banner.link).toBe('/product-category?tab=new-arrival');
      expect(res.body.data.banner.sortOrder).toBe(2);
    });

    it('replaces the desktop image (and deletes the old file)', async () => {
      const before = await Banner.findById(secondBannerId).lean();
      const oldImage = before!.image;

      const res = await request(app)
        .put(`${API_URL}/admin/banners/${secondBannerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Hero Banner Two Updated')
        .field('sortOrder', '2')
        .attach('image', imageBuffer('two-replaced'), DESKTOP_JPG)
        .expect(200);

      const newImage = res.body.data.banner.image;
      createdImagePaths.push(newImage);

      expect(newImage).toBe(`/uploads/banner/${secondBannerId}.jpg`);
      expect(fs.existsSync(uploadsPath('banner', `${secondBannerId}.jpg`))).toBe(true);
      // the previous artwork is gone
      expect(oldImage).not.toBe(newImage);
      expect(fs.existsSync(uploadsPath('banner', path.basename(oldImage)))).toBe(false);
    });

    it('adds a dedicated mobile image', async () => {
      const res = await request(app)
        .put(`${API_URL}/admin/banners/${secondBannerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Hero Banner Two Updated')
        .field('sortOrder', '2')
        .attach('mobileImage', imageBuffer('two-mobile'), MOBILE_PNG)
        .expect(200);

      const mobileImage = res.body.data.banner.mobileImage;
      expect(mobileImage).toBe(`/uploads/banner/${secondBannerId}-mobile.png`);
      expect(fs.existsSync(uploadsPath('banner', `${secondBannerId}-mobile.png`))).toBe(true);
    });

    it('removes the mobile image on request', async () => {
      const before = await Banner.findById(secondBannerId).lean();
      const oldMobile = before!.mobileImage;
      expect(oldMobile).toBeTruthy();

      const res = await request(app)
        .put(`${API_URL}/admin/banners/${secondBannerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Hero Banner Two Updated')
        .field('sortOrder', '2')
        .field('removeMobileImage', 'true')
        .expect(200);

      expect(res.body.data.banner.mobileImage).toBe('');
      expect(fs.existsSync(uploadsPath('banner', path.basename(oldMobile)))).toBe(false);
    });

    it('rejects a sort order already used by another banner', async () => {
      const res = await request(app)
        .put(`${API_URL}/admin/banners/${secondBannerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Hero Banner Two Updated')
        .field('sortOrder', '1')
        .expect(400);

      expect(res.body.error).toMatch(/already used/i);
    });

    it('cannot remove the required desktop image', async () => {
      const res = await request(app)
        .put(`${API_URL}/admin/banners/${secondBannerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Hero Banner Two Updated')
        .field('sortOrder', '2')
        .field('removeImage', 'true')
        .expect(400);

      expect(res.body.error).toBe('Banner image is required');
    });

    it('rejects a position other than hero', async () => {
      await request(app)
        .put(`${API_URL}/admin/banners/${secondBannerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Hero Banner Two Updated')
        .field('position', 'footer')
        .field('sortOrder', '2')
        .expect(422);
    });
  });

  describe('GET /api/products?search= (banner product picker)', () => {
    it('finds a product by its SKU', async () => {
      const res = await request(app)
        .get(`${API_URL}/products?search=BNRSKU12345&limit=20`)
        .expect(200);

      const ids = res.body.data.data.map((p: any) => p._id);
      expect(ids).toContain(productId);
    });

    it('finds a product by name', async () => {
      const res = await request(app)
        .get(`${API_URL}/products?search=Banner Link Sneaker&limit=20`)
        .expect(200);

      const ids = res.body.data.data.map((p: any) => p._id);
      expect(ids).toContain(productId);
    });
  });

  describe('DELETE /api/admin/banners/:id', () => {
    it('permanently deletes the banner and both artwork files', async () => {
      const banner = await Banner.create({
        title: 'Banner To Delete',
        image: '/uploads/banner/tmp-delete-desktop.png',
        mobileImage: '/uploads/banner/tmp-delete-mobile.png',
        position: 'hero',
        sortOrder: 99,
      });

      // create the files on disk so the cleanup hooks have something to remove
      const desktopFile = uploadsPath('banner', 'tmp-delete-desktop.png');
      const mobileFile = uploadsPath('banner', 'tmp-delete-mobile.png');
      fs.writeFileSync(desktopFile, 'x');
      fs.writeFileSync(mobileFile, 'x');

      await request(app)
        .delete(`${API_URL}/admin/banners/${banner._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(await Banner.findById(banner._id)).toBeNull();
      expect(fs.existsSync(desktopFile)).toBe(false);
      expect(fs.existsSync(mobileFile)).toBe(false);

      await request(app).get(`${API_URL}/banners/${banner._id}`).expect(404);
    });
  });
});
