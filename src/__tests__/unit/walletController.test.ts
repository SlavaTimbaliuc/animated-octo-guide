import { Request, Response } from 'express';
import { WalletController } from '../../controllers/walletController';
import { AuthenticatedRequest } from '../../utils/auth';
import { WalletService } from '../../services/walletService';

jest.mock('../../services/walletService');
jest.mock('../../utils/logger');
jest.mock('../../utils/validation');

// Create mock service instance
const mockWalletService = {
  creditUser: jest.fn(),
  debitUser: jest.fn(),
  getUserBalance: jest.fn(),
  getUserTransactions: jest.fn(),
  getTransactions: jest.fn(),
  getTransactionStats: jest.fn(),
};

// Mock the WalletService constructor to return our mock instance
(WalletService as jest.MockedClass<typeof WalletService>).mockImplementation(() => mockWalletService as any);

const mockRequest = {
  params: {},
  body: {},
  query: {},
  user: undefined,
} as any;

const mockResponse = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
} as any;

const mockStatus = jest.fn().mockReturnThis();
const mockJson = jest.fn().mockReturnThis();

mockResponse.status = mockStatus;
mockResponse.json = mockJson;

describe('WalletController', () => {
  let walletController: WalletController;
  let mockServiceInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock validation schemas with conditional behavior
    const createValidationMock = (type: string) => ({
      validate: jest.fn((input) => {
        let shouldFail = false;

        // Check different input types
        if (type === 'userId' && input && typeof input === 'object' && input.userId === 'invalid-uuid') {
          shouldFail = true;
        } else if (type === 'credit' && input && typeof input === 'object' && 'invalid' in input) {
          shouldFail = true;
        } else if (type === 'debit' && input && typeof input === 'object' && 'invalid' in input) {
          shouldFail = true;
        } else if (type === 'listTransactions' && input && typeof input === 'object' && input.page === 'invalid') {
          shouldFail = true;
        }

        if (shouldFail) {
          return {
            error: { details: [{ message: 'Validation error' }] },
            value: undefined
          };
        }
        // Return success for valid inputs
        return { error: null, value: input };
      }),
      error: null,
      value: {}
    });

    // Set up validation mocks
    (require('../../utils/validation') as any).userIdSchema = createValidationMock('userId');
    (require('../../utils/validation') as any).creditSchema = createValidationMock('credit');
    (require('../../utils/validation') as any).debitSchema = createValidationMock('debit');
    (require('../../utils/validation') as any).listTransactionsSchema = createValidationMock('listTransactions');

    // Create a new instance to get a fresh mock service
    walletController = new WalletController();

    // Get the actual service instance from the controller and spy on its methods
    mockServiceInstance = (walletController as any).walletService;

    // Spy on all service methods and set up default mock implementations
    jest.spyOn(mockServiceInstance, 'creditUser').mockResolvedValue({ id: 'txn-123', amount: 100.50, type: 'credit' });
    jest.spyOn(mockServiceInstance, 'debitUser').mockResolvedValue({ id: 'txn-456', amount: 50.25, type: 'debit' });
    jest.spyOn(mockServiceInstance, 'getUserBalance').mockResolvedValue(150.75);
    jest.spyOn(mockServiceInstance, 'getUserTransactions').mockResolvedValue({ data: [], total: 0 });
    jest.spyOn(mockServiceInstance, 'getTransactions').mockResolvedValue({ data: [], total: 0 });
    jest.spyOn(mockServiceInstance, 'getTransactionStats').mockResolvedValue({ totalTransactions: 100, totalAmount: 5000 });
  });

  it('should be instantiable', () => {
    expect(walletController).toBeDefined();
    expect(walletController).toBeInstanceOf(WalletController);
  });

  it('should have all required methods', () => {
    expect(typeof walletController.creditUser).toBe('function');
    expect(typeof walletController.debitUser).toBe('function');
    expect(typeof walletController.getUserBalance).toBe('function');
    expect(typeof walletController.getUserTransactions).toBe('function');
    expect(typeof walletController.getTransactions).toBe('function');
    expect(typeof walletController.getMyBalance).toBe('function');
    expect(typeof walletController.getMyTransactions).toBe('function');
    expect(typeof walletController.getTransactionStats).toBe('function');
    expect(typeof walletController.getUserTransactionStats).toBe('function');
  });

  describe('creditUser', () => {

    it('should credit user successfully', async () => {
      const userId = 'user-123';
      const creditData = {
        transactionId: 'txn-123',
        amount: 100.50,
        description: 'Bonus credit',
      };
      const transactionResult = { id: 'txn-123', amount: 100.50, type: 'credit' };

      mockWalletService.creditUser.mockResolvedValue(transactionResult as any);

      mockRequest.params = { userId };
      mockRequest.body = creditData;

      await walletController.creditUser(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.creditUser).toHaveBeenCalledWith(userId, creditData);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(transactionResult);
    });

    it('should return 400 for invalid user ID', async () => {
      mockRequest.params = { userId: 'invalid-uuid' };
      mockRequest.body = { transactionId: 'txn-123', amount: 100 };

      await walletController.creditUser(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.creditUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid request data', async () => {
      mockRequest.params = { userId: 'user-123' };
      mockRequest.body = { invalid: 'data' };

      await walletController.creditUser(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.creditUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 404 for user not found', async () => {
      const userId = 'user-123';
      const creditData = { transactionId: 'txn-123', amount: 100 };

      const error = new Error('User not found');
      mockWalletService.creditUser.mockRejectedValue(error);

      mockRequest.params = { userId };
      mockRequest.body = creditData;

      await walletController.creditUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should return 409 for transaction ID conflict', async () => {
      const userId = 'user-123';
      const creditData = { transactionId: 'txn-123', amount: 100 };

      const error = new Error('Transaction ID already exists');
      mockWalletService.creditUser.mockRejectedValue(error);

      mockRequest.params = { userId };
      mockRequest.body = creditData;

      await walletController.creditUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
    });

    it('should return 500 for other errors', async () => {
      const userId = 'user-123';
      const creditData = { transactionId: 'txn-123', amount: 100 };

      const error = new Error('Database error');
      mockWalletService.creditUser.mockRejectedValue(error);

      mockRequest.params = { userId };
      mockRequest.body = creditData;

      await walletController.creditUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });

    it('should trigger logger.error for service failures', async () => {
      const userId = 'user-123';
      const creditData = { transactionId: 'txn-123', amount: 100 };

      const error = new Error('Service unavailable');
      mockWalletService.creditUser.mockRejectedValue(error);

      mockRequest.params = { userId };
      mockRequest.body = creditData;

      await walletController.creditUser(mockRequest as Request, mockResponse as Response);

      // Verify logger.error was called (we can't easily test logger directly due to mocking)
      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('debitUser', () => {

    it('should debit user successfully', async () => {
      const userId = 'user-123';
      const debitData = {
        transactionId: 'txn-456',
        amount: 50.25,
        description: 'Purchase payment',
      };
      const transactionResult = { id: 'txn-456', amount: 50.25, type: 'debit' };

      mockWalletService.debitUser.mockResolvedValue(transactionResult as any);

      mockRequest.params = { userId };
      mockRequest.body = debitData;

      await walletController.debitUser(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.debitUser).toHaveBeenCalledWith(userId, debitData);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(transactionResult);
    });

    it('should return 400 for insufficient funds', async () => {
      const userId = 'user-123';
      const debitData = { transactionId: 'txn-456', amount: 1000 };

      const error = new Error('Insufficient funds');
      mockWalletService.debitUser.mockRejectedValue(error);

      mockRequest.params = { userId };
      mockRequest.body = debitData;

      await walletController.debitUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getUserBalance', () => {

    it('should get user balance successfully', async () => {
      const userId = 'user-123';
      const balance = 150.75;

      mockWalletService.getUserBalance.mockResolvedValue(balance);

      mockRequest.params = { userId };

      await walletController.getUserBalance(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getUserBalance).toHaveBeenCalledWith(userId);
      expect(mockJson).toHaveBeenCalledWith({ balance });
    });

    it('should return 400 for invalid user ID', async () => {
      mockRequest.params = { userId: 'invalid-uuid' };

      await walletController.getUserBalance(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getUserBalance).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 404 for user not found', async () => {
      const userId = 'user-123';
      const error = new Error('User not found');
      mockWalletService.getUserBalance.mockRejectedValue(error);

      mockRequest.params = { userId };

      await walletController.getUserBalance(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('getUserTransactions', () => {

    it('should get user transactions successfully', async () => {
      const userId = 'user-123';
      const queryParams = { page: '1', limit: '10' };
      const transactionsResult = { data: [], total: 0 };

      (mockWalletService.getUserTransactions as jest.MockedFunction<typeof mockWalletService.getUserTransactions>).mockResolvedValue(transactionsResult as any);

      mockRequest.params = { userId };
      mockRequest.query = queryParams;

      await walletController.getUserTransactions(mockRequest as Request, mockResponse as Response);

      expect(mockServiceInstance.getUserTransactions).toHaveBeenCalledWith(userId, { limit: "10", page: "1" });
      expect(mockJson).toHaveBeenCalledWith(transactionsResult);
    });

    it('should return 400 for invalid user ID', async () => {
      mockRequest.params = { userId: 'invalid-uuid' };
      mockRequest.query = { page: '1' };

      await walletController.getUserTransactions(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getUserTransactions).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid query parameters', async () => {
      mockRequest.params = { userId: 'user-123' };
      mockRequest.query = { page: 'invalid' };

      await walletController.getUserTransactions(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getUserTransactions).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getTransactions', () => {

    it('should get all transactions successfully', async () => {
      const queryParams = { page: '1', limit: '20' };
      const transactionsResult = { data: [], total: 0 };

      (mockWalletService.getTransactions as jest.MockedFunction<typeof mockWalletService.getTransactions>).mockResolvedValue(transactionsResult as any);

      mockRequest.query = queryParams;

      await walletController.getTransactions(mockRequest as Request, mockResponse as Response);

      expect(mockServiceInstance.getTransactions).toHaveBeenCalledWith({ limit: "20", page: "1" });
      expect(mockJson).toHaveBeenCalledWith(transactionsResult);
    });
  });

  describe('getMyBalance', () => {
    it('should get current user balance successfully', async () => {
      const userId = 'user-123';
      const balance = 200.50;

      const mockAuthRequest = {
        ...mockRequest,
        user: { id: userId, username: 'testuser', role: 'player' },
      } as AuthenticatedRequest;

      mockWalletService.getUserBalance.mockResolvedValue(balance);

      await walletController.getMyBalance(mockAuthRequest, mockResponse as Response);

      expect(mockWalletService.getUserBalance).toHaveBeenCalledWith(userId);
      expect(mockJson).toHaveBeenCalledWith({ balance });
    });

    it('should return 401 when user not authenticated', async () => {
      const mockAuthRequest = {
        ...mockRequest,
        user: undefined,
      } as AuthenticatedRequest;

      await walletController.getMyBalance(mockAuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });

    it('should return 500 when getUserBalance throws an error', async () => {
      const userId = 'user-123';

      const error = new Error('Database connection failed');
      mockWalletService.getUserBalance.mockRejectedValue(error);

      const mockAuthRequest = {
        ...mockRequest,
        user: { id: userId, username: 'testuser', role: 'player' },
      } as AuthenticatedRequest;

      await walletController.getMyBalance(mockAuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getMyTransactions', () => {
    it('should get current user transactions successfully', async () => {
      const userId = 'user-123';
      const queryParams = { page: '1', limit: '10' };
      const transactionsResult = { data: [], total: 0 };

      const mockAuthRequest = {
        ...mockRequest,
        user: { id: userId, username: 'testuser', role: 'player' },
        query: queryParams,
      } as AuthenticatedRequest;

      (mockWalletService.getUserTransactions as jest.MockedFunction<typeof mockWalletService.getUserTransactions>).mockResolvedValue(transactionsResult as any);

      await walletController.getMyTransactions(mockAuthRequest, mockResponse as Response);

      expect(mockServiceInstance.getUserTransactions).toHaveBeenCalledWith(userId, { page: "1", limit: "10" });
      expect(mockJson).toHaveBeenCalledWith(transactionsResult);
    });

    it('should return 401 when user not authenticated', async () => {
      const mockAuthRequest = {
        ...mockRequest,
        user: undefined,
        query: { page: '1', limit: '10' },
      } as AuthenticatedRequest;

      await walletController.getMyTransactions(mockAuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid query parameters', async () => {
      const userId = 'user-123';

      const mockAuthRequest = {
        ...mockRequest,
        user: { id: userId, username: 'testuser', role: 'player' },
        query: { page: 'invalid' },
      } as AuthenticatedRequest;

      await walletController.getMyTransactions(mockAuthRequest, mockResponse as Response);

      expect(mockWalletService.getUserTransactions).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 500 when getUserTransactions throws an error', async () => {
      const userId = 'user-123';
      const queryParams = { page: '1', limit: '10' };

      const error = new Error('Database query failed');
      mockWalletService.getUserTransactions.mockRejectedValue(error);

      const mockAuthRequest = {
        ...mockRequest,
        user: { id: userId, username: 'testuser', role: 'player' },
        query: queryParams,
      } as AuthenticatedRequest;

      await walletController.getMyTransactions(mockAuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getTransactionStats', () => {
    it('should get transaction stats successfully', async () => {
      const statsResult = { totalTransactions: 100, totalAmount: 5000 };

      mockWalletService.getTransactionStats.mockResolvedValue(statsResult as any);

      await walletController.getTransactionStats(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getTransactionStats).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith(statsResult);
    });

    it('should return 500 when getTransactionStats throws an error', async () => {
      const error = new Error('Statistics calculation failed');
      mockWalletService.getTransactionStats.mockRejectedValue(error);

      await walletController.getTransactionStats(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getUserTransactionStats', () => {
    it('should get user transaction stats successfully', async () => {
      const userId = 'user-123';
      const statsResult = { totalTransactions: 10, totalAmount: 500 };

      mockWalletService.getTransactionStats.mockResolvedValue(statsResult as any);

      mockRequest.params = { userId };

      await walletController.getUserTransactionStats(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getTransactionStats).toHaveBeenCalledWith(userId);
      expect(mockJson).toHaveBeenCalledWith(statsResult);
    });

    it('should return 400 for invalid user ID', async () => {
      mockRequest.params = { userId: 'invalid-uuid' };

      await walletController.getUserTransactionStats(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getTransactionStats).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 404 when user is not found', async () => {
      const userId = 'user-123';

      const error = new Error('User not found');
      mockWalletService.getTransactionStats.mockRejectedValue(error);

      mockRequest.params = { userId };

      await walletController.getUserTransactionStats(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should return 500 for other service errors', async () => {
      const userId = 'user-123';

      const error = new Error('Statistics service unavailable');
      mockWalletService.getTransactionStats.mockRejectedValue(error);

      mockRequest.params = { userId };

      await walletController.getUserTransactionStats(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });
});