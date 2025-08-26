import { Request, Response } from 'express';
import { UserController } from '../../controllers/userController';
import { AuthenticatedRequest } from '../../utils/auth';
import { UserService } from '../../services/userService';
import { WalletService } from '../../services/walletService';

jest.mock('../../services/userService');
jest.mock('../../services/walletService');
jest.mock('../../utils/logger');
jest.mock('../../utils/validation');

// Create mock service instances
const mockUserService = {
  createUser: jest.fn(),
  authenticateUser: jest.fn(),
  getUsers: jest.fn(),
  getUserById: jest.fn(),
  updateUserStatus: jest.fn(),
};

const mockWalletService = {
  getUserBalance: jest.fn(),
  getUserTransactions: jest.fn(),
};

// Mock the service constructors to return our mock instances
(UserService as jest.MockedClass<typeof UserService>).mockImplementation(() => mockUserService as any);
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

describe('UserController', () => {
  let userController: UserController;
  let mockUserServiceInstance: any;
  let mockWalletServiceInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock validation schemas with conditional behavior
    const createValidationMock = (type: string) => ({
      validate: jest.fn((input) => {
        let shouldFail = false;

        // Check different input types
        if (type === 'userId' && input && typeof input === 'object' && input.userId === 'invalid-uuid') {
          shouldFail = true;
        } else if (type === 'createUser' && input && typeof input === 'object' && 'invalid' in input) {
          shouldFail = true;
        } else if (type === 'listUsers' && input && typeof input === 'object' && input.page === 'invalid') {
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
    (require('../../utils/validation') as any).createUserSchema = createValidationMock('createUser');
    (require('../../utils/validation') as any).listUsersSchema = createValidationMock('listUsers');

    // Create a new instance to get a fresh mock service
    userController = new UserController();

    // Get the actual service instances from the controller and spy on their methods
    mockUserServiceInstance = (userController as any).userService;
    mockWalletServiceInstance = (userController as any).walletService;

    // Spy on all service methods and set up default mock implementations
    jest.spyOn(mockUserServiceInstance, 'createUser').mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      status: 'active'
    });
    jest.spyOn(mockUserServiceInstance, 'authenticateUser').mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com', username: 'testuser' },
      token: 'jwt-token'
    });
    jest.spyOn(mockUserServiceInstance, 'getUsers').mockResolvedValue({
      data: [{ id: 'user-123', email: 'test@example.com' }],
      total: 1
    });
    jest.spyOn(mockUserServiceInstance, 'getUserById').mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      status: 'active'
    });
    jest.spyOn(mockUserServiceInstance, 'updateUserStatus').mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      status: 'suspended'
    });

    jest.spyOn(mockWalletServiceInstance, 'getUserBalance').mockResolvedValue(150.75);
    jest.spyOn(mockWalletServiceInstance, 'getUserTransactions').mockResolvedValue({
      data: [],
      total: 0
    });
  });

  it('should be instantiable', () => {
    expect(userController).toBeDefined();
    expect(userController).toBeInstanceOf(UserController);
  });

  it('should have all required methods', () => {
    expect(typeof userController.createUser).toBe('function');
    expect(typeof userController.login).toBe('function');
    expect(typeof userController.getUsers).toBe('function');
    expect(typeof userController.getUserById).toBe('function');
    expect(typeof userController.getCurrentUser).toBe('function');
    expect(typeof userController.updateUserStatus).toBe('function');
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      };
      const expectedResult = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        status: 'active'
      };

      mockRequest.body = userData;

      await userController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockUserServiceInstance.createUser).toHaveBeenCalledWith(userData);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        data: expectedResult,
      });
    });

    it('should return 400 for invalid request data', async () => {
      mockRequest.body = { invalid: 'data' };

      await userController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockUserServiceInstance.createUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 409 for user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        username: 'existinguser',
        password: 'password123'
      };

      const error = new Error('User already exists');
      mockUserServiceInstance.createUser.mockRejectedValue(error);

      mockRequest.body = userData;

      await userController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
    });

    it('should return 500 for other errors', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      };

      const error = new Error('Database error');
      mockUserServiceInstance.createUser.mockRejectedValue(error);

      mockRequest.body = userData;

      await userController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };
      const expectedResult = {
        user: { id: 'user-123', email: 'test@example.com', username: 'testuser' },
        token: 'jwt-token'
      };

      mockRequest.body = loginData;

      await userController.login(mockRequest as Request, mockResponse as Response);

      expect(mockUserServiceInstance.authenticateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockJson).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing credentials', async () => {
      mockRequest.body = { email: 'test@example.com' }; // missing password

      await userController.login(mockRequest as Request, mockResponse as Response);

      expect(mockUserServiceInstance.authenticateUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      });
    });

    it('should return 401 for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockUserServiceInstance.authenticateUser.mockResolvedValue(null);

      mockRequest.body = loginData;

      await userController.login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });

    it('should return 403 for inactive account', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const error = new Error('Account is suspended');
      mockUserServiceInstance.authenticateUser.mockRejectedValue(error);

      mockRequest.body = loginData;

      await userController.login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
    });

    it('should return 500 for other errors', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const error = new Error('Database error');
      mockUserServiceInstance.authenticateUser.mockRejectedValue(error);

      mockRequest.body = loginData;

      await userController.login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getUsers', () => {
    it('should get users successfully', async () => {
      const queryParams = { page: '1', limit: '10' };
      const expectedResult = {
        data: [{ id: 'user-123', email: 'test@example.com' }],
        total: 1
      };

      mockRequest.query = queryParams;

      await userController.getUsers(mockRequest as Request, mockResponse as Response);

      expect(mockUserServiceInstance.getUsers).toHaveBeenCalledWith({ page: "1", limit: "10" });
      expect(mockJson).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for invalid query parameters', async () => {
      mockRequest.query = { page: 'invalid' };

      await userController.getUsers(mockRequest as Request, mockResponse as Response);

      expect(mockUserServiceInstance.getUsers).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 500 for database errors', async () => {
      const queryParams = { page: '1', limit: '10' };

      const error = new Error('Database error');
      mockUserServiceInstance.getUsers.mockRejectedValue(error);

      mockRequest.query = queryParams;

      await userController.getUsers(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getUserById', () => {
    it('should get user by ID successfully', async () => {
      const userId = 'user-123';
      const expectedUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        status: 'active'
      };

      mockRequest.params = { userId };

      await userController.getUserById(mockRequest as Request, mockResponse as Response);

      expect(mockUserServiceInstance.getUserById).toHaveBeenCalledWith(userId);
      expect(mockJson).toHaveBeenCalledWith(expectedUser);
    });

    it('should return 400 for invalid user ID', async () => {
      mockRequest.params = { userId: 'invalid-uuid' };

      await userController.getUserById(mockRequest as Request, mockResponse as Response);

      expect(mockUserServiceInstance.getUserById).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 404 for user not found', async () => {
      const userId = 'user-123';

      mockUserServiceInstance.getUserById.mockResolvedValue(null);

      mockRequest.params = { userId };

      await userController.getUserById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should return 500 for database errors', async () => {
      const userId = 'user-123';

      const error = new Error('Database error');
      mockUserServiceInstance.getUserById.mockRejectedValue(error);

      mockRequest.params = { userId };

      await userController.getUserById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const userId = 'user-123';
      const expectedUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        status: 'active'
      };
      const balance = 150.75;
      const recentTransactions = { data: [], total: 0 };

      const mockAuthRequest = {
        ...mockRequest,
        user: { id: userId, email: 'test@example.com', username: 'testuser' },
      } as AuthenticatedRequest;

      await userController.getCurrentUser(mockAuthRequest, mockResponse as Response);

      expect(mockUserServiceInstance.getUserById).toHaveBeenCalledWith(userId);
      expect(mockWalletServiceInstance.getUserBalance).toHaveBeenCalledWith(userId);
      expect(mockWalletServiceInstance.getUserTransactions).toHaveBeenCalledWith(userId, { page: 1, limit: 5 });
      expect(mockJson).toHaveBeenCalledWith({
        user: expectedUser,
        balance,
        recentTransactions,
      });
    });

    it('should return 401 when user not authenticated', async () => {
      const mockAuthRequest = {
        ...mockRequest,
        user: undefined,
      } as AuthenticatedRequest;

      await userController.getCurrentUser(mockAuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });

    it('should return 404 when user not found', async () => {
      const userId = 'user-123';

      mockUserServiceInstance.getUserById.mockResolvedValue(null);

      const mockAuthRequest = {
        ...mockRequest,
        user: { id: userId, email: 'test@example.com', username: 'testuser' },
      } as AuthenticatedRequest;

      await userController.getCurrentUser(mockAuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should return 500 for database errors', async () => {
      const userId = 'user-123';

      const error = new Error('Database error');
      mockUserServiceInstance.getUserById.mockRejectedValue(error);

      const mockAuthRequest = {
        ...mockRequest,
        user: { id: userId, email: 'test@example.com', username: 'testuser' },
      } as AuthenticatedRequest;

      await userController.getCurrentUser(mockAuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status successfully', async () => {
      const userId = 'user-123';
      const status = 'suspended';
      const expectedUser = {
        id: 'user-123',
        email: 'test@example.com',
        status: 'suspended'
      };

      mockRequest.params = { userId };
      mockRequest.body = { status };

      await userController.updateUserStatus(mockRequest as Request, mockResponse as Response);

      expect(mockUserServiceInstance.updateUserStatus).toHaveBeenCalledWith(userId, status);
      expect(mockJson).toHaveBeenCalledWith({
        data: expectedUser,
      });
    });

    it('should return 400 for invalid user ID', async () => {
      const status = 'suspended';

      mockRequest.params = { userId: 'invalid-uuid' };
      mockRequest.body = { status };

      await userController.updateUserStatus(mockRequest as Request, mockResponse as Response);

      expect(mockUserServiceInstance.updateUserStatus).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid status', async () => {
      const userId = 'user-123';
      const invalidStatus = 'invalid-status';

      mockRequest.params = { userId };
      mockRequest.body = { status: invalidStatus };

      await userController.updateUserStatus(mockRequest as Request, mockResponse as Response);

      expect(mockUserServiceInstance.updateUserStatus).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 404 for user not found', async () => {
      const userId = 'user-123';
      const status = 'suspended';

      mockUserServiceInstance.updateUserStatus.mockResolvedValue(null);

      mockRequest.params = { userId };
      mockRequest.body = { status };

      await userController.updateUserStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should return 500 for database errors', async () => {
      const userId = 'user-123';
      const status = 'suspended';

      const error = new Error('Database error');
      mockUserServiceInstance.updateUserStatus.mockRejectedValue(error);

      mockRequest.params = { userId };
      mockRequest.body = { status };

      await userController.updateUserStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });
});