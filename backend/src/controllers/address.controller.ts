import { Request, Response } from 'express';
import { Address } from '../models/address.model';
import { NotFoundError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';

export class AddressController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const addresses = await Address.find({ user: req.user!._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { addresses },
    });
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const address = await Address.create({
      ...req.body,
      user: req.user!._id,
    });

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: { address },
    });
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!address) {
      throw new NotFoundError('Address');
    }

    res.status(200).json({
      success: true,
      data: { address },
    });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user!._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!address) {
      throw new NotFoundError('Address');
    }

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: { address },
    });
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!address) {
      throw new NotFoundError('Address');
    }

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
    });
  });

  static setDefault = catchAsync(async (req: Request, res: Response) => {
    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user!._id },
      { isDefault: true },
      { new: true }
    );

    if (!address) {
      throw new NotFoundError('Address');
    }

    res.status(200).json({
      success: true,
      message: 'Default address set',
      data: { address },
    });
  });
}
