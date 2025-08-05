import logger from '@/configs/logger';
import APIError from '@/lib/errors/APIError';
import { AUTHORIZATION_ERRORS } from '@/lib/errors/AUTHORIZATION_ERRORS';
import { Request, Response, NextFunction } from 'express';

const requireCollector = (req: Request, _: Response, next: NextFunction) => {
  logger.info('req.user', req.user);
  if (!req.user || req.user.departmentRole !== 'collector') {
    logger.error('unauth in collector');
    throw new APIError(AUTHORIZATION_ERRORS.AUTHORIZATION_ERROR);
  }
  next();
};

export default requireCollector;
