import database from '../database';
import { User, UserSummary, CreateUserRequest, ListUsersQuery, PaginatedResponse } from '../types';
import bcrypt from 'bcrypt';
import config from '../config';
import logger from '../utils/logger';

export class UserRepository {
  async createUser(userData: CreateUserRequest): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, config.bcryptRounds);
    
    const query = `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, balance, status, role, created_at, updated_at, last_login
    `;
    
    const values = [userData.username, userData.email, hashedPassword, userData.role || 'player'];
    
    try {
      const result = await database.query(query, values);
      return database.toCamelCase(result.rows[0]);
    } catch (error: any) {
      logger.error('Failed to create user', { error: error.message, userData: { ...userData, password: '[REDACTED]' } });
      
      if (error.code === '23505') { // Unique constraint violation
        if (error.constraint === 'users_username_key') {
          throw new Error('Username already exists');
        }
        if (error.constraint === 'users_email_key') {
          throw new Error('Email already exists');
        }
      }
      
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, balance, status, role, created_at, updated_at, last_login
      FROM users 
      WHERE id = $1
    `;
    
    const result = await database.query(query, [id]);
    return result.rows[0] ? database.toCamelCase(result.rows[0]) : null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, balance, status, role, created_at, updated_at, last_login
      FROM users 
      WHERE username = $1
    `;
    
    const result = await database.query(query, [username]);
    return result.rows[0] ? database.toCamelCase(result.rows[0]) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, balance, status, role, created_at, updated_at, last_login
      FROM users 
      WHERE email = $1
    `;
    
    const result = await database.query(query, [email]);
    return result.rows[0] ? database.toCamelCase(result.rows[0]) : null;
  }

  async getUsers(params: ListUsersQuery): Promise<PaginatedResponse<UserSummary>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', status, role } = params;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (role) {
      whereConditions.push(`role = $${paramIndex++}`);
      queryParams.push(role);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Convert camelCase to snake_case for database
    const dbSortBy = sortBy.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    const dataQuery = `
      SELECT * FROM user_summary
      ${whereClause}
      ORDER BY ${dbSortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total FROM users ${whereClause}
    `;

    queryParams.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      database.query(dataQuery, queryParams.slice(0, -2).concat([limit, offset])),
      database.query(countQuery, queryParams.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const pages = Math.ceil(total / limit);

    return {
      data: database.toCamelCase(dataResult.rows),
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, password_hash, balance, status, role, created_at, updated_at, last_login
      FROM users 
      WHERE email = $1
    `;
    
    const result = await database.query(query, [email]);
    
    if (!result.rows[0]) {
      return null;
    }
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return null;
    }

    // Update last login
    await database.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    const { password_hash, ...userWithoutPassword } = user;
    return database.toCamelCase(userWithoutPassword);
  }

  async updateUserStatus(id: string, status: 'active' | 'suspended' | 'inactive'): Promise<User | null> {
    const query = `
      UPDATE users 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, email, balance, status, role, created_at, updated_at, last_login
    `;
    
    const result = await database.query(query, [status, id]);
    return result.rows[0] ? database.toCamelCase(result.rows[0]) : null;
  }

  async getUserBalance(id: string): Promise<number | null> {
    const query = 'SELECT balance FROM users WHERE id = $1';
    const result = await database.query(query, [id]);
    return result.rows[0] ? parseFloat(result.rows[0].balance) : null;
  }
}
