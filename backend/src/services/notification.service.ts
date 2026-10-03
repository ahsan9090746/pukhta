import { Notification, INotification } from '../models/notification.model';
import { parsePagination, buildPaginationResponse } from '../utils/pagination';

export interface SocketService {
  emitToUser(userId: string, event: string, data: any): void;
  emitToAdmins(event: string, data: any): void;
}

let socketService: SocketService | null = null;

export const setSocketService = (service: SocketService) => {
  socketService = service;
};

export class NotificationService {
  static async create(data: {
    user: string;
    type: 'order' | 'status' | 'promotion' | 'system';
    title: string;
    message: string;
    data?: Record<string, any>;
  }): Promise<INotification> {
    const notification = await Notification.create(data);

    if (socketService) {
      socketService.emitToUser(data.user, 'notification', {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  }

  static async getUserNotifications(
    userId: string,
    query: { page?: string; limit?: string; unreadOnly?: string }
  ) {
    const { page, limit, skip } = parsePagination(query);

    const filter: Record<string, any> = { user: userId };
    if (query.unreadOnly === 'true') {
      filter.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: userId, isRead: false }),
    ]);

    return {
      data: notifications,
      pagination: buildPaginationResponse(total, page, limit),
      unreadCount,
    };
  }

  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true }
    );
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );
  }

  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await Notification.findOneAndDelete({ _id: notificationId, user: userId });
  }

  static async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ user: userId, isRead: false });
  }

  static async sendOrderNotification(
    userId: string,
    orderNumber: string,
    status: string
  ): Promise<void> {
    const statusMessages: Record<string, string> = {
      confirmed: 'has been confirmed',
      processing: 'is being processed',
      shipped: 'has been shipped',
      delivered: 'has been delivered',
      cancelled: 'has been cancelled',
    };

    await this.create({
      user: userId,
      type: 'status',
      title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your order #${orderNumber} ${statusMessages[status] || `is now ${status}`}.`,
      data: { orderNumber, status },
    });
  }

  static async sendPromotionNotification(
    userIds: string[],
    title: string,
    message: string
  ): Promise<void> {
    const notifications = userIds.map((userId) => ({
      user: userId,
      type: 'promotion' as const,
      title,
      message,
    }));

    await Notification.insertMany(notifications);

    if (socketService) {
      userIds.forEach((userId) => {
        socketService!.emitToUser(userId, 'notification', {
          type: 'promotion',
          title,
          message,
        });
      });
    }
  }

  static async sendSystemNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    await this.create({
      user: userId,
      type: 'system',
      title,
      message,
      data,
    });
  }
}
