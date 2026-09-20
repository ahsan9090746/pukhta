import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { catchAsync } from '../utils/catchAsync';

export class NotificationController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const result = await NotificationService.getUserNotifications(
      req.user!._id.toString(),
      req.query as any
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  static markAsRead = catchAsync(async (req: Request, res: Response) => {
    await NotificationService.markAsRead(req.params.id, req.user!._id.toString());

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  });

  static markAllAsRead = catchAsync(async (req: Request, res: Response) => {
    await NotificationService.markAllAsRead(req.user!._id.toString());

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    await NotificationService.deleteNotification(
      req.params.id,
      req.user!._id.toString()
    );

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  });

  static getUnreadCount = catchAsync(async (req: Request, res: Response) => {
    const count = await NotificationService.getUnreadCount(req.user!._id.toString());

    res.status(200).json({
      success: true,
      data: { count },
    });
  });
}
