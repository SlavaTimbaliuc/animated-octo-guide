import {
  createUserSchema,
  listUsersSchema,
  listTransactionsSchema,
  creditSchema,
  debitSchema,
  userIdSchema,
  transactionIdSchema,
} from '../../utils/validation';

describe('Validation Schemas', () => {
  describe('createUserSchema', () => {
    it('should validate valid user creation data', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'player',
      };

      const result = createUserSchema.validate(validData);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validData);
    });

    it('should use default role when not provided', () => {
      const dataWithoutRole = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      const result = createUserSchema.validate(dataWithoutRole);
      expect(result.error).toBeUndefined();
      expect(result.value.role).toBe('player');
    });

    it('should reject invalid username', () => {
      const invalidData = {
        username: 'user@name', // contains @
        email: 'test@example.com',
        password: 'password123',
      };

      const result = createUserSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('username');
    });

    it('should reject invalid email', () => {
      const invalidData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
      };

      const result = createUserSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('email');
    });

    it('should reject short password', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123', // too short
      };

      const result = createUserSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('password');
    });

    it('should reject invalid role', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'invalid-role',
      };

      const result = createUserSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('role');
    });

    it('should require username', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = createUserSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('username');
    });

    it('should require email', () => {
      const invalidData = {
        username: 'testuser',
        password: 'password123',
      };

      const result = createUserSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('email');
    });

    it('should require password', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
      };

      const result = createUserSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('password');
    });
  });

  describe('listUsersSchema', () => {
    it('should validate valid list users query', () => {
      const validData = {
        page: 2,
        limit: 50,
        sortBy: 'username',
        sortOrder: 'desc',
        status: 'active',
        role: 'admin',
      };

      const result = listUsersSchema.validate(validData);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validData);
    });

    it('should use default values', () => {
      const minimalData = {};

      const result = listUsersSchema.validate(minimalData);
      expect(result.error).toBeUndefined();
      expect(result.value.page).toBe(1);
      expect(result.value.limit).toBe(20);
      expect(result.value.sortBy).toBe('createdAt');
      expect(result.value.sortOrder).toBe('desc');
    });

    it('should reject invalid page number', () => {
      const invalidData = {
        page: 0, // must be >= 1
      };

      const result = listUsersSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('page');
    });

    it('should reject invalid limit', () => {
      const invalidData = {
        limit: 150, // must be <= 100
      };

      const result = listUsersSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('limit');
    });

    it('should reject invalid sortBy', () => {
      const invalidData = {
        sortBy: 'invalid-field',
      };

      const result = listUsersSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('sortBy');
    });

    it('should reject invalid sortOrder', () => {
      const invalidData = {
        sortOrder: 'invalid-order',
      };

      const result = listUsersSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('sortOrder');
    });

    it('should reject invalid status', () => {
      const invalidData = {
        status: 'invalid-status',
      };

      const result = listUsersSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('status');
    });

    it('should reject invalid role', () => {
      const invalidData = {
        role: 'invalid-role',
      };

      const result = listUsersSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('role');
    });
  });

  describe('creditSchema', () => {
    it('should validate valid credit request', () => {
      const validData = {
        transactionId: 'txn-123456789',
        amount: 100.50,
        description: 'Bonus credit',
        metadata: { source: 'admin' },
      };

      const result = creditSchema.validate(validData);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validData);
    });

    it('should validate credit request without optional fields', () => {
      const minimalData = {
        transactionId: 'txn-123456789',
        amount: 50.00,
      };

      const result = creditSchema.validate(minimalData);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(minimalData);
    });

    it('should accept valid transactionId', () => {
      const validData = {
        transactionId: 'txn-12345',
        amount: 100.00,
      };

      const result = creditSchema.validate(validData);
      expect(result.error).toBeUndefined();
      expect(result.value.transactionId).toBe('txn-12345');
    });

    it('should reject zero amount', () => {
      const invalidData = {
        transactionId: 'txn-123456789',
        amount: 0,
      };

      const result = creditSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('amount');
    });

    it('should reject negative amount', () => {
      const invalidData = {
        transactionId: 'txn-123456789',
        amount: -10.00,
      };

      const result = creditSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('amount');
    });

    it('should require transactionId', () => {
      const invalidData = {
        amount: 100.00,
      };

      const result = creditSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('transactionId');
    });

    it('should require amount', () => {
      const invalidData = {
        transactionId: 'txn-123456789',
      };

      const result = creditSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('amount');
    });

    it('should reject long description', () => {
      const invalidData = {
        transactionId: 'txn-123456789',
        amount: 100.00,
        description: 'a'.repeat(501), // too long
      };

      const result = creditSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('description');
    });
  });

  describe('debitSchema', () => {
    it('should validate valid debit request', () => {
      const validData = {
        transactionId: 'txn-123456789',
        amount: 50.25,
        description: 'Purchase payment',
        metadata: { item: 'game-credits' },
      };

      const result = debitSchema.validate(validData);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validData);
    });

    it('should validate debit request with minimal data', () => {
      const minimalData = {
        transactionId: 'txn-123456789',
        amount: 25.00,
      };

      const result = debitSchema.validate(minimalData);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(minimalData);
    });

    // Similar validation tests as creditSchema...
    it('should accept valid transactionId', () => {
      const validData = {
        transactionId: 'txn-12345',
        amount: 50.00,
      };

      const result = debitSchema.validate(validData);
      expect(result.error).toBeUndefined();
    });

    it('should reject zero amount', () => {
      const invalidData = {
        transactionId: 'txn-123456789',
        amount: 0,
      };

      const result = debitSchema.validate(invalidData);
      expect(result.error).toBeDefined();
    });

    it('should require transactionId and amount', () => {
      const result = debitSchema.validate({});
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('transactionId');
      // Joi returns the first error, so we only check for the first required field
    });
  });

  describe('userIdSchema', () => {
    it('should validate valid UUID userId', () => {
      const validData = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = userIdSchema.validate(validData);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validData);
    });

    it('should reject invalid UUID format', () => {
      const invalidData = {
        userId: 'invalid-uuid',
      };

      const result = userIdSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('userId');
    });

    it('should require userId', () => {
      const invalidData = {};

      const result = userIdSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('userId');
    });
  });

  describe('transactionIdSchema', () => {
    it('should validate valid transactionId', () => {
      const validData = {
        transactionId: 'txn-123456789',
      };

      const result = transactionIdSchema.validate(validData);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validData);
    });

    it('should accept short transactionId', () => {
      const validData = {
        transactionId: 'txn-1',
      };

      const result = transactionIdSchema.validate(validData);
      expect(result.error).toBeUndefined();
      expect(result.value.transactionId).toBe('txn-1');
    });

    it('should reject long transactionId', () => {
      const invalidData = {
        transactionId: 'a'.repeat(101), // too long
      };

      const result = transactionIdSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('transactionId');
    });

    it('should require transactionId', () => {
      const invalidData = {};

      const result = transactionIdSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('transactionId');
    });
  });

  describe('listTransactionsSchema', () => {
    it('should validate valid list transactions query', () => {
      const validData = {
        page: 1,
        limit: 25,
        sortBy: 'processedAt',
        sortOrder: 'asc',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'credit',
        dateFrom: '2023-01-01',
        dateTo: '2023-12-31',
      };

      const result = listTransactionsSchema.validate(validData);
      expect(result.error).toBeUndefined();
      expect(result.value.page).toBe(1);
      expect(result.value.limit).toBe(25);
      expect(result.value.userId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.value.type).toBe('credit');
      // Dates are converted to Date objects by Joi
      expect(result.value.dateFrom).toBeInstanceOf(Date);
      expect(result.value.dateTo).toBeInstanceOf(Date);
    });

    it('should use default values', () => {
      const minimalData = {};

      const result = listTransactionsSchema.validate(minimalData);
      expect(result.error).toBeUndefined();
      expect(result.value.page).toBe(1);
      expect(result.value.limit).toBe(20);
      expect(result.value.sortBy).toBe('processedAt');
      expect(result.value.sortOrder).toBe('desc');
    });

    it('should reject invalid date range', () => {
      const invalidData = {
        dateFrom: '2023-12-31',
        dateTo: '2023-01-01', // before dateFrom
      };

      const result = listTransactionsSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('dateTo');
    });

    it('should reject invalid type', () => {
      const invalidData = {
        type: 'invalid-type',
      };

      const result = listTransactionsSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('type');
    });

    it('should reject invalid UUID for userId', () => {
      const invalidData = {
        userId: 'invalid-uuid',
      };

      const result = listTransactionsSchema.validate(invalidData);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('userId');
    });
  });
});