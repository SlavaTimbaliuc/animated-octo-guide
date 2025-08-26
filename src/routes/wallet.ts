import { Router } from 'express';
import { WalletController } from '../controllers/walletController';
import { authenticateToken, requireAdmin } from '../utils/auth';

const router = Router();
const walletController = new WalletController();

/**
 * @swagger
 * /wallet/balance:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Get my balance
 *     description: Get the authenticated user's current balance
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                   format: decimal
 *                   example: 19299.29
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/balance', authenticateToken, walletController.getMyBalance);

/**
 * @swagger
 * /wallet/transactions:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Get my transactions
 *     description: Get the authenticated user's transaction history with pagination
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number to retrieve
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of transactions per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [processedAt, amount, type]
 *           default: processedAt
 *         description: Field to sort transactions by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [credit, debit, wager, payout, bonus, refund]
 *         description: Filter by transaction type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions from this date (ISO format)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions to this date (ISO format)
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     pages:
 *                       type: integer
 *                       example: 8
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/transactions', authenticateToken, walletController.getMyTransactions);

/**
 * @swagger
 * /wallet/users/{userId}/credit:
 *   post:
 *     tags:
 *       - Wallet
 *     summary: Credit user balance (Admin only)
 *     description: Add funds to a user's balance (Admin access required)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0.01
 *                 example: 50.00
 *               description:
 *                 type: string
 *                 example: "Admin bonus credit"
 *     responses:
 *       200:
 *         description: User credited successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/users/:userId/credit', authenticateToken, requireAdmin, walletController.creditUser);

/**
 * @swagger
 * /wallet/users/{userId}/debit:
 *   post:
 *     tags:
 *       - Wallet
 *     summary: Debit user balance (Admin only)
 *     description: Deduct funds from a user's balance (Admin access required)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0.01
 *                 example: 25.00
 *               description:
 *                 type: string
 *                 example: "Admin deduction"
 *     responses:
 *       200:
 *         description: User debited successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       402:
 *         description: Insufficient funds
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/users/:userId/debit', authenticateToken, requireAdmin, walletController.debitUser);

/**
 * @swagger
 * /wallet/users/{userId}/balance:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Get user balance (Admin only)
 *     description: Get a specific user's balance (Admin access required)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                   format: decimal
 *                   example: 19299.29
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/users/:userId/balance', authenticateToken, requireAdmin, walletController.getUserBalance);

/**
 * @swagger
 * /wallet/users/{userId}/transactions:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Get user transactions (Admin only)
 *     description: Get a specific user's transaction history with pagination (Admin access required)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number to retrieve
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of transactions per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [processedAt, amount, type]
 *           default: processedAt
 *         description: Field to sort transactions by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [credit, debit, wager, payout, bonus, refund]
 *         description: Filter by transaction type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions from this date (ISO format)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions to this date (ISO format)
 *     responses:
 *       200:
 *         description: User transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     pages:
 *                       type: integer
 *                       example: 8
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/users/:userId/transactions', authenticateToken, requireAdmin, walletController.getUserTransactions);

/**
 * @swagger
 * /wallet/users/{userId}/stats:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Get user transaction stats (Admin only)
 *     description: Get transaction statistics for a specific user (Admin access required)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User transaction stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_transactions:
 *                   type: integer
 *                   example: 25
 *                 total_credits:
 *                   type: number
 *                   format: decimal
 *                   example: 500.00
 *                 total_debits:
 *                   type: number
 *                   format: decimal
 *                   example: 350.00
 *                 current_balance:
 *                   type: number
 *                   format: decimal
 *                   example: 150.00
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/users/:userId/stats', authenticateToken, requireAdmin, walletController.getUserTransactionStats);

/**
 * @swagger
 * /wallet/transactions:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Get all transactions (Admin only)
 *     description: Get system-wide transaction history with pagination (Admin access required)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number to retrieve
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of transactions per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [processedAt, amount, type]
 *           default: processedAt
 *         description: Field to sort transactions by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [credit, debit, wager, payout, bonus, refund]
 *         description: Filter by transaction type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions from this date (ISO format)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions to this date (ISO format)
 *     responses:
 *       200:
 *         description: System transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 50
 *                     total:
 *                       type: integer
 *                       example: 1250
 *                     pages:
 *                       type: integer
 *                       example: 25
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/transactions', authenticateToken, requireAdmin, walletController.getTransactions);

/**
 * @swagger
 * /wallet/stats:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Get system transaction stats (Admin only)
 *     description: Get system-wide transaction statistics (Admin access required)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: System transaction stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalTransactions:
 *                   type: integer
 *                   example: 2
 *                 totalCredits:
 *                   type: number
 *                   format: decimal
 *                   example: 500.00
 *                 totalDebits:
 *                   type: number
 *                   format: decimal
 *                   example: 200.00
 *                 totalPayouts:
 *                   type: number
 *                   format: decimal
 *                   example: 0
 *                 totalWagers:
 *                   type: number
 *                   format: decimal
 *                   example: 0
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', authenticateToken, requireAdmin, walletController.getTransactionStats);

export default router;
