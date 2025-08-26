import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { Request, Response, NextFunction } from 'express';
import routes from './routes';
import { ApiResponse } from './types';
import { authenticateApiKey } from './utils/auth';
import logger from './utils/logger';
import config from './config';
import { specs } from './config/swagger';

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger UI (before API key middleware so it's accessible)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });
  next();
});

// API Key authentication middleware for all routes
app.use('/api', authenticateApiKey);

// Mount routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    data: {
      message: 'Welcome to Yeet Casino API! 🎰',
      documentation: {
        swagger_ui: '/api-docs',
        health_check: '/api/health',
      },
      endpoints: {
        users: '/api/users',
        wallet: '/api/wallet',
        health: '/api/health',
      },
    },
  } as ApiResponse);
});


// 404 handler (must be last)
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  } as ApiResponse);
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
   logger.error('Unhandled error', {
     error: err.message,
     stack: err.stack,
     url: req.url,
     method: req.method,
   });

   res.status(500).json({
     error: {
       code: 'INTERNAL_ERROR',
       message: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
     },
   } as ApiResponse);
});

export default app;
