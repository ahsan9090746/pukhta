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

// Validates categoriesId: a JSON string of MongoIds (multipart/form-data)
// or a plain array of MongoIds (JSON body).
const validateCategoryIds = (value: any) => {
  let ids = value;
  if (typeof ids === 'string') {
    try {
      ids = JSON.parse(ids);
    } catch {
      throw new Error('Valid category ID is required');
    }
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Valid category ID is required');
  }
  for (const id of ids) {
    if (!/^[0-9a-fA-F]{24}$/.test(String(id))) {
      throw new Error('Valid category ID is required');
    }
  }
  return true;
};

export const validateProduct = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 200 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  // Category is required — the admin UI sends categoriesId (JSON array via
  // multipart/form-data), direct API calls may send categoryId or `category`.
  // Accept all three shapes.
  body('categoriesId').optional({ values: 'falsy' }).custom(validateCategoryIds),
  body('categoryId').optional({ values: 'falsy' }).isMongoId().withMessage('Valid category ID is required'),
  body('category').optional({ values: 'falsy' }).isMongoId().withMessage('Valid category ID is required'),
  body().custom((_value, { req }) => {
    if (!req.body?.categoriesId && !req.body?.categoryId && !req.body?.category) {
      throw new Error('Valid category ID is required');
    }
    return true;
  }),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  // SKU is optional — the controller auto-generates a unique one when missing
  body('sku').optional({ values: 'falsy' }).trim(),
  handleValidationErrors,
];

// PUT /api/products/:id — partial update; nothing is required, but whatever
// is provided must be valid.
export const validateProductUpdate = [
  body('name').optional().trim().isLength({ max: 200 }).withMessage('Name cannot exceed 200 characters'),
  body('description').optional().trim(),
  // The admin edit form sends categoriesId (JSON array via multipart)
  body('categoriesId').optional({ values: 'falsy' }).custom(validateCategoryIds),
  body('categoryId').optional({ values: 'falsy' }).isMongoId().withMessage('Valid category ID is required'),
  body('category').optional({ values: 'falsy' }).isMongoId().withMessage('Valid category ID is required'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
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
  // Images come via multipart upload — "image" = desktop (required, checked in
  // the controller because it may already be stored), "mobileImage" = mobile.
  body('image').optional().trim(),
  body('mobileImage').optional().trim(),
  body('altText').optional().trim().isLength({ max: 200 }).withMessage('Alt text cannot exceed 200 characters'),
  body('link').optional().trim().isLength({ max: 500 }).withMessage('Link cannot exceed 500 characters'),
  body('linkType')
    .optional()
    .isIn(['url', 'product', 'categories'])
    .withMessage('Link type must be url, product or categories'),
  // Banners live in the homepage hero slider only
  body('position').optional().isIn(['hero']).withMessage('Banners can only use the hero position'),
  body('sortOrder')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('Sort order must be a whole number starting from 1'),
  handleValidationErrors,
];

// PUT /api/banners/:id — partial update; whatever is provided must be valid.
export const validateBannerUpdate = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 }),
  body('altText').optional().trim().isLength({ max: 200 }).withMessage('Alt text cannot exceed 200 characters'),
  body('link').optional().trim().isLength({ max: 500 }).withMessage('Link cannot exceed 500 characters'),
  body('linkType')
    .optional()
    .isIn(['url', 'product', 'categories'])
    .withMessage('Link type must be url, product or categories'),
  body('position').optional().isIn(['hero']).withMessage('Banners can only use the hero position'),
  body('sortOrder')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('Sort order must be a whole number starting from 1'),
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

export const validateTrackOrder = [
  body('orderCode')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Order code is too long'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number is too long'),
  // At least one of orderCode / phone must be provided
  body().custom((value) => {
    if (!value?.orderCode && !value?.phone) {
      throw new Error('Please enter either an Order Code or a Phone Number');
    }
    return true;
  }),
  handleValidationErrors,
];

export const validateReview = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('comment').trim().notEmpty().withMessage('Comment is required').isLength({ max: 2000 }),
  // Guest reviews — required when no authenticated user (enforced in the controller)
  body('name').optional().trim().isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required').isLength({ max: 200 }),
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
