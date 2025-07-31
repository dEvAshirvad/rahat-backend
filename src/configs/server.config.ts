import express, { Express } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import Respond from '@/lib/respond';
import serveEmojiFavicon from '@/middlewares/serveEmojiFavicon';
import requestLogger from '@/middlewares/requestLogger';
import { errorHandler } from '@/middlewares/error-handler';
import jwksVerifier from '@/middlewares/jwks-verifier';
import router from '@/modules';
import sessionDeserializer from '@/middlewares/session-deserializer';

const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3030',
  'http://localhost:3031',
  'http://localhost:3032',
  'http://localhost:3033',
  'http://localhost:3034',
  'http://localhost:3035',
  'http://localhost:3036',
  'http://localhost:3037',
  'http://localhost:3038',
  'http://localhost:3039',
  'http://69.62.77.63:3030',
  'http://69.62.77.63:3031',
  'http://69.62.77.63:3032',
  'http://69.62.77.63:3033',
  'http://69.62.77.63:3034',
  'http://69.62.77.63:3035',
  'http://69.62.77.63:3036',
  'http://69.62.77.63:3037',
  'http://69.62.77.63:3038',
  'http://69.62.77.63:3039',
  'https://kpiservice.rdmp.in',
  'https://auth.rdmp.in',
  'https://shresth.rdmp.in',
  'https://rahat.rdmp.in',
  'https://filesapi.rdmp.in',
];

export function createRouter(): Express {
  return express();
}

export default function createApp() {
  const app = createRouter();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'", "'unsafe-inline'", 'data:', 'https:', 'http:'],
          scriptSrc: ["'self'", "'unsafe-inline'", 'data:', 'https:', 'http:'],
          styleSrc: ["'self'", "'unsafe-inline'", 'data:', 'https:', 'http:'],
          imgSrc: ["'self'", 'data:', 'https:', 'http:', 'blob:'],
          connectSrc: [
            "'self'",
            ...allowedOrigins,
            'https:',
            'http:',
            'ws:',
            'wss:',
          ],
          fontSrc: ["'self'", 'https:', 'http:', 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'", 'data:', 'https:', 'http:'],
          frameSrc: ["'self'", 'data:', 'https:', 'http:'],
          workerSrc: ["'self'", 'blob:'],
          childSrc: ["'self'", 'blob:'],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'unsafe-none' },
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '2048mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2048mb' }));
  app.use(requestLogger());
  app.use(
    cors({
      credentials: true,
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
    })
  );
  app.use(serveEmojiFavicon('🔥'));
  app.get('/', (_, res) => {
    Respond(res, { message: 'API services are nominal!!' }, 200);
  });
  app.use(sessionDeserializer);
  app.use('/api/v1', router);

  app.use(errorHandler);
  return app;
}
