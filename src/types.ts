export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  status: 'active' | 'suspended' | 'inactive';
  role: 'player' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface UserSummary extends User {
  transactionCount: number;
  lastTransactionDate?: Date;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role?: 'player' | 'admin';
}

export type TransactionType = 'credit' | 'debit' | 'wager' | 'payout' | 'bonus' | 'refund';

export interface Transaction {
  id: string;
  userId: string;
  transactionId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  metadata?: Record<string, any>;
  processedAt: Date;
  createdAt: Date;
}

export interface CreateTransactionRequest {
  userId: string;
  transactionId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListUsersQuery extends PaginationParams, SortParams {
  status?: 'active' | 'suspended' | 'inactive';
  role?: 'player' | 'admin';
}

export interface ListTransactionsQuery extends PaginationParams, SortParams {
  userId?: string;
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface WalletOperationRequest {
  amount: number;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreditRequest extends WalletOperationRequest {
  transactionId: string;
}

export interface DebitRequest extends WalletOperationRequest {
  transactionId: string;
}
