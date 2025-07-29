import { ZodError, ZodIssue } from 'zod';

export type ErrorType = ZodError | Record<string, unknown>[] | ZodIssue[];

export interface IAPIError {
  STATUS: HttpErrorStatusCode;
  TITLE: string;
  MESSAGE?: string;
  ERRORS?: ErrorType;
  META?: Record<string, unknown>;
}

export interface IErrorData {
  [key: string]: {
    STATUS: HttpErrorStatusCode;
    TITLE: string;
    MESSAGE?: string;
    ERRORS?: ErrorType;
  };
}

export interface IHttpErrorResponse {
  title: string;
  message?: string;
  success: boolean;
  status: number;
  meta?: Record<string, unknown>;
  errors: ErrorType;
  timestamp: string;
}

export enum HttpErrorStatusCode {
  BAD_REQUEST = 400,
  CONFLICT = 409,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  INTERNAL_SERVER = 500,
  TOO_MANY_REQUEST = 429,
}