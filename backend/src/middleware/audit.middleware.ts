import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/audit-log.model';

export const auditLog = (action: string, resource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      if (req.user && res.statusCode >= 200 && res.statusCode < 300) {
        const logData = {
          user: req.user._id,
          action,
          resource,
          resourceId: req.params.id || body?.data?._id,
          oldData: req.body._oldData,
          newData: body?.data,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
        };

        AuditLog.create(logData).catch((err) => {
          console.error('Audit log error:', err);
        });
      }

      return originalJson(body);
    };

    next();
  };
};

export const captureOldData = (Model: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.params.id && ['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      try {
        const oldData = await Model.findById(req.params.id).lean();
        req.body._oldData = oldData;
      } catch {
        // Ignore errors
      }
    }
    next();
  };
};
