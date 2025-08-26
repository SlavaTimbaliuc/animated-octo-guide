import { TransactionRepository } from '../repositories/transactionRepository';
import { UserService } from './userService';
import { 
  Transaction, 
  CreateTransactionRequest, 
  CreditRequest, 
  DebitRequest,
  ListTransactionsQuery, 
  PaginatedResponse 
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

export class WalletService {
  private transactionRepository: TransactionRepository;
  private userService: UserService;

  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.userService = new UserService();
  }

  private validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Check if amount has at most 2 decimal places
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      throw new Error('Amount must have at most 2 decimal places');
    }
  }

  async creditUser(userId: string, request: CreditRequest): Promise<Transaction> {
    logger.info('Processing credit transaction', { userId, transactionId: request.transactionId, amount: request.amount });
    
    // Check for idempotency - if transaction already exists, return it
    const existingTransaction = await this.transactionRepository.getTransactionByTransactionId(request.transactionId);
    if (existingTransaction) {
      if (existingTransaction.userId !== userId) {
        throw new Error('Transaction ID belongs to a different user');
      }
      if (existingTransaction.type !== 'credit') {
        throw new Error('Transaction ID already used for a different operation type');
      }
      logger.info('Returning existing credit transaction (idempotent)', { transactionId: request.transactionId });
      return existingTransaction;
    }

    // Validate user exists and is active
    await this.userService.validateUserExists(userId);

    // Validate amount
    this.validateAmount(request.amount);

    const transactionData: CreateTransactionRequest = {
      userId,
      transactionId: request.transactionId,
      type: 'credit',
      amount: request.amount,
      description: request.description,
      metadata: request.metadata,
    };

    const transaction = await this.transactionRepository.createTransaction(transactionData);
    
    logger.info('Credit transaction completed successfully', { 
      transactionId: request.transactionId, 
      userId, 
      amount: request.amount,
      newBalance: transaction.balanceAfter 
    });
    
    return transaction;
  }

  async debitUser(userId: string, request: DebitRequest): Promise<Transaction> {
    logger.info('Processing debit transaction', { userId, transactionId: request.transactionId, amount: request.amount });
    
    // Check for idempotency - if transaction already exists, return it
    const existingTransaction = await this.transactionRepository.getTransactionByTransactionId(request.transactionId);
    if (existingTransaction) {
      if (existingTransaction.userId !== userId) {
        throw new Error('Transaction ID belongs to a different user');
      }
      if (existingTransaction.type !== 'debit') {
        throw new Error('Transaction ID already used for a different operation type');
      }
      logger.info('Returning existing debit transaction (idempotent)', { transactionId: request.transactionId });
      return existingTransaction;
    }

    // Validate user exists and is active
    await this.userService.validateUserExists(userId);

    // Validate amount
    this.validateAmount(request.amount);

    const transactionData: CreateTransactionRequest = {
      userId,
      transactionId: request.transactionId,
      type: 'debit',
      amount: request.amount,
      description: request.description,
      metadata: request.metadata,
    };

    const transaction = await this.transactionRepository.createTransaction(transactionData);
    
    logger.info('Debit transaction completed successfully', { 
      transactionId: request.transactionId, 
      userId, 
      amount: request.amount,
      newBalance: transaction.balanceAfter 
    });
    
    return transaction;
  }

  async processWager(userId: string, amount: number, gameId?: string, metadata?: Record<string, any>): Promise<Transaction> {
    const transactionId = `wager_${uuidv4()}_${Date.now()}`;
    
    logger.info('Processing wager transaction', { userId, transactionId, amount, gameId });
    
    await this.userService.validateUserExists(userId);

    const transactionData: CreateTransactionRequest = {
      userId,
      transactionId,
      type: 'wager',
      amount,
      description: gameId ? `Wager for game ${gameId}` : 'Game wager',
      metadata: { gameId, ...metadata },
    };

    const transaction = await this.transactionRepository.createTransaction(transactionData);
    
    logger.info('Wager transaction completed successfully', { 
      transactionId, 
      userId, 
      amount,
      newBalance: transaction.balanceAfter 
    });
    
    return transaction;
  }

  async processPayout(userId: string, amount: number, gameId?: string, metadata?: Record<string, any>): Promise<Transaction> {
    const transactionId = `payout_${uuidv4()}_${Date.now()}`;
    
    logger.info('Processing payout transaction', { userId, transactionId, amount, gameId });
    
    await this.userService.validateUserExists(userId);

    const transactionData: CreateTransactionRequest = {
      userId,
      transactionId,
      type: 'payout',
      amount,
      description: gameId ? `Payout for game ${gameId}` : 'Game payout',
      metadata: { gameId, ...metadata },
    };

    const transaction = await this.transactionRepository.createTransaction(transactionData);
    
    logger.info('Payout transaction completed successfully', { 
      transactionId, 
      userId, 
      amount,
      newBalance: transaction.balanceAfter 
    });
    
    return transaction;
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    return this.transactionRepository.getTransactionById(id);
  }

  async getTransactionByTransactionId(transactionId: string): Promise<Transaction | null> {
    return this.transactionRepository.getTransactionByTransactionId(transactionId);
  }

  async getTransactions(params: ListTransactionsQuery): Promise<PaginatedResponse<Transaction>> {
    logger.debug('Fetching transactions list', params);
    return this.transactionRepository.getTransactions(params);
  }

  async getUserTransactions(
    userId: string, 
    params: Pick<ListTransactionsQuery, 'page' | 'limit' | 'sortBy' | 'sortOrder' | 'type' | 'dateFrom' | 'dateTo'>
  ): Promise<PaginatedResponse<Transaction>> {
    logger.debug('Fetching user transactions', { userId, ...params });
    
    // Validate user exists
    await this.userService.validateUserExists(userId);
    
    return this.transactionRepository.getUserTransactions(userId, params);
  }

  async getUserBalance(userId: string): Promise<number> {
    const balance = await this.userService.getUserBalance(userId);
    if (balance === null) {
      throw new Error('User not found');
    }
    return balance;
  }

  async getTransactionStats(userId?: string): Promise<{
    totalTransactions: number;
    totalCredits: number;
    totalDebits: number;
    totalWagers: number;
    totalPayouts: number;
  }> {
    if (userId) {
      await this.userService.validateUserExists(userId);
    }
    
    return this.transactionRepository.getTransactionStats(userId);
  }
}
