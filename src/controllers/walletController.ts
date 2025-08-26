import { Request, Response } from 'express';
import { WalletService } from '../services/walletService';
import { ApiResponse, CreditRequest, DebitRequest, ListTransactionsQuery } from '../types';
import { 
  creditSchema, 
  debitSchema, 
  userIdSchema, 
  listTransactionsSchema 
} from '../utils/validation';
import { AuthenticatedRequest } from '../utils/auth';
import logger from '../utils/logger';

export class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  creditUser = async (req: Request, res: Response): Promise<any> => {
    try {
      const { error: paramError, value: paramValue } = userIdSchema.validate(req.params);
      if (paramError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID',
            details: paramError.details,
          },
        } as ApiResponse);
      }

      const { error: bodyError, value: bodyValue } = creditSchema.validate(req.body);
      if (bodyError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: bodyError.details,
          },
        } as ApiResponse);
      }

      const { userId } = paramValue;
      const creditRequest: CreditRequest = bodyValue;

      const transaction = await this.walletService.creditUser(userId, creditRequest);
      res.status(201).json(transaction);
    } catch (error: any) {
      logger.error('Failed to credit user', { error: error.message, userId: req.params.userId });

      if (error.message.includes('User not found')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        } as ApiResponse);
      }

      if (error.message.includes('Transaction ID')) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message,
          },
        } as ApiResponse);
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process credit transaction',
        },
      } as ApiResponse);
    }
  };

  debitUser = async (req: Request, res: Response): Promise<any> => {
    try {
      const { error: paramError, value: paramValue } = userIdSchema.validate(req.params);
      if (paramError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID',
            details: paramError.details,
          },
        } as ApiResponse);
      }

      const { error: bodyError, value: bodyValue } = debitSchema.validate(req.body);
      if (bodyError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: bodyError.details,
          },
        } as ApiResponse);
      }

      const { userId } = paramValue;
      const debitRequest: DebitRequest = bodyValue;

      const transaction = await this.walletService.debitUser(userId, debitRequest);
      res.status(201).json(transaction);
    } catch (error: any) {
      logger.error('Failed to debit user', { error: error.message, userId: req.params.userId });

      if (error.message.includes('User not found')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        } as ApiResponse);
      }

      if (error.message.includes('Insufficient funds')) {
        return res.status(400).json({
          error: {
            code: 'INSUFFICIENT_FUNDS',
            message: 'Insufficient funds',
          },
        } as ApiResponse);
      }

      if (error.message.includes('Transaction ID')) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message,
          },
        } as ApiResponse);
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process debit transaction',
        },
      } as ApiResponse);
    }
  };

  getUserBalance = async (req: Request, res: Response): Promise<any> => {
    try {
      const { error, value } = userIdSchema.validate(req.params);
      if (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID',
            details: error.details,
          },
        } as ApiResponse);
      }

      const { userId } = value;
      const balance = await this.walletService.getUserBalance(userId);

      res.json({ balance });
    } catch (error: any) {
      logger.error('Failed to get user balance', { error: error.message, userId: req.params.userId });

      if (error.message.includes('User not found')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        } as ApiResponse);
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user balance',
        },
      } as ApiResponse);
    }
  };

  getUserTransactions = async (req: Request, res: Response): Promise<any> => {
    try {
      const { error: paramError, value: paramValue } = userIdSchema.validate(req.params);
      if (paramError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID',
            details: paramError.details,
          },
        } as ApiResponse);
      }

      const { error: queryError, value: queryValue } = listTransactionsSchema.validate(req.query);
      if (queryError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: queryError.details,
          },
        } as ApiResponse);
      }

      const { userId } = paramValue;
      const params = queryValue;

      const transactions = await this.walletService.getUserTransactions(userId, params);

      res.json(transactions);
    } catch (error: any) {
      logger.error('Failed to get user transactions', { error: error.message, userId: req.params.userId });

      if (error.message.includes('User not found')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        } as ApiResponse);
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user transactions',
        },
      } as ApiResponse);
    }
  };

  getTransactions = async (req: Request, res: Response): Promise<any> => {
    try {
      const { error, value } = listTransactionsSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.details,
          },
        } as ApiResponse);
      }

      const params: ListTransactionsQuery = value;
      const transactions = await this.walletService.getTransactions(params);

      res.json(transactions);
    } catch (error: any) {
      logger.error('Failed to get transactions', { error: error.message });
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve transactions',
        },
      } as ApiResponse);
    }
  };

  getMyBalance = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        } as ApiResponse);
      }

      const balance = await this.walletService.getUserBalance(req.user.id);

      res.json({ balance });
    } catch (error: any) {
      logger.error('Failed to get user balance', { error: error.message, userId: req.user?.id });
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve balance',
        },
      } as ApiResponse);
    }
  };

  getMyTransactions = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        } as ApiResponse);
      }

      const { error, value } = listTransactionsSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.details,
          },
        } as ApiResponse);
      }

      const params = value;
      const transactions = await this.walletService.getUserTransactions(req.user.id, params);

      res.json(transactions);
    } catch (error: any) {
      logger.error('Failed to get user transactions', { error: error.message, userId: req.user?.id });
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve transactions',
        },
      } as ApiResponse);
    }
  };

  getTransactionStats = async (req: Request, res: Response): Promise<any> => {
    try {
      const stats = await this.walletService.getTransactionStats();

      res.json(stats);
    } catch (error: any) {
      logger.error('Failed to get transaction stats', { error: error.message });
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve transaction statistics',
        },
      } as ApiResponse);
    }
  };

  getUserTransactionStats = async (req: Request, res: Response): Promise<any> => {
    try {
      const { error, value } = userIdSchema.validate(req.params);
      if (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID',
            details: error.details,
          },
        } as ApiResponse);
      }

      const { userId } = value;
      const stats = await this.walletService.getTransactionStats(userId);

      res.json(stats);
    } catch (error: any) {
      logger.error('Failed to get user transaction stats', { error: error.message, userId: req.params.userId });

      if (error.message.includes('User not found')) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        } as ApiResponse);
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user transaction statistics',
        },
      } as ApiResponse);
    }
  };
}
