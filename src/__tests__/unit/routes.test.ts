import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import userRoutes from '../../routes/users';
import walletRoutes from '../../routes/wallet';

// Create a test router that mimics the main router
const createTestRouter = () => {
  const router = Router();

  /**
   * @swagger
   * /health:
   *   get:
   *     tags:
   *       - System
   *     summary: Health check
   *     description: Check if the API is running and healthy
   *     responses:
   *       200:
   *         description: API is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 healthy:
   *                   type: boolean
   *                   example: true
   */
  router.get('/health', (req, res) => {
    res.json({
      healthy: true,
    });
  });

  // API routes
  router.use('/users', userRoutes);
  router.use('/wallet', walletRoutes);

  return router;
};

describe('Routes Unit Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', createTestRouter());
  });

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        healthy: true,
      });
      expect(response.body).toHaveProperty('healthy');
      expect(typeof response.body.healthy).toBe('boolean');
      expect(response.body.healthy).toBe(true);
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});