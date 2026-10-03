import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FootWear2 API',
      version: '1.0.0',
      description: 'Premium Footwear E-Commerce Platform REST API',
      contact: {
        name: 'FootWear2 Support',
        email: 'support@footware2.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api`,
        description: 'Development server',
      },
      {
        url: 'https://api.footware2.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['super-admin', 'admin', 'staff', 'customer'] },
            isVerified: { type: 'boolean' },
            isActive: { type: 'boolean' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            compareAtPrice: { type: 'number' },
            category: { type: 'string' },
            variants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  size: { type: 'string' },
                  color: { type: 'string' },
                  price: { type: 'number' },
                  stock: { type: 'integer' },
                  sku: { type: 'string' },
                },
              },
            },
            isActive: { type: 'boolean' },
            isFeatured: { type: 'boolean' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            orderNumber: { type: 'string' },
            user: { type: 'string' },
            items: { type: 'array' },
            shippingAddress: { type: 'object' },
            paymentMethod: { type: 'string' },
            paymentStatus: { type: 'string', enum: ['pending', 'paid', 'failed', 'refunded'] },
            orderStatus: { type: 'string', enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] },
            subtotal: { type: 'number' },
            shipping: { type: 'number' },
            total: { type: 'number' },
          },
        },
        Coupon: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            code: { type: 'string' },
            description: { type: 'string' },
            discountType: { type: 'string', enum: ['percentage', 'fixed', 'shipping'] },
            discountValue: { type: 'number' },
            minPurchase: { type: 'number' },
            isActive: { type: 'boolean' },
          },
        },
        Banner: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            subtitle: { type: 'string' },
            image: { type: 'string', description: 'Desktop artwork' },
            mobileImage: { type: 'string', description: 'Mobile artwork (falls back to image)' },
            altText: { type: 'string' },
            link: { type: 'string' },
            linkType: { type: 'string', enum: ['url', 'product', 'categories'] },
            position: { type: 'string', enum: ['hero'] },
            sortOrder: { type: 'number', minimum: 1 },
            isActive: { type: 'boolean' },
          },
        },
        Review: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            product: { type: 'string' },
            rating: { type: 'number', minimum: 1, maximum: 5 },
            title: { type: 'string' },
            comment: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
