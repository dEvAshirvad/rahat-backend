import APIError from '@/lib/errors/APIError';
import { AUTHORIZATION_ERRORS } from '@/lib/errors/AUTHORIZATION_ERRORS';
import { Request, Response, NextFunction } from 'express';

const requireTehsildar = (req: Request, _: Response, next: NextFunction) => {
  if (
    !req.user ||
    (req.user.department !== 'collector-office' &&
      req.user.departmentRole !== 'tehsildar')
  ) {
    throw new APIError(AUTHORIZATION_ERRORS.AUTHORIZATION_ERROR);
  }
  next();
};

export default requireTehsildar;
