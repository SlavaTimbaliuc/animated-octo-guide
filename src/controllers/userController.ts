import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { WalletService } from '../services/walletService';
import { ApiResponse, CreateUserRequest, ListUsersQuery } from '../types';
import { 
  createUserSchema, 
  listUsersSchema, 
  userIdSchema 
} from '../utils/validation';
import { AuthenticatedRequest } from '../utils/auth';
import logger from '../utils/logger';

export class UserController {
  private userService: UserService;
  private walletService: WalletService;

  constructor() {
    this.userService = new UserService();
    this.walletService = new WalletService();
  }

  createUser = async (req: Request, res: Response): Promise<any> => {
    try {
      const { error, value } = createUserSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.details,
          },
        } as ApiResponse);
        return;
      }

      const userData: CreateUserRequest = value;
      const result = await this.userService.createUser(userData);

      res.status(201).json({
        data: result,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Failed to create user', { error: error.message });
      
      if (error.message.includes('already exists')) {
        res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message,
          },
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create user',
        },
      } as ApiResponse);
    }
  };

  login = async (req: Request, res: Response): Promise<any> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
          },
        } as ApiResponse);
        return;
      }

      const result = await this.userService.authenticateUser(email, password);

      if (!result) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid credentials',
          },
        } as ApiResponse);
        return;
      }
      
      res.json({
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      logger.error('Login failed', { error: error.message });

      if (error.message.includes('Account is')) {
        res.status(403).json({
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: error.message,
          },
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed',
        },
      } as ApiResponse);
    }
  };

  getUsers = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { error, value } = listUsersSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.details,
          },
        } as ApiResponse);
      }

      const params: ListUsersQuery = value;
      const result = await this.userService.getUsers(params);

      return res.json(result);
    } catch (error: any) {
      logger.error('Failed to get users', { error: error.message });
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve users',
        },
      } as ApiResponse);
    }
  };

  getUserById = async (req: Request, res: Response): Promise<any> => {
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
      const user = await this.userService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        } as ApiResponse);
      }

      res.json(user);
    } catch (error: any) {
      logger.error('Failed to get user', { error: error.message, userId: req.params.userId });
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user',
        },
      } as ApiResponse);
    }
  };

  getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        } as ApiResponse);
      }

      const user = await this.userService.getUserById(req.user.id);

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        } as ApiResponse);
      }

      // Get user balance and recent transactions
      const [balance, recentTransactions] = await Promise.all([
        this.walletService.getUserBalance(user.id),
        this.walletService.getUserTransactions(user.id, { page: 1, limit: 5 }),
      ]);

      res.json({
        user,
        balance,
        recentTransactions,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Failed to get current user', { error: error.message, userId: req.user?.id });
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user information',
        },
      } as ApiResponse);
    }
  };

  updateUserStatus = async (req: Request, res: Response): Promise<any> => {
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

      const { status } = req.body;
      if (!status || !['active', 'suspended', 'inactive'].includes(status)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Valid status is required (active, suspended, inactive)',
          },
        } as ApiResponse);
      }

      const { userId } = paramValue;
      const user = await this.userService.updateUserStatus(userId, status);

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        } as ApiResponse);
      }

      res.json({
        data: user,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Failed to update user status', { error: error.message, userId: req.params.userId });
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user status',
        },
      } as ApiResponse);
    }
  };
}
