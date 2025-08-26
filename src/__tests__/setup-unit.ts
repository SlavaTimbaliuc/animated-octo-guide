// Jest setup for unit tests with mocked database
import logger from '../utils/logger';

// Mock the database module completely
// Mock database object
const mockDb = {
  query: jest.fn(),
  transaction: jest.fn(),
  connect: jest.fn(),
  close: jest.fn(),
  getClient: jest.fn(),
  toCamelCase: jest.fn((obj: any) => {
    if (Array.isArray(obj)) {
      return obj.map(item => mockToCamelCase(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = mockToCamelCase(obj[key]);
      }
      return result;
    }
    return obj;
  }),
  toSnakeCase: jest.fn((obj: any) => {
    if (Array.isArray(obj)) {
      return obj.map(item => mockToSnakeCase(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        result[snakeKey] = mockToSnakeCase(obj[key]);
      }
      return result;
    }
    return obj;
  }),
};

jest.mock('../database', () => ({
  __esModule: true,
  default: mockDb,
}));

// Helper functions for case conversion (needed for the mocked database)
function mockToCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => mockToCamelCase(item));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = mockToCamelCase(obj[key]);
    }
    return result;
  }
  return obj;
}

function mockToSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => mockToSnakeCase(item));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = mockToSnakeCase(obj[key]);
    }
    return result;
  }
  return obj;
}


// Mock bcrypt for faster tests
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock logger to reduce test output noise
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock JWT for consistent tokens
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 'mock-user-id', role: 'player' }),
}));

// Clean up mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Export mock instances for use in tests
export const mockDatabase = mockDb;
export const mockBcrypt = require('bcrypt');
export const mockJWT = require('jsonwebtoken');
export const mockLogger = logger;
