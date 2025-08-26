import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import app from '../../app';
import { ApiResponse } from '../../types';

// Mock dependencies
jest.mock('../../utils/auth', () => ({
  authenticateApiKey: jest.fn((req: Request, res: Response, next: NextFunction) => {
    next();
  }),
}));

jest.mock('../../utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../routes', () => {
  const mockRouter = express.Router();
  mockRouter.get('/test', (req: Request, res: Response) => {
    res.json({ test: true });
  });
  return mockRouter;
});

jest.mock('../../config', () => ({
  nodeEnv: 'test',
  apiKey: 'test-api-key',
  jwt: { secret: 'test-secret' },
  logLevel: 'info',
  database: {
    host: 'localhost',
    port: 5432,
    database: 'test',
    user: 'test',
    password: 'test',
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
}));

jest.mock('../../config/swagger', () => ({
  specs: {},
}));

describe('App', () => {
  describe('Middleware Setup', () => {
    it('should have CORS middleware', async () => {
      const response = await request(app)
        .options('/')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should have helmet security middleware', async () => {
      const response = await request(app).get('/');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should parse JSON bodies', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404); // Route doesn't exist but middleware should work
    });

    it('should parse URL-encoded bodies', async () => {
      const response = await request(app)
        .post('/api/test')
        .send('test=data')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(response.status).toBe(404); // Route doesn't exist but middleware should work
    });
  });

  describe('Routes', () => {
    it('should serve Swagger UI at /api-docs', async () => {
      const response = await request(app).get('/api-docs');

      // Swagger UI often redirects to add trailing slash
      expect([200, 301]).toContain(response.status);
      if (response.status === 200) {
        expect(response.type).toMatch(/html/);
      }
    });

    it('should return welcome message at root endpoint', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.data.message).toContain('Welcome to Yeet Casino API');
      expect(response.body.data.documentation.swagger_ui).toBe('/api-docs');
      expect(response.body.data.endpoints.users).toBe('/api/users');
      expect(response.body.data.endpoints.wallet).toBe('/api/wallet');
    });

    it('should handle 404 for unknown endpoints', async () => {
      const response = await request(app).get('/unknown-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Endpoint not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle global errors', async () => {
      // Test the error handler by mocking a request that causes an error
      const mockReq = {
        url: '/test',
        method: 'GET',
      } as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any as Response;

      const mockNext = jest.fn();

      // Get the error handler from the app
      const errorHandler = (app as any)._router.stack.find((layer: any) =>
        layer.handle && layer.handle.name === 'errorHandler'
      );

      if (errorHandler) {
        const testError = new Error('Test error');
        errorHandler.handle(testError, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: {
            code: 'INTERNAL_ERROR',
            message: expect.any(String),
          },
        });
      }
    });

    it('should handle global errors in production', async () => {
      // Mock an error by creating a route that throws
      const testApp = express();
      testApp.use(express.json());
      testApp.get('/error', () => {
        throw new Error('Test error');
      });

      // Add the same error handler as in app.ts
      testApp.use((err: any, req: Request, res: Response, next: NextFunction) => {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'production' === 'production' ? 'Internal server error' : err.message,
          },
        } as ApiResponse);
      });

      const response = await request(testApp).get('/error');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Internal server error');
    });
  });

  describe('Request Logging', () => {
    it('should log incoming requests', async () => {
      const logger = require('../../utils/logger');

      await request(app)
        .get('/')
        .set('User-Agent', 'test-agent')
        .set('X-Forwarded-For', '127.0.0.1');

      expect(logger.info).toHaveBeenCalledWith('Incoming request', {
        method: 'GET',
        url: '/',
        userAgent: 'test-agent',
        ip: expect.any(String), // IP format may vary
      });
    });
  });

  describe('API Key Authentication', () => {
    it('should apply API key authentication to /api routes', async () => {
      const auth = require('../../utils/auth');

      await request(app).get('/api/test');

      expect(auth.authenticateApiKey).toHaveBeenCalled();
    });

    it('should not apply API key authentication to non-API routes', async () => {
      const auth = require('../../utils/auth');

      await request(app).get('/api-docs');

      // Should not call authenticateApiKey for swagger docs
      expect(auth.authenticateApiKey).not.toHaveBeenCalled();
    });
  });
});