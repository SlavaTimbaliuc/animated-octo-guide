import { UserRepository } from '../../repositories/userRepository';
import database from '../../database';
import bcrypt from 'bcrypt';
import config from '../../config';

// Mock dependencies
jest.mock('../../database');
jest.mock('bcrypt');
jest.mock('../../config');
jest.mock('../../utils/logger');

// Create mock functions
const mockQuery = jest.fn();
const mockToCamelCase = jest.fn();
const mockHash = jest.fn();
const mockCompare = jest.fn();

// Set up mocks
(database as jest.Mocked<typeof database>).query = mockQuery;
(database as jest.Mocked<typeof database>).toCamelCase = mockToCamelCase;

(bcrypt as jest.Mocked<typeof bcrypt>).hash = mockHash;
(bcrypt as jest.Mocked<typeof bcrypt>).compare = mockCompare;

// Mock config
(config as jest.Mocked<typeof config>).bcryptRounds = 10;

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository = new UserRepository();
  });

  describe('createUser', () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'player' as const,
    };

    const hashedPassword = 'hashed_password';
    const createdUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      balance: 0,
      status: 'active',
      role: 'player',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      last_login: null,
    };

    const camelCaseUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      balance: 0,
      status: 'active',
      role: 'player',
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
      lastLogin: null,
    };

    it('should create user successfully', async () => {
      mockHash.mockResolvedValue(hashedPassword);
      mockQuery.mockResolvedValue({
        rows: [createdUser],
      });
      mockToCamelCase.mockReturnValue(camelCaseUser);

      const result = await userRepository.createUser(userData);

      expect(mockHash).toHaveBeenCalledWith(userData.password, 10);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [userData.username, userData.email, hashedPassword, userData.role]
      );
      expect(mockToCamelCase).toHaveBeenCalledWith(createdUser);
      expect(result).toEqual(camelCaseUser);
    });

    it('should use default role when not provided', async () => {
      const userDataWithoutRole = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      mockHash.mockResolvedValue(hashedPassword);
      mockQuery.mockResolvedValue({
        rows: [createdUser],
      });
      mockToCamelCase.mockReturnValue(camelCaseUser);

      await userRepository.createUser(userDataWithoutRole);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [userDataWithoutRole.username, userDataWithoutRole.email, hashedPassword, 'player']
      );
    });

    it('should throw error for username already exists', async () => {
      const error = new Error('Username already exists');
      (error as any).code = '23505';
      (error as any).constraint = 'users_username_key';

      mockHash.mockResolvedValue(hashedPassword);
      mockQuery.mockRejectedValue(error);

      await expect(userRepository.createUser(userData)).rejects.toThrow('Username already exists');
    });

    it('should throw error for email already exists', async () => {
      const error = new Error('Email already exists');
      (error as any).code = '23505';
      (error as any).constraint = 'users_email_key';

      mockHash.mockResolvedValue(hashedPassword);
      mockQuery.mockRejectedValue(error);

      await expect(userRepository.createUser(userData)).rejects.toThrow('Email already exists');
    });

    it('should throw original error for other database errors', async () => {
      const error = new Error('Database connection failed');

      mockHash.mockResolvedValue(hashedPassword);
      mockQuery.mockRejectedValue(error);

      await expect(userRepository.createUser(userData)).rejects.toThrow('Database connection failed');
    });

    it('should throw error when bcrypt hash fails', async () => {
      const error = new Error('Hashing failed');
      mockHash.mockRejectedValue(error);

      await expect(userRepository.createUser(userData)).rejects.toThrow('Hashing failed');
    });
  });

  describe('getUserById', () => {
    const userId = 'user-123';
    const dbUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      balance: 100,
      status: 'active',
      role: 'player',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      last_login: '2023-01-02T00:00:00Z',
    };

    const camelCaseUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      balance: 100,
      status: 'active',
      role: 'player',
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
      lastLogin: new Date('2023-01-02T00:00:00Z'),
    };

    it('should return user when found', async () => {
      mockQuery.mockResolvedValue({
        rows: [dbUser],
      });
      mockToCamelCase.mockReturnValue(camelCaseUser);

      const result = await userRepository.getUserById(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId]
      );
      expect(mockToCamelCase).toHaveBeenCalledWith(dbUser);
      expect(result).toEqual(camelCaseUser);
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
      });

      const result = await userRepository.getUserById(userId);

      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      const error = new Error('Database connection failed');
      mockQuery.mockRejectedValue(error);

      await expect(userRepository.getUserById(userId)).rejects.toThrow('Database connection failed');
    });
  });

  describe('getUserByUsername', () => {
    const username = 'testuser';
    const dbUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      balance: 100,
      status: 'active',
      role: 'player',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      last_login: null,
    };

    const camelCaseUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      balance: 100,
      status: 'active',
      role: 'player',
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
      lastLogin: null,
    };

    it('should return user when found', async () => {
      mockQuery.mockResolvedValue({
        rows: [dbUser],
      });
      mockToCamelCase.mockReturnValue(camelCaseUser);

      const result = await userRepository.getUserByUsername(username);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE username = $1'),
        [username]
      );
      expect(result).toEqual(camelCaseUser);
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
      });

      const result = await userRepository.getUserByUsername(username);

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    const email = 'test@example.com';
    const dbUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      balance: 100,
      status: 'active',
      role: 'player',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      last_login: null,
    };

    const camelCaseUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      balance: 100,
      status: 'active',
      role: 'player',
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
      lastLogin: null,
    };

    it('should return user when found', async () => {
      mockQuery.mockResolvedValue({
        rows: [dbUser],
      });
      mockToCamelCase.mockReturnValue(camelCaseUser);

      const result = await userRepository.getUserByEmail(email);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1'),
        [email]
      );
      expect(result).toEqual(camelCaseUser);
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
      });

      const result = await userRepository.getUserByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('getUsers', () => {
    const params = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
      status: 'active' as const,
      role: 'player' as const,
    };

    const dbUsers = [
      {
        id: 'user-1',
        username: 'user1',
        email: 'user1@example.com',
        balance: 100,
        status: 'active',
        role: 'player',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_login: null,
        transaction_count: 5,
        last_transaction_date: '2023-01-02T00:00:00Z',
      },
      {
        id: 'user-2',
        username: 'user2',
        email: 'user2@example.com',
        balance: 200,
        status: 'active',
        role: 'player',
        created_at: '2023-01-02T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        last_login: null,
        transaction_count: 3,
        last_transaction_date: null,
      },
    ];

    const camelCaseUsers = [
      {
        id: 'user-1',
        username: 'user1',
        email: 'user1@example.com',
        balance: 100,
        status: 'active',
        role: 'player',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
        lastLogin: null,
        transactionCount: 5,
        lastTransactionDate: new Date('2023-01-02T00:00:00Z'),
      },
      {
        id: 'user-2',
        username: 'user2',
        email: 'user2@example.com',
        balance: 200,
        status: 'active',
        role: 'player',
        createdAt: new Date('2023-01-02T00:00:00Z'),
        updatedAt: new Date('2023-01-02T00:00:00Z'),
        lastLogin: null,
        transactionCount: 3,
        lastTransactionDate: null,
      },
    ];

    it('should return paginated users with filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: dbUsers }) // Data query
        .mockResolvedValueOnce({ rows: [{ total: '25' }] }); // Count query
      mockToCamelCase.mockReturnValue(camelCaseUsers);

      const result = await userRepository.getUsers(params);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockToCamelCase).toHaveBeenCalledWith(dbUsers);
      expect(result).toEqual({
        data: camelCaseUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          pages: 3,
        },
      });
    });

    it('should handle users without filters', async () => {
      const simpleParams = { page: 1, limit: 20 };

      mockQuery
        .mockResolvedValueOnce({ rows: dbUsers })
        .mockResolvedValueOnce({ rows: [{ total: '2' }] });
      mockToCamelCase.mockReturnValue(camelCaseUsers);

      await userRepository.getUsers(simpleParams);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('user_summary'),
        [20, 0] // limit, offset
      );
    });

    it('should apply status filter correctly', async () => {
      const statusParams = { status: 'active' as const, page: 1, limit: 20 };

      mockQuery
        .mockResolvedValueOnce({ rows: dbUsers })
        .mockResolvedValueOnce({ rows: [{ total: '2' }] });
      mockToCamelCase.mockReturnValue(camelCaseUsers);

      await userRepository.getUsers(statusParams);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        ['active', 20, 0]
      );
    });

    it('should apply role filter correctly', async () => {
      const roleParams = { role: 'admin' as const, page: 1, limit: 20 };

      mockQuery
        .mockResolvedValueOnce({ rows: dbUsers })
        .mockResolvedValueOnce({ rows: [{ total: '2' }] });
      mockToCamelCase.mockReturnValue(camelCaseUsers);

      await userRepository.getUsers(roleParams);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('role = $1'),
        ['admin', 20, 0]
      );
    });

    it('should convert camelCase sortBy to snake_case', async () => {
      const sortParams = { sortBy: 'lastLogin', sortOrder: 'asc' as const, page: 1, limit: 20 };

      mockQuery
        .mockResolvedValueOnce({ rows: dbUsers })
        .mockResolvedValueOnce({ rows: [{ total: '2' }] });
      mockToCamelCase.mockReturnValue(camelCaseUsers);

      await userRepository.getUsers(sortParams);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY last_login ASC'),
        [20, 0]
      );
    });

    it('should use default pagination values', async () => {
      const emptyParams = {};

      mockQuery
        .mockResolvedValueOnce({ rows: dbUsers })
        .mockResolvedValueOnce({ rows: [{ total: '2' }] });
      mockToCamelCase.mockReturnValue(camelCaseUsers);

      await userRepository.getUsers(emptyParams);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [20, 0] // default limit, offset
      );
    });
  });

  describe('verifyPassword', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = 'hashed_password';

    const dbUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      password_hash: hashedPassword,
      balance: 100,
      status: 'active',
      role: 'player',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      last_login: null,
    };

    const expectedUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      balance: 100,
      status: 'active',
      role: 'player',
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
      lastLogin: null,
    };

    it('should verify password successfully and update last login', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [dbUser] }) // User lookup
        .mockResolvedValueOnce({}); // Last login update
      mockCompare.mockResolvedValue(true);
      mockToCamelCase.mockReturnValue(expectedUser);

      const result = await userRepository.verifyPassword(email, password);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [email]
      );
      expect(mockCompare).toHaveBeenCalledWith(password, hashedPassword);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [dbUser.id]
      );
      expect(result).toEqual(expectedUser);
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await userRepository.verifyPassword(email, password);

      expect(result).toBeNull();
      expect(mockCompare).not.toHaveBeenCalled();
    });

    it('should return null when password is incorrect', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [dbUser] });
      mockCompare.mockResolvedValue(false);

      const result = await userRepository.verifyPassword(email, password);

      expect(result).toBeNull();
      expect(mockQuery).toHaveBeenCalledTimes(1); // Only the lookup, no update
    });

    it('should throw error when bcrypt compare fails', async () => {
      const error = new Error('Bcrypt comparison failed');
      mockQuery.mockResolvedValueOnce({ rows: [dbUser] });
      mockCompare.mockRejectedValue(error);

      await expect(userRepository.verifyPassword(email, password)).rejects.toThrow('Bcrypt comparison failed');
    });

    it('should throw error when database query fails', async () => {
      const error = new Error('Database connection failed');
      mockQuery.mockRejectedValue(error);

      await expect(userRepository.verifyPassword(email, password)).rejects.toThrow('Database connection failed');
    });
  });

  describe('updateUserStatus', () => {
    const userId = 'user-123';
    const status = 'suspended';
    const dbUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      balance: 100,
      status: 'suspended',
      role: 'player',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      last_login: null,
    };

    const camelCaseUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      balance: 100,
      status: 'suspended',
      role: 'player',
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
      lastLogin: null,
    };

    it('should update user status successfully', async () => {
      mockQuery.mockResolvedValue({
        rows: [dbUser],
      });
      mockToCamelCase.mockReturnValue(camelCaseUser);

      const result = await userRepository.updateUserStatus(userId, status);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([status, userId])
      );
      expect(result).toEqual(camelCaseUser);
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
      });

      const result = await userRepository.updateUserStatus(userId, status);

      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      const error = new Error('Database update failed');
      mockQuery.mockRejectedValue(error);

      await expect(userRepository.updateUserStatus(userId, status)).rejects.toThrow('Database update failed');
    });
  });

  describe('getUserBalance', () => {
    const userId = 'user-123';
    const balance = 150.75;

    it('should return user balance successfully', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ balance: balance.toString() }],
      });

      const result = await userRepository.getUserBalance(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT balance FROM users WHERE id = $1',
        [userId]
      );
      expect(result).toBe(balance);
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
      });

      const result = await userRepository.getUserBalance(userId);

      expect(result).toBeNull();
    });

    it('should parse balance as float', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ balance: '100.50' }],
      });

      const result = await userRepository.getUserBalance(userId);

      expect(result).toBe(100.50);
    });

    it('should throw error when database query fails', async () => {
      const error = new Error('Database connection failed');
      mockQuery.mockRejectedValue(error);

      await expect(userRepository.getUserBalance(userId)).rejects.toThrow('Database connection failed');
    });
  });
});