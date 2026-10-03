import { Request, Response } from 'express';
import { Size } from '../models/size.model';
import { catchAsync } from '../utils/catchAsync';

export class SizeController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const sizes = await Size.find({ isActive: true })
      .sort({ sortOrder: 1, label: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { sizes },
    });
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const { label, pk, eu, us } = req.body;

    const size = await Size.create({ label, pk, eu, us });

    res.status(201).json({
      success: true,
      message: 'Size created successfully',
      data: { size },
    });
  });
}
