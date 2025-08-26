import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'yeet_casino',
    user: process.env.POSTGRES_USER || 'yeet_user',
    password: process.env.POSTGRES_PASSWORD || 'yeet_password',
    ssl: process.env.NODE_ENV === 'production',
    max: 20, // Maximum number of connections in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // API
  apiKey: process.env.API_KEY || 'yeet-casino-api-key',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Pagination defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // Security
  bcryptRounds: 10,
};

export default config;
