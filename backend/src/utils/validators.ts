import { body, query, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors: Record<string, string> = {};
    errors.array().forEach((error) => {
      if ('path' in error) {
        formattedErrors[error.path] = error.msg;
      }
    });
    return res.status(422).json({
      success: false,
      error: 'Validation failed',
      errors: formattedErrors,
    });
  }
  next();
};

export const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number')
    .matches(/[a-zA-Z]/)
    .withMessage('Password must contain a letter'),
  handleValidationErrors,
];

export const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

export const validateProduct = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 200 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  // Frontend sends categoryId; category is required
  body('categoryId').isMongoId().withMessage('Valid category ID is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  // SKU is optional — the controller auto-generates a unique one when missing
  body('sku').optional({ values: 'falsy' }).trim(),
  handleValidationErrors,
];

export const validateCategory = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('parent').optional({ nullable: true }).isMongoId().withMessage('Invalid parent category ID'),
  handleValidationErrors,
];

export const validateBrand = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  handleValidationErrors,
];


export const validateBanner = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  // Image file comes via multipart upload; presence is enforced in the controller
  body('image').optional().trim(),
  body('position').optional().isIn(['hero', 'middle', 'footer']),
  handleValidationErrors,
];

export const validateCoupon = [
  body('code').trim().notEmpty().withMessage('Code is required').isLength({ min: 3, max: 20 }),
  body('discountType').isIn(['percentage', 'fixed', 'shipping']).withMessage('Invalid discount type'),
  body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be positive'),
  body('minPurchase').optional().isFloat({ min: 0 }),
  body('maxDiscount').optional().isFloat({ min: 0 }),
  body('usageLimit').optional().isInt({ min: 1 }),
  body('expiresAt').optional().isISO8601(),
  handleValidationErrors,
];

export const validateOrder = [
  body('shippingAddress.fullName').trim().notEmpty().withMessage('Full name is required'),
  body('shippingAddress.phone').trim().notEmpty().withMessage('Phone is required'),
  body('shippingAddress.address1').trim().notEmpty().withMessage('Address is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.state').trim().notEmpty().withMessage('State is required'),
  body('shippingAddress.postalCode').trim().notEmpty().withMessage('Postal code is required'),
  body('shippingAddress.country').trim().notEmpty().withMessage('Country is required'),
  body('paymentMethod').trim().notEmpty().withMessage('Payment method is required'),
  handleValidationErrors,
];

export const validateReview = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('comment').trim().notEmpty().withMessage('Comment is required').isLength({ max: 2000 }),
  handleValidationErrors,
];

export const validateAddress = [
  body('label').trim().notEmpty().withMessage('Label is required'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('address1').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('postalCode').trim().notEmpty().withMessage('Postal code is required'),
  body('country').trim().notEmpty().withMessage('Country is required'),
  handleValidationErrors,
];

export const validateObjectId = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  handleValidationErrors,
];

export const validatePagination = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
];

export const validateReturnRefund = [
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.orderItem').isMongoId().withMessage('Valid order item ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.reason').trim().notEmpty().withMessage('Reason is required'),
  handleValidationErrors,
];
