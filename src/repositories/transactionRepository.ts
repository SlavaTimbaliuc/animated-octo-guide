import database from '../database';
import { 
  Transaction, 
  CreateTransactionRequest, 
  ListTransactionsQuery, 
  PaginatedResponse 
} from '../types';
import logger from '../utils/logger';

export class TransactionRepository {
  async createTransaction(transactionData: CreateTransactionRequest): Promise<Transaction> {
    const query = `
      SELECT * FROM process_transaction($1, $2, $3, $4, $5, $6)
    `;

    const values = [
      transactionData.userId,
      transactionData.transactionId,
      transactionData.type,
      transactionData.amount,
      transactionData.description || null,
      transactionData.metadata ? JSON.stringify(transactionData.metadata) : null,
    ];

    try {
      const result = await database.query(query, values);
      const rawTransactionData = result.rows[0];
      return this.convertNumericFields(rawTransactionData);
    } catch (error: any) {
      logger.error('Failed to create transaction', { error: error.message, transactionData });

      if (error.message.includes('User not found')) {
        throw new Error('User not found');
      }

      if (error.message.includes('Insufficient funds')) {
        throw new Error('Insufficient funds');
      }

      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Transaction ID already exists');
      }

      throw error;
    }
  }

  private convertNumericFields(row: any): Transaction {
    const camelCaseData = database.toCamelCase(row);

    // Handle invalid processedAt values
    let processedAt = camelCaseData.processedAt;
    if (!processedAt || (typeof processedAt === 'object' && Object.keys(processedAt).length === 0)) {
      // If processedAt is null, undefined, or empty object, set it to current timestamp
      processedAt = new Date().toISOString();
    }

    return {
      ...camelCaseData,
      processedAt,
      amount: parseFloat(camelCaseData.amount),
      balanceBefore: parseFloat(camelCaseData.balanceBefore),
      balanceAfter: parseFloat(camelCaseData.balanceAfter),
    };
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    const query = `
      SELECT
        id, user_id, transaction_id, type, amount,
        balance_before, balance_after, description, metadata,
        processed_at, created_at
      FROM transactions
      WHERE id = $1
    `;

    const result = await database.query(query, [id]);
    return result.rows[0] ? this.convertNumericFields(result.rows[0]) : null;
  }

  async getTransactionByTransactionId(transactionId: string): Promise<Transaction | null> {
    const query = `
      SELECT
        id, user_id, transaction_id, type, amount,
        balance_before, balance_after, description, metadata,
        processed_at, created_at
      FROM transactions
      WHERE transaction_id = $1
    `;

    const result = await database.query(query, [transactionId]);
    return result.rows[0] ? this.convertNumericFields(result.rows[0]) : null;
  }


  async getTransactions(params: ListTransactionsQuery): Promise<PaginatedResponse<Transaction>> {
    const { page = 1, limit = 20, sortBy = 'processedAt', sortOrder = 'desc', userId, type, dateFrom, dateTo } = params;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (userId) {
      whereConditions.push(`user_id = $${paramIndex++}`);
      queryParams.push(userId);
    }

    if (type) {
      whereConditions.push(`type = $${paramIndex++}`);
      queryParams.push(type);
    }

    if (dateFrom) {
      whereConditions.push(`processed_at >= $${paramIndex++}`);
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push(`processed_at <= $${paramIndex++}`);
      queryParams.push(dateTo);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Convert camelCase to snake_case for database
    const dbSortBy = sortBy.replace(/([A-Z])/g, '_$1').toLowerCase();

    const dataQuery = `
      SELECT
        id, user_id, transaction_id, type, amount,
        balance_before, balance_after, description, metadata,
        processed_at, created_at
      FROM transactions
      ${whereClause}
      ORDER BY ${dbSortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM transactions ${whereClause}
    `;

    queryParams.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      database.query(dataQuery, queryParams.slice(0, -2).concat([limit, offset])),
      database.query(countQuery, queryParams.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const pages = Math.ceil(total / limit);

    return {
      data: dataResult.rows.map((row: any) => this.convertNumericFields(row)),
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  async getUserTransactions(
    userId: string, 
    params: Pick<ListTransactionsQuery, 'page' | 'limit' | 'sortBy' | 'sortOrder' | 'type' | 'dateFrom' | 'dateTo'>
  ): Promise<PaginatedResponse<Transaction>> {
    return this.getTransactions({ ...params, userId });
  }

  async getTransactionStats(userId?: string): Promise<{
    totalTransactions: number;
    totalCredits: number;
    totalDebits: number;
    totalWagers: number;
    totalPayouts: number;
  }> {
    let whereClause = '';
    let queryParams: any[] = [];

    if (userId) {
      whereClause = 'WHERE user_id = $1';
      queryParams.push(userId);
    }

    const query = `
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN type IN ('credit', 'payout', 'bonus', 'refund') THEN amount ELSE 0 END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN type IN ('debit', 'wager') THEN amount ELSE 0 END), 0) as total_debits,
        COALESCE(SUM(CASE WHEN type = 'wager' THEN amount ELSE 0 END), 0) as total_wagers,
        COALESCE(SUM(CASE WHEN type = 'payout' THEN amount ELSE 0 END), 0) as total_payouts
      FROM transactions
      ${whereClause}
    `;

    const result = await database.query(query, queryParams);
    const rawStats = result.rows[0];

    // Convert string values to numbers
    return {
      totalTransactions: parseInt(rawStats.total_transactions, 10),
      totalCredits: parseFloat(rawStats.total_credits),
      totalDebits: parseFloat(rawStats.total_debits),
      totalWagers: parseFloat(rawStats.total_wagers),
      totalPayouts: parseFloat(rawStats.total_payouts),
    };
  }
}
