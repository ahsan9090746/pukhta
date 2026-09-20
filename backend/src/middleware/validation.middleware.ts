import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const validation of validations) {
      const result = await validation.run(req);
      if (result.array().length > 0) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

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
  };
};
