import { WalletService } from '../../services/walletService';
import { UserService } from '../../services/userService';
import { TransactionRepository } from '../../repositories/transactionRepository';
import { Transaction, CreditRequest, DebitRequest, PaginatedResponse } from '../../types';
import { mockDatabase } from '../setup-unit';

// Mock the dependencies
jest.mock('../../services/userService');
jest.mock('../../repositories/transactionRepository');

describe('WalletService', () => {
  let walletService: WalletService;
  let mockUserService: jest.Mocked<UserService>;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create the service instance
    walletService = new WalletService();

    // Get mocked instances
    mockUserService = new UserService() as jest.Mocked<UserService>;
    mockTransactionRepository = new TransactionRepository() as jest.Mocked<TransactionRepository>;

    // Replace the service dependencies with our mocks
    (walletService as any).userService = mockUserService;
    (walletService as any).transactionRepository = mockTransactionRepository;
  });

  describe('creditUser', () => {
    const userId = 'user-123';
    const creditRequest: CreditRequest = {
      transactionId: 'credit-001',
      amount: 100.50,
      description: 'Welcome bonus',
      metadata: { source: 'bonus' }
    };

    const mockTransaction: Transaction = {
      id: 'txn-123',
      userId,
      transactionId: creditRequest.transactionId,
      type: 'credit',
      amount: creditRequest.amount,
      balanceBefore: 0,
      balanceAfter: 100.50,
      description: creditRequest.description,
      metadata: creditRequest.metadata,
      processedAt: new Date('2023-01-01'),
      createdAt: new Date('2023-01-01')
    };

    it('should credit user account successfully', async () => {
      mockUserService.validateUserExists.mockResolvedValue();
      mockTransactionRepository.getTransactionByTransactionId.mockResolvedValue(null);
      mockTransactionRepository.createTransaction.mockResolvedValue(mockTransaction);

      const result = await walletService.creditUser(userId, creditRequest);

      expect(mockUserService.validateUserExists).toHaveBeenCalledWith(userId);
      expect(mockTransactionRepository.getTransactionByTransactionId).toHaveBeenCalledWith(creditRequest.transactionId);
      expect(mockTransactionRepository.createTransaction).toHaveBeenCalledWith({
        userId,
        transactionId: creditRequest.transactionId,
        type: 'credit',
        amount: creditRequest.amount,
        description: creditRequest.description,
        metadata: creditRequest.metadata
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should return existing transaction if already processed (idempotent)', async () => {
      const existingTransaction: Transaction = { ...mockTransaction };
      mockTransactionRepository.getTransactionByTransactionId.mockResolvedValue(existingTransaction);

      const result = await walletService.creditUser(userId, creditRequest);

      expect(mockUserService.validateUserExists).not.toHaveBeenCalled(); // Should not validate user for existing transactions
      expect(mockTransactionRepository.getTransactionByTransactionId).toHaveBeenCalledWith(creditRequest.transactionId);
      expect(mockTransactionRepository.createTransaction).not.toHaveBeenCalled(); // Should not process again
      expect(result).toEqual(existingTransaction);
    });

    it('should validate user exists before processing', async () => {
      mockUserService.validateUserExists.mockRejectedValue(new Error('User not found'));
      mockTransactionRepository.getTransactionByTransactionId.mockResolvedValue(null);

      await expect(walletService.creditUser(userId, creditRequest))
        .rejects.toThrow('User not found');

      expect(mockUserService.validateUserExists).toHaveBeenCalledWith(userId);
      expect(mockTransactionRepository.getTransactionByTransactionId).toHaveBeenCalledWith(creditRequest.transactionId);
      expect(mockTransactionRepository.createTransaction).not.toHaveBeenCalled();
    });

    it('should validate amount is positive', async () => {
      const invalidRequest = { ...creditRequest, amount: -10 };
      mockUserService.validateUserExists.mockResolvedValue();
      mockTransactionRepository.getTransactionByTransactionId.mockResolvedValue(null);

      await expect(walletService.creditUser(userId, invalidRequest))
        .rejects.toThrow('Amount must be positive');

      expect(mockUserService.validateUserExists).toHaveBeenCalledWith(userId);
      expect(mockTransactionRepository.getTransactionByTransactionId).toHaveBeenCalledWith(invalidRequest.transactionId);
    });

    it('should validate amount has maximum 2 decimal places', async () => {
      const invalidRequest = { ...creditRequest, amount: 100.123 };
      mockUserService.validateUserExists.mockResolvedValue();
      mockTransactionRepository.getTransactionByTransactionId.mockResolvedValue(null);

      await expect(walletService.creditUser(userId, invalidRequest))
        .rejects.toThrow('Amount must have at most 2 decimal places');

      expect(mockUserService.validateUserExists).toHaveBeenCalledWith(userId);
      expect(mockTransactionRepository.getTransactionByTransactionId).toHaveBeenCalledWith(invalidRequest.transactionId);
    });

    it('should handle database errors', async () => {
      mockUserService.validateUserExists.mockResolvedValue();
      mockTransactionRepository.getTransactionByTransactionId.mockResolvedValue(null);
      mockTransactionRepository.createTransaction.mockRejectedValue(new Error('Database error'));

      await expect(walletService.creditUser(userId, creditRequest))
        .rejects.toThrow('Database error');

      expect(mockUserService.validateUserExists).toHaveBeenCalledWith(userId);
      expect(mockTransactionRepository.getTransactionByTransactionId).toHaveBeenCalledWith(creditRequest.transactionId);
    });
  });

  describe('debitUser', () => {
    const userId = 'user-123';
    const debitRequest: DebitRequest = {
      transactionId: 'debit-001',
      amount: 50.25,
      description: 'Game wager',
      metadata: { gameId: 'poker-123' }
    };

    const mockTransaction: Transaction = {
      id: 'txn-456',
      userId,
      transactionId: debitRequest.transactionId,
      type: 'debit',
      amount: debitRequest.amount,
      balanceBefore: 100.50,
      balanceAfter: 50.25,
      description: debitRequest.description,
      metadata: debitRequest.metadata,
      processedAt: new Date('2023-01-01'),
      createdAt: new Date('2023-01-01')
    };

    it('should debit user account successfully', async () => {
      mockUserService.validateUserExists.mockResolvedValue();
      mockTransactionRepository.getTransactionByTransactionId.mockResolvedValue(null);
      mockTransactionRepository.createTransaction.mockResolvedValue(mockTransaction);

      const result = await walletService.debitUser(userId, debitRequest);

      expect(mockUserService.validateUserExists).toHaveBeenCalledWith(userId);
      expect(mockTransactionRepository.getTransactionByTransactionId).toHaveBeenCalledWith(debitRequest.transactionId);
      expect(mockTransactionRepository.createTransaction).toHaveBeenCalledWith({
        userId,
        transactionId: debitRequest.transactionId,
        type: 'debit',
        amount: debitRequest.amount,
        description: debitRequest.description,
        metadata: debitRequest.metadata
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should return existing transaction if already processed (idempotent)', async () => {
      const existingTransaction: Transaction = { ...mockTransaction };
      mockUserService.validateUserExists.mockResolvedValue();
      mockTransactionRepository.getTransactionByTransactionId.mockResolvedValue(existingTransaction);

      const result = await walletService.debitUser(userId, debitRequest);

      expect(result).toEqual(existingTransaction);
      expect(mockTransactionRepository.createTransaction).not.toHaveBeenCalled();
    });

    it('should handle insufficient funds error', async () => {
      mockUserService.validateUserExists.mockResolvedValue();
      mockTransactionRepository.getTransactionByTransactionId.mockResolvedValue(null);

      const dbError = new Error('Insufficient funds');
      mockTransactionRepository.createTransaction.mockRejectedValue(dbError);

      await expect(walletService.debitUser(userId, debitRequest))
        .rejects.toThrow('Insufficient funds');

      expect(mockUserService.validateUserExists).toHaveBeenCalledWith(userId);
      expect(mockTransactionRepository.getTransactionByTransactionId).toHaveBeenCalledWith(debitRequest.transactionId);
    });

    it('should validate amount is positive', async () => {
      const invalidRequest = { ...debitRequest, amount: -10 };
      mockUserService.validateUserExists.mockResolvedValue();
      mockTransactionRepository.getTransactionByTransactionId.mockResolvedValue(null);

      await expect(walletService.debitUser(userId, invalidRequest))
        .rejects.toThrow('Amount must be positive');

      expect(mockUserService.validateUserExists).toHaveBeenCalledWith(userId);
      expect(mockTransactionRepository.getTransactionByTransactionId).toHaveBeenCalledWith(invalidRequest.transactionId);
    });

    it('should validate amount has maximum 2 decimal places', async () => {
      const invalidRequest = { ...debitRequest, amount: 50.789 };
      mockUserService.validateUserExists.mockResolvedValue();
      mockTransactionRepository.getTransactionByTransactionId.mockResolvedValue(null);

      await expect(walletService.debitUser(userId, invalidRequest))
        .rejects.toThrow('Amount must have at most 2 decimal places');

      expect(mockUserService.validateUserExists).toHaveBeenCalledWith(userId);
      expect(mockTransactionRepository.getTransactionByTransactionId).toHaveBeenCalledWith(invalidRequest.transactionId);
    });
  });

  describe('getUserBalance', () => {
    const userId = 'user-123';

    it('should return user balance', async () => {
      mockUserService.getUserBalance.mockResolvedValue(250.75);

      const result = await walletService.getUserBalance(userId);

      expect(mockUserService.getUserBalance).toHaveBeenCalledWith(userId);
      expect(result).toBe(250.75);
    });


    it('should handle case when balance is null', async () => {
      mockUserService.getUserBalance.mockResolvedValue(null);

      await expect(walletService.getUserBalance(userId))
        .rejects.toThrow('User not found');

      expect(mockUserService.getUserBalance).toHaveBeenCalledWith(userId);
    });
  });

  describe('getUserTransactions', () => {
    const userId = 'user-123';
    const query = { page: 1, limit: 10, type: 'credit' as const };

    const mockTransactions: Transaction[] = [
      {
        id: 'txn-1',
        userId,
        transactionId: 'credit-001',
        type: 'credit',
        amount: 100,
        balanceBefore: 0,
        balanceAfter: 100,
        description: 'Welcome bonus',
        processedAt: new Date('2023-01-01'),
        createdAt: new Date('2023-01-01')
      },
      {
        id: 'txn-2',
        userId,
        transactionId: 'credit-002',
        type: 'credit',
        amount: 50,
        balanceBefore: 100,
        balanceAfter: 150,
        description: 'Daily bonus',
        processedAt: new Date('2023-01-02'),
        createdAt: new Date('2023-01-02')
      }
    ];

    const mockPaginatedResponse: PaginatedResponse<Transaction> = {
      data: mockTransactions,
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      }
    };

    it('should return user transactions', async () => {
      mockUserService.validateUserExists.mockResolvedValue();
      mockTransactionRepository.getUserTransactions.mockResolvedValue(mockPaginatedResponse);

      const result = await walletService.getUserTransactions(userId, query);

      expect(mockUserService.validateUserExists).toHaveBeenCalledWith(userId);
      expect(mockTransactionRepository.getUserTransactions).toHaveBeenCalledWith(userId, query);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should validate user exists', async () => {
      mockUserService.validateUserExists.mockRejectedValue(new Error('User not found'));

      await expect(walletService.getUserTransactions(userId, query))
        .rejects.toThrow('User not found');

      expect(mockUserService.validateUserExists).toHaveBeenCalledWith(userId);
      expect(mockTransactionRepository.getTransactions).not.toHaveBeenCalled();
    });

    it('should handle empty query parameters', async () => {
      mockUserService.validateUserExists.mockResolvedValue();
      mockTransactionRepository.getUserTransactions.mockResolvedValue(mockPaginatedResponse);

      const result = await walletService.getUserTransactions(userId, {});

      expect(mockTransactionRepository.getUserTransactions).toHaveBeenCalledWith(userId, {});
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('validateAmount', () => {
    it('should pass for valid positive amounts', () => {
      expect(() => (walletService as any).validateAmount(100)).not.toThrow();
      expect(() => (walletService as any).validateAmount(0.01)).not.toThrow();
      expect(() => (walletService as any).validateAmount(999.99)).not.toThrow();
    });

    it('should throw for negative amounts', () => {
      expect(() => (walletService as any).validateAmount(-1)).toThrow('Amount must be positive');
      expect(() => (walletService as any).validateAmount(-0.01)).toThrow('Amount must be positive');
    });

    it('should throw for zero amounts', () => {
      expect(() => (walletService as any).validateAmount(0)).toThrow('Amount must be positive');
    });

    it('should throw for amounts with more than 2 decimal places', () => {
      expect(() => (walletService as any).validateAmount(100.123)).toThrow('Amount must have at most 2 decimal places');
      expect(() => (walletService as any).validateAmount(0.001)).toThrow('Amount must have at most 2 decimal places');
    });

    it('should pass for amounts with exactly 2 decimal places', () => {
      expect(() => (walletService as any).validateAmount(100.12)).not.toThrow();
      expect(() => (walletService as any).validateAmount(0.99)).not.toThrow();
    });

    it('should pass for whole numbers', () => {
      expect(() => (walletService as any).validateAmount(100)).not.toThrow();
      expect(() => (walletService as any).validateAmount(1)).not.toThrow();
    });
  });
});
