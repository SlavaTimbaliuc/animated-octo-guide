import { UserRepository } from '../repositories/userRepository';
import { User, UserSummary, CreateUserRequest, ListUsersQuery, PaginatedResponse } from '../types';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async createUser(userData: CreateUserRequest): Promise<{ user: User; token: string }> {
    logger.info('Creating new user', { username: userData.username, email: userData.email });
    
    const user = await this.userRepository.createUser(userData);
    const token = this.generateToken(user);
    
    logger.info('User created successfully', { userId: user.id, username: user.username });
    
    return { user, token };
  }

  async authenticateUser(email: string, password: string): Promise<{ user: User; token: string } | null> {
    logger.info('Authenticating user', { email });
    
    const user = await this.userRepository.verifyPassword(email, password);
    
    if (!user) {
      logger.warn('Authentication failed', { email });
      return null;
    }
    
    if (user.status !== 'active') {
      logger.warn('Login attempt by inactive user', { userId: user.id, status: user.status });
      throw new Error(`Account is ${user.status}`);
    }
    
    const token = this.generateToken(user);
    
    logger.info('User authenticated successfully', { userId: user.id, username: user.username });
    
    return { user, token };
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.getUserById(id);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.userRepository.getUserByUsername(username);
  }

  async getUsers(params: ListUsersQuery): Promise<PaginatedResponse<UserSummary>> {
    logger.debug('Fetching users list', params);
    return this.userRepository.getUsers(params);
  }

  async updateUserStatus(id: string, status: 'active' | 'suspended' | 'inactive'): Promise<User | null> {
    logger.info('Updating user status', { userId: id, status });
    
    const user = await this.userRepository.updateUserStatus(id, status);
    
    if (user) {
      logger.info('User status updated successfully', { userId: id, status });
    } else {
      logger.warn('Failed to update user status - user not found', { userId: id });
    }
    
    return user;
  }

  async getUserBalance(id: string): Promise<number | null> {
    return this.userRepository.getUserBalance(id);
  }

  private generateToken(user: User): string {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    
    return jwt.sign(payload, config.jwt.secret);
  }

  async validateUserExists(id: string): Promise<void> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.status !== 'active') {
      throw new Error(`User account is ${user.status}`);
    }
  }
}
