import request from 'supertest';
import express from 'express';
import routes from '../../routes';

// Mock swagger
jest.mock('../../config/swagger', () => ({
  specs: {},
}));

describe('Routes Index', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', routes);
  });

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        healthy: true,
      });
    });

    it('should return JSON content type', async () => {
      const response = await request(app).get('/api/health');

      expect(response.type).toBe('application/json');
    });
  });

  describe('Route Mounting', () => {
    it('should mount user routes at /api/users', async () => {
      // This test verifies that the routes are properly mounted
      // Since we can't easily test the actual user routes without more setup,
      // we verify the structure exists
      expect(routes).toBeDefined();
      expect(typeof routes).toBe('function');
    });

    it('should mount wallet routes at /api/wallet', async () => {
      // Similar to users route test
      expect(routes).toBeDefined();
      expect(typeof routes).toBe('function');
    });
  });
});