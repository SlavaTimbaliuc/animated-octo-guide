import database from '../database';

beforeAll(async () => {
  // Connect to test database
  await database.connect();
});

afterAll(async () => {
  // Clean up and close database connection
  await database.close();
});

beforeEach(async () => {
  try {
    // Database cleanup
    await database.query('TRUNCATE TABLE transactions CASCADE');
    await database.query('TRUNCATE TABLE users CASCADE');

    // Reset all sequences to 1
    await database.query('ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1');
    await database.query('ALTER SEQUENCE IF EXISTS transactions_id_seq RESTART WITH 1');

    // Add a small delay to ensure cleanup is fully committed
    await new Promise(resolve => setTimeout(resolve, 10));
  } catch (error) {
    console.error('Database cleanup error:', error);
    // Don't throw error to avoid test failures due to cleanup issues
  }
});

afterEach(async () => {
  try {
    // Additional cleanup after each test to ensure clean state
    await database.query('TRUNCATE TABLE transactions CASCADE');
    await database.query('TRUNCATE TABLE users CASCADE');
    await new Promise(resolve => setTimeout(resolve, 10));
  } catch (error) {
    console.error('AfterEach cleanup error:', error);
  }
});

// Mock logger to reduce test output noise
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
