import Joi from 'joi';
import { 
  CreateUserRequest, 
  ListUsersQuery, 
  ListTransactionsQuery, 
  CreditRequest, 
  DebitRequest 
} from '../types';

export const createUserSchema = Joi.object<CreateUserRequest>({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(6).max(100).required(),
  role: Joi.string().valid('player', 'admin').default('player'),
});

export const listUsersSchema = Joi.object<ListUsersQuery>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('username', 'email', 'balance', 'createdAt', 'updatedAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  status: Joi.string().valid('active', 'suspended', 'inactive'),
  role: Joi.string().valid('player', 'admin'),
});

export const listTransactionsSchema = Joi.object<ListTransactionsQuery>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('processedAt', 'amount', 'type').default('processedAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  userId: Joi.string().uuid(),
  type: Joi.string().valid('credit', 'debit', 'wager', 'payout', 'bonus', 'refund'),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')),
});

export const creditSchema = Joi.object<CreditRequest>({
  transactionId: Joi.string().min(1).max(100).required(),
  amount: Joi.number().positive().precision(2).required(),
  description: Joi.string().max(500),
  metadata: Joi.object(),
});

export const debitSchema = Joi.object<DebitRequest>({
  transactionId: Joi.string().min(1).max(100).required(),
  amount: Joi.number().positive().precision(2).required(),
  description: Joi.string().max(500),
  metadata: Joi.object(),
});

export const userIdSchema = Joi.object({
  userId: Joi.string().uuid().required(),
});

export const transactionIdSchema = Joi.object({
  transactionId: Joi.string().min(1).max(100).required(),
});
