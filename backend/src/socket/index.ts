import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models/user.model';
import { logger } from '../utils/logger';
import { NOT_DELETED } from '../utils/softDelete';
import { setSocketService } from '../services/notification.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export const initializeSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25001,
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret) as {
        id: string;
        role: string;
      };

      const user = await User.findOne({ _id: decoded.id, ...NOT_DELETED });
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Socket connected: ${socket.userId}`);

    // Join user-specific room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Join admin room for admin users
    if (socket.userRole && ['super-admin', 'admin', 'staff'].includes(socket.userRole)) {
      socket.join('admin');
    }

    // Handle joining specific rooms
    socket.on('join-room', (room: string) => {
      if (socket.userId) {
        socket.join(room);
        logger.debug(`Socket ${socket.userId} joined room: ${room}`);
      }
    });

    // Handle leaving rooms
    socket.on('leave-room', (room: string) => {
      socket.leave(room);
      logger.debug(`Socket ${socket.userId} left room: ${room}`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.userId}, reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.userId}: ${error}`);
    });
  });

  // Set up notification service
  setSocketService({
    emitToUser: (userId: string, event: string, data: any) => {
      io.to(`user:${userId}`).emit(event, data);
    },
    emitToAdmins: (event: string, data: any) => {
      io.to('admin').emit(event, data);
    },
  });

  // Global event emitters
  const emitOrderUpdate = (orderId: string, status: string, userId: string) => {
    io.to(`user:${userId}`).emit('order-update', { orderId, status });
    io.to('admin').emit('order-update', { orderId, status, userId });
  };

  const emitInventoryAlert = (productId: string, productName: string, stock: number) => {
    io.to('admin').emit('inventory-alert', { productId, productName, stock });
  };

  const emitNewOrder = (orderData: any) => {
    io.to('admin').emit('new-order', orderData);
  };

  // Attach emitters to io for use elsewhere
  (io as any).emitOrderUpdate = emitOrderUpdate;
  (io as any).emitInventoryAlert = emitInventoryAlert;
  (io as any).emitNewOrder = emitNewOrder;

  return io;
};

export const getSocketInstance = (io: Server) => io;
