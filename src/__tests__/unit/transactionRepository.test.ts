import { TransactionRepository } from '../../repositories/transactionRepository';
import database from '../../database';
import logger from '../../utils/logger';

// Mock dependencies
jest.mock('../../database');
jest.mock('../../utils/logger');

// Create mock functions
const mockQuery = jest.fn();
const mockToCamelCase = jest.fn();

// Set up mocks
(database as jest.Mocked<typeof database>).query = mockQuery;
(database as jest.Mocked<typeof database>).toCamelCase = mockToCamelCase;

// Mock logger
(logger as jest.Mocked<typeof logger>).error = jest.fn();

describe('TransactionRepository', () => {
  let transactionRepository: TransactionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    transactionRepository = new TransactionRepository();
  });

  describe('createTransaction', () => {
    const transactionData = {
      userId: 'user-123',
      transactionId: 'txn-456',
      type: 'credit' as const,
      amount: 100.50,
      description: 'Test transaction',
      metadata: { source: 'test' },
    };

    const rawTransactionData = {
      id: 'txn-id-123',
      user_id: 'user-123',
      transaction_id: 'txn-456',
      type: 'credit',
      amount: '100.50',
      balance_before: '50.00',
      balance_after: '150.50',
      description: 'Test transaction',
      metadata: '{"source": "test"}',
      processed_at: '2023-01-01T10:00:00Z',
      created_at: '2023-01-01T10:00:00Z',
    };

    const convertedTransaction = {
      id: 'txn-id-123',
      userId: 'user-123',
      transactionId: 'txn-456',
      type: 'credit',
      amount: 100.50,
      balanceBefore: 50.00,
      balanceAfter: 150.50,
      description: 'Test transaction',
      metadata: '{"source": "test"}',
      processedAt: expect.any(String), // Now returns current timestamp as string
      createdAt: new Date('2023-01-01T10:00:00Z'),
    };

    it('should create transaction successfully', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ transaction_data: rawTransactionData }],
      });
      mockToCamelCase.mockReturnValue({
        id: 'txn-id-123',
        userId: 'user-123',
        transactionId: 'txn-456',
        type: 'credit',
        amount: '100.50',
        balanceBefore: '50.00',
        balanceAfter: '150.50',
        description: 'Test transaction',
        metadata: '{"source": "test"}',
        processedAt: new Date('2023-01-01T10:00:00Z'),
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });

      const result = await transactionRepository.createTransaction(transactionData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM process_transaction'),
        [transactionData.userId, transactionData.transactionId, transactionData.type, transactionData.amount, transactionData.description, JSON.stringify(transactionData.metadata)]
      );
      expect(result).toEqual(convertedTransaction);
    });

    it('should create transaction with null description and metadata', async () => {
      const simpleTransactionData = {
        userId: 'user-123',
        transactionId: 'txn-456',
        type: 'debit' as const,
        amount: 50.00,
      };

      mockQuery.mockResolvedValue({
        rows: [{ transaction_data: rawTransactionData }],
      });
      mockToCamelCase.mockReturnValue({
        id: 'txn-id-123',
        userId: 'user-123',
        transactionId: 'txn-456',
        type: 'debit',
        amount: '50.00',
        balanceBefore: '100.00',
        balanceAfter: '50.00',
        description: null,
        metadata: null,
        processedAt: new Date('2023-01-01T10:00:00Z'),
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });

      await transactionRepository.createTransaction(simpleTransactionData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM process_transaction'),
        [simpleTransactionData.userId, simpleTransactionData.transactionId, simpleTransactionData.type, simpleTransactionData.amount, null, null]
      );
    });

    it('should throw error for user not found', async () => {
      const error = new Error('User not found');
      mockQuery.mockRejectedValue(error);

      await expect(transactionRepository.createTransaction(transactionData)).rejects.toThrow('User not found');
      expect(logger.error).toHaveBeenCalledWith('Failed to create transaction', { error: error.message, transactionData });
    });

    it('should throw error for insufficient funds', async () => {
      const error = new Error('Insufficient funds');
      mockQuery.mockRejectedValue(error);

      await expect(transactionRepository.createTransaction(transactionData)).rejects.toThrow('Insufficient funds');
    });

    it('should throw error for duplicate transaction ID', async () => {
      const error = new Error('Duplicate transaction ID');
      (error as any).code = '23505';
      mockQuery.mockRejectedValue(error);

      await expect(transactionRepository.createTransaction(transactionData)).rejects.toThrow('Transaction ID already exists');
    });

    it('should throw original error for other database errors', async () => {
      const error = new Error('Database connection failed');
      mockQuery.mockRejectedValue(error);

      await expect(transactionRepository.createTransaction(transactionData)).rejects.toThrow('Database connection failed');
    });
  });

  describe('getTransactionById', () => {
    const transactionId = 'txn-id-123';
    const dbTransaction = {
      id: 'txn-id-123',
      user_id: 'user-123',
      transaction_id: 'txn-456',
      type: 'credit',
      amount: '100.50',
      balance_before: '50.00',
      balance_after: '150.50',
      description: 'Test transaction',
      metadata: '{"source": "test"}',
      processed_at: '2023-01-01T10:00:00Z',
      created_at: '2023-01-01T10:00:00Z',
    };

    const camelCaseTransaction = {
      id: 'txn-id-123',
      userId: 'user-123',
      transactionId: 'txn-456',
      type: 'credit',
      amount: 100.50,
      balanceBefore: 50.00,
      balanceAfter: 150.50,
      description: 'Test transaction',
      metadata: '{"source": "test"}',
      processedAt: expect.any(String), // Now returns current timestamp as string
      createdAt: new Date('2023-01-01T10:00:00Z'),
    };

    it('should return transaction when found', async () => {
      mockQuery.mockResolvedValue({
        rows: [dbTransaction],
      });
      mockToCamelCase.mockReturnValue({
        id: 'txn-id-123',
        userId: 'user-123',
        transactionId: 'txn-456',
        type: 'credit',
        amount: '100.50',
        balanceBefore: '50.00',
        balanceAfter: '150.50',
        description: 'Test transaction',
        metadata: '{"source": "test"}',
        processedAt: expect.any(String), // Mock returns current timestamp
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });

      // Mock JSON.parse for metadata parsing
      global.JSON.parse = jest.fn().mockReturnValue({ source: 'test' });

      const result = await transactionRepository.getTransactionById(transactionId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [transactionId]
      );
      expect(result).toEqual(camelCaseTransaction);
    });

    it('should return null when transaction not found', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
      });

      const result = await transactionRepository.getTransactionById(transactionId);

      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      const error = new Error('Database connection failed');
      mockQuery.mockRejectedValue(error);

      await expect(transactionRepository.getTransactionById(transactionId)).rejects.toThrow('Database connection failed');
    });
  });

  describe('getTransactionByTransactionId', () => {
    const transactionId = 'txn-456';
    const dbTransaction = {
      id: 'txn-id-123',
      user_id: 'user-123',
      transaction_id: 'txn-456',
      type: 'debit',
      amount: '50.00',
      balance_before: '100.00',
      balance_after: '50.00',
      description: null,
      metadata: null,
      processed_at: '2023-01-01T10:00:00Z',
      created_at: '2023-01-01T10:00:00Z',
    };

    const camelCaseTransaction = {
      id: 'txn-id-123',
      userId: 'user-123',
      transactionId: 'txn-456',
      type: 'debit',
      amount: 50.00,
      balanceBefore: 100.00,
      balanceAfter: 50.00,
      description: null,
      metadata: null,
      processedAt: expect.any(String), // Now returns current timestamp as string
      createdAt: new Date('2023-01-01T10:00:00Z'),
    };

    // Update the mock to return a dynamic processedAt
    mockToCamelCase.mockReturnValue({
      id: 'txn-id-123',
      userId: 'user-123',
      transactionId: 'txn-456',
      type: 'credit',
      amount: 100.50,
      balanceBefore: 50.00,
      balanceAfter: 150.50,
      description: 'Test transaction',
      metadata: '{"source": "test"}',
      processedAt: expect.any(String), // Mock returns current timestamp
      createdAt: new Date('2023-01-01T10:00:00Z'),
    });

    it('should return transaction when found', async () => {
      mockQuery.mockResolvedValue({
        rows: [dbTransaction],
      });
      mockToCamelCase.mockReturnValue({
        id: 'txn-id-123',
        userId: 'user-123',
        transactionId: 'txn-456',
        type: 'debit',
        amount: '50.00',
        balanceBefore: '100.00',
        balanceAfter: '50.00',
        description: null,
        metadata: null,
        processedAt: expect.any(String), // Now returns current timestamp as string
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });

      const result = await transactionRepository.getTransactionByTransactionId(transactionId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE transaction_id = $1'),
        [transactionId]
      );
      expect(result).toEqual(camelCaseTransaction);
    });

    it('should return null when transaction not found', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
      });

      const result = await transactionRepository.getTransactionByTransactionId(transactionId);

      expect(result).toBeNull();
    });
  });

  describe('getTransactions', () => {
    const params = {
      page: 1,
      limit: 10,
      sortBy: 'processedAt',
      sortOrder: 'desc' as const,
      userId: 'user-123',
      type: 'credit' as const,
      dateFrom: '2023-01-01',
      dateTo: '2023-01-31',
    };

    const dbTransactions = [
      {
        id: 'txn-1',
        user_id: 'user-123',
        transaction_id: 'txn-456',
        type: 'credit',
        amount: '100.50',
        balance_before: '50.00',
        balance_after: '150.50',
        description: 'Test transaction 1',
        metadata: '{"source": "test"}',
        processed_at: '2023-01-01T10:00:00Z',
        created_at: '2023-01-01T10:00:00Z',
      },
      {
        id: 'txn-2',
        user_id: 'user-123',
        transaction_id: 'txn-789',
        type: 'credit',
        amount: '50.00',
        balance_before: '150.50',
        balance_after: '200.50',
        description: 'Test transaction 2',
        metadata: null,
        processed_at: '2023-01-02T10:00:00Z',
        created_at: '2023-01-02T10:00:00Z',
      },
    ];

    const camelCaseTransactions = [
      {
        id: 'txn-1',
        userId: 'user-123',
        transactionId: 'txn-456',
        type: 'credit',
        amount: 100.50,
        balanceBefore: 50.00,
        balanceAfter: 150.50,
        description: 'Test transaction 1',
        metadata: '{"source": "test"}',
        processedAt: expect.any(String), // Now returns current timestamp as string
        createdAt: new Date('2023-01-01T10:00:00Z'),
      },
      {
        id: 'txn-2',
        userId: 'user-123',
        transactionId: 'txn-789',
        type: 'credit',
        amount: 50.00,
        balanceBefore: 150.50,
        balanceAfter: 200.50,
        description: 'Test transaction 2',
        metadata: null,
        processedAt: expect.any(String), // Now returns current timestamp as string
        createdAt: new Date('2023-01-02T10:00:00Z'),
      },
    ];

    it('should return paginated transactions with all filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: dbTransactions }) // Data query
        .mockResolvedValueOnce({ rows: [{ total: '25' }] }); // Count query

      mockToCamelCase
        .mockReturnValueOnce({
          ...camelCaseTransactions[0],
          processedAt: expect.any(String), // Mock returns current timestamp
        })
        .mockReturnValueOnce({
          ...camelCaseTransactions[1],
          processedAt: expect.any(String), // Mock returns current timestamp
        });

      const result = await transactionRepository.getTransactions(params);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT'),
        ['user-123', 'credit', '2023-01-01', '2023-01-31', 10, 0]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SELECT COUNT(*)'),
        ['user-123', 'credit', '2023-01-01', '2023-01-31']
      );
      expect(result).toEqual({
        data: [
          {
            ...camelCaseTransactions[0],
            processedAt: expect.any(String), // Result has current timestamp
          },
          {
            ...camelCaseTransactions[1],
            processedAt: expect.any(String), // Result has current timestamp
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          pages: 3,
        },
      });
    });

    it('should handle transactions without filters', async () => {
      const simpleParams = { page: 1, limit: 20 };

      mockQuery
        .mockResolvedValueOnce({ rows: dbTransactions })
        .mockResolvedValueOnce({ rows: [{ total: '2' }] });

      mockToCamelCase.mockReturnValue(camelCaseTransactions[0]);

      await transactionRepository.getTransactions(simpleParams);

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT'),
        [20, 0]
      );
    });

    it('should apply userId filter correctly', async () => {
      const userParams = { userId: 'user-123', page: 1, limit: 20 };

      mockQuery
        .mockResolvedValueOnce({ rows: dbTransactions })
        .mockResolvedValueOnce({ rows: [{ total: '2' }] });

      mockToCamelCase.mockReturnValue(camelCaseTransactions[0]);

      await transactionRepository.getTransactions(userParams);

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('user_id = $1'),
        ['user-123', 20, 0]
      );
    });

    it('should apply type filter correctly', async () => {
      const typeParams = { type: 'debit' as const, page: 1, limit: 20 };

      mockQuery
        .mockResolvedValueOnce({ rows: dbTransactions })
        .mockResolvedValueOnce({ rows: [{ total: '2' }] });

      mockToCamelCase.mockReturnValue(camelCaseTransactions[0]);

      await transactionRepository.getTransactions(typeParams);

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('type = $1'),
        ['debit', 20, 0]
      );
    });

    it('should apply date range filters correctly', async () => {
      const dateParams = { dateFrom: '2023-01-01', dateTo: '2023-01-31', page: 1, limit: 20 };

      mockQuery
        .mockResolvedValueOnce({ rows: dbTransactions })
        .mockResolvedValueOnce({ rows: [{ total: '2' }] });

      mockToCamelCase.mockReturnValue(camelCaseTransactions[0]);

      await transactionRepository.getTransactions(dateParams);

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('processed_at >= $1 AND processed_at <= $2'),
        ['2023-01-01', '2023-01-31', 20, 0]
      );
    });

    it('should convert camelCase sortBy to snake_case', async () => {
      const sortParams = { sortBy: 'createdAt', sortOrder: 'asc' as const, page: 1, limit: 20 };

      mockQuery
        .mockResolvedValueOnce({ rows: dbTransactions })
        .mockResolvedValueOnce({ rows: [{ total: '2' }] });

      mockToCamelCase.mockReturnValue(camelCaseTransactions[0]);

      await transactionRepository.getTransactions(sortParams);

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('ORDER BY created_at ASC'),
        [20, 0]
      );
    });

    it('should use default pagination values', async () => {
      const emptyParams = {};

      mockQuery
        .mockResolvedValueOnce({ rows: dbTransactions })
        .mockResolvedValueOnce({ rows: [{ total: '2' }] });

      mockToCamelCase.mockReturnValue(camelCaseTransactions[0]);

      await transactionRepository.getTransactions(emptyParams);

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        [20, 0] // default limit, offset
      );
    });
  });

  describe('getUserTransactions', () => {
    const userId = 'user-123';
    const params = {
      page: 1,
      limit: 10,
      sortBy: 'processedAt',
      sortOrder: 'desc' as const,
      type: 'credit' as const,
    };

    it('should call getTransactions with userId', async () => {
      const mockGetTransactions = jest.spyOn(transactionRepository as any, 'getTransactions');
      mockGetTransactions.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });

      await transactionRepository.getUserTransactions(userId, params);

      expect(mockGetTransactions).toHaveBeenCalledWith({
        ...params,
        userId,
      });
    });
  });

  describe('getTransactionStats', () => {
    const userId = 'user-123';

    const rawStats = {
      total_transactions: '10',
      total_credits: '500.50',
      total_debits: '200.25',
      total_wagers: '150.00',
      total_payouts: '300.75',
    };

    const expectedStats = {
      totalTransactions: 10,
      totalCredits: 500.50,
      totalDebits: 200.25,
      totalWagers: 150.00,
      totalPayouts: 300.75,
    };

    it('should return transaction stats for specific user', async () => {
      mockQuery.mockResolvedValue({
        rows: [rawStats],
      });

      const result = await transactionRepository.getTransactionStats(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId]
      );
      expect(result).toEqual(expectedStats);
    });

    it('should return transaction stats for all users', async () => {
      mockQuery.mockResolvedValue({
        rows: [rawStats],
      });

      const result = await transactionRepository.getTransactionStats();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        []
      );
      expect(result).toEqual(expectedStats);
    });

    it('should handle zero values in stats', async () => {
      const zeroStats = {
        total_transactions: '5',
        total_credits: '0',
        total_debits: '0',
        total_wagers: '0',
        total_payouts: '0',
      };

      const expectedZeroStats = {
        totalTransactions: 5,
        totalCredits: 0,
        totalDebits: 0,
        totalWagers: 0,
        totalPayouts: 0,
      };

      mockQuery.mockResolvedValue({
        rows: [zeroStats],
      });

      const result = await transactionRepository.getTransactionStats();

      expect(result).toEqual(expectedZeroStats);
    });

    it('should throw error when database query fails', async () => {
      const error = new Error('Database connection failed');
      mockQuery.mockRejectedValue(error);

      await expect(transactionRepository.getTransactionStats(userId)).rejects.toThrow('Database connection failed');
    });
  });
});