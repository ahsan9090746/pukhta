import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config';
import connectDB from './config/db';
import { logger } from './utils/logger';
import { errorHandler, notFound } from './middleware/error.middleware';
import { generalLimiter } from './middleware/rate-limiter.middleware';
import { trackVisit } from './middleware/analytics.middleware';
import routes from './routes';
import { initializeSocket } from './socket';
import { seedSizes } from './seeds/size-seed';
import { seedAdmin } from './seeds/admin-seed';
import { seedSettings } from './seeds/settings-seed';
import { logEmailStatus } from './utils/sendEmail';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Ensure uploads directory exists (for category/product/banner images)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Refresh-Token',
    // Client analytics tracker (frontend/src/lib/analytics.ts) identifies
    // visitors through these custom headers — they must pass the CORS preflight.
    'X-Visitor-Id',
    'X-Session-Id',
  ],
}));

// Compression
app.use(compression());

// Cookie parser
app.use(cookieParser());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Analytics: passive visit tracking for any non-API traffic (skips /api, /uploads, bots)
app.use(trackVisit);

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }));
}

// Rate limiting
app.use('/api/', generalLimiter);

// Static files: uploaded images served at /uploads/<filename>
app.use('/uploads', express.static(uploadsDir, { maxAge: '1d' }));

// API routes
app.use('/api', routes);

// Socket.IO instance accessible via app
app.set('io', io);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();
    await seedSizes();
    await seedAdmin();
    await seedSettings();

server.listen(config.port, '0.0.0.0', () => {
      logger.info(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
      logger.info(`API available at http://localhost:${config.port}/api`);
      logger.info(`Health check at http://localhost:${config.port}/api/health`);
      logger.info(`Network access: http://192.168.100.6:${config.port}/api`);
      logEmailStatus();
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  logger.error(err.stack || '');
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  logger.error(err.stack || '');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// In test mode (Jest sets NODE_ENV=test) the tests own the MongoDB connection
// and HTTP server lifecycle — they connect to a dedicated test DB in beforeAll
// and close the server in afterAll. Starting the real connection + seeds here
// would race with that (and point at the wrong database).
if (config.nodeEnv !== 'test') {
  startServer();
}

export { app, server, io };

