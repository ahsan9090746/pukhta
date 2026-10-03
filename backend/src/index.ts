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

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);

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
    'X-Visitor-Id',
    'X-Session-Id',
  ],
}));

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(trackVisit);

if (config.nodeEnv !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }));
}

app.use('/api/', generalLimiter);
app.use('/uploads', express.static(uploadsDir, { maxAge: '1d' }));
app.use('/api', routes);
app.set('io', io);
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  // Render dynamic port use karta hai, isliye process.env.PORT zaroori hai
  const PORT = process.env.PORT || config.port || 5001;

  // 1. Pehle server ko listen karwao taake Render ko port mil jaye
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
    logger.info(`API available at http://localhost:${PORT}/api`);
    logger.info(`Health check at http://localhost:${PORT}/api/health`);
    logEmailStatus();
  });

  // 2. Ab database connect karo (agar yeh slow bhi ho, port already open hai)
  try {
    await connectDB();
    await seedSizes();
    await seedAdmin();
    await seedSettings();
  } catch (error) {
    logger.error(`Database connection or seeding failed: ${error}`);
    // process.exit(1) hata diya hai taake Render logs dikha sake
  }
};

process.on('unhandledRejection', (err: Error) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  logger.error(err.stack || '');
});

process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  logger.error(err.stack || '');
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

if (config.nodeEnv !== 'test') {
  startServer();
}

export { app, server, io };