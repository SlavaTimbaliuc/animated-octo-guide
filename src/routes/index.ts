import { Router } from 'express';
import userRoutes from './users';
import walletRoutes from './wallet';

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

export default router;
