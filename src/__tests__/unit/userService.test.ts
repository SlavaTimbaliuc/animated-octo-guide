import { UserService } from '../../services/userService';
import { UserRepository } from '../../repositories/userRepository';
import { User, CreateUserRequest } from '../../types';

// Mock the dependencies
jest.mock('../../repositories/userRepository');
jest.mock('jsonwebtoken');
jest.mock('../../config', () => ({
  jwt: {
    secret: 'test-secret'
  }
}));

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService();
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;

    // Replace the service dependency with our mock
    (userService as any).userRepository = mockUserRepository;
  });

  describe('createUser', () => {
    const userData: CreateUserRequest = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'player'
    };

    const mockUser: User = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      role: 'player',
      balance: 0,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should create a new user successfully', async () => {
      mockUserRepository.createUser.mockResolvedValue(mockUser);

      const result = await userService.createUser(userData);

      expect(mockUserRepository.createUser).toHaveBeenCalledWith(userData);
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBeDefined();
    });

    it('should handle repository errors', async () => {
      mockUserRepository.createUser.mockRejectedValue(new Error('Database error'));

      await expect(userService.createUser(userData))
        .rejects.toThrow('Database error');

      expect(mockUserRepository.createUser).toHaveBeenCalledWith(userData);
    });
  });

  describe('authenticateUser', () => {
    const email = 'test@example.com';
    const password = 'password123';

    const mockUser: User = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      role: 'player',
      balance: 0,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should authenticate user successfully', async () => {
      mockUserRepository.verifyPassword.mockResolvedValue(mockUser);

      const result = await userService.authenticateUser(email, password);

      expect(mockUserRepository.verifyPassword).toHaveBeenCalledWith(email, password);
      expect(result).toBeDefined();
      expect(result?.user).toEqual(mockUser);
      expect(result?.token).toBeDefined();
    });

    it('should return null for invalid credentials', async () => {
      mockUserRepository.verifyPassword.mockResolvedValue(null);

      const result = await userService.authenticateUser(email, password);

      expect(mockUserRepository.verifyPassword).toHaveBeenCalledWith(email, password);
      expect(result).toBeNull();
    });

    it('should reject inactive users', async () => {
      const inactiveUser = { ...mockUser, status: 'suspended' as const };
      mockUserRepository.verifyPassword.mockResolvedValue(inactiveUser);

      await expect(userService.authenticateUser(email, password))
        .rejects.toThrow('Account is suspended');

      expect(mockUserRepository.verifyPassword).toHaveBeenCalledWith(email, password);
    });
  });

  describe('getUserById', () => {
    const userId = 'user-123';
    const mockUser: User = {
      id: userId,
      username: 'testuser',
      email: 'test@example.com',
      role: 'player',
      balance: 0,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return user when found', async () => {
      mockUserRepository.getUserById.mockResolvedValue(mockUser);

      const result = await userService.getUserById(userId);

      expect(mockUserRepository.getUserById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockUserRepository.getUserById.mockResolvedValue(null);

      const result = await userService.getUserById(userId);

      expect(mockUserRepository.getUserById).toHaveBeenCalledWith(userId);
      expect(result).toBeNull();
    });
  });

  describe('getUserByUsername', () => {
    const username = 'testuser';
    const mockUser: User = {
      id: 'user-123',
      username,
      email: 'test@example.com',
      role: 'player',
      balance: 0,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return user when found', async () => {
      mockUserRepository.getUserByUsername.mockResolvedValue(mockUser);

      const result = await userService.getUserByUsername(username);

      expect(mockUserRepository.getUserByUsername).toHaveBeenCalledWith(username);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockUserRepository.getUserByUsername.mockResolvedValue(null);

      const result = await userService.getUserByUsername(username);

      expect(mockUserRepository.getUserByUsername).toHaveBeenCalledWith(username);
      expect(result).toBeNull();
    });
  });

  describe('updateUserStatus', () => {
    const userId = 'user-123';
    const newStatus = 'suspended' as const;

    const mockUser: User = {
      id: userId,
      username: 'testuser',
      email: 'test@example.com',
      role: 'player',
      balance: 0,
      status: 'suspended',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should update user status successfully', async () => {
      mockUserRepository.updateUserStatus.mockResolvedValue(mockUser);

      const result = await userService.updateUserStatus(userId, newStatus);

      expect(mockUserRepository.updateUserStatus).toHaveBeenCalledWith(userId, newStatus);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockUserRepository.updateUserStatus.mockResolvedValue(null);

      const result = await userService.updateUserStatus(userId, newStatus);

      expect(mockUserRepository.updateUserStatus).toHaveBeenCalledWith(userId, newStatus);
      expect(result).toBeNull();
    });
  });

  describe('getUserBalance', () => {
    const userId = 'user-123';
    const balance = 250.75;

    it('should return user balance', async () => {
      mockUserRepository.getUserBalance.mockResolvedValue(balance);

      const result = await userService.getUserBalance(userId);

      expect(mockUserRepository.getUserBalance).toHaveBeenCalledWith(userId);
      expect(result).toBe(balance);
    });

    it('should return null when user not found', async () => {
      mockUserRepository.getUserBalance.mockResolvedValue(null);

      const result = await userService.getUserBalance(userId);

      expect(mockUserRepository.getUserBalance).toHaveBeenCalledWith(userId);
      expect(result).toBeNull();
    });
  });

  describe('validateUserExists', () => {
    const userId = 'user-123';
    const mockUser: User = {
      id: userId,
      username: 'testuser',
      email: 'test@example.com',
      role: 'player',
      balance: 0,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should pass validation for existing active user', async () => {
      mockUserRepository.getUserById.mockResolvedValue(mockUser);

      await expect(userService.validateUserExists(userId)).resolves.toBeUndefined();

      expect(mockUserRepository.getUserById).toHaveBeenCalledWith(userId);
    });

    it('should throw error for non-existent user', async () => {
      mockUserRepository.getUserById.mockResolvedValue(null);

      await expect(userService.validateUserExists(userId))
        .rejects.toThrow('User not found');

      expect(mockUserRepository.getUserById).toHaveBeenCalledWith(userId);
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = { ...mockUser, status: 'suspended' as const };
      mockUserRepository.getUserById.mockResolvedValue(inactiveUser);

      await expect(userService.validateUserExists(userId))
        .rejects.toThrow('User account is suspended');

      expect(mockUserRepository.getUserById).toHaveBeenCalledWith(userId);
    });
  });
});