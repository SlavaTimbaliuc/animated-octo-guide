import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Yeet Casino API',
      version: '1.0.0',
      description: 'Yeet Casino Backend API & Wallet Service',
      contact: {
        name: 'Yeet Casino Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API Key for authentication',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for user authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Validation failed',
                },
              },
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            username: {
              type: 'string',
              example: 'johndoe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
            },
            balance: {
              type: 'number',
              format: 'decimal',
              example: 100.50,
            },
            status: {
              type: 'string',
              enum: ['active', 'suspended', 'inactive'],
              example: 'active',
            },
            role: {
              type: 'string',
              enum: ['player', 'admin'],
              example: 'player',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z',
            },
            last_login: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2025-01-01T12:00:00.000Z',
            },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            transaction_id: {
              type: 'string',
              example: 'txn_123456789',
            },
            type: {
              type: 'string',
              enum: ['credit', 'debit', 'wager', 'payout', 'bonus', 'refund'],
              example: 'credit',
            },
            amount: {
              type: 'number',
              format: 'decimal',
              example: 50.00,
            },
            balance_before: {
              type: 'number',
              format: 'decimal',
              example: 100.00,
            },
            balance_after: {
              type: 'number',
              format: 'decimal',
              example: 150.00,
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Bonus deposit',
            },
            metadata: {
              type: 'object',
              nullable: true,
              example: { game_id: 'slots_001' },
            },
            processed_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T12:00:00.000Z',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T12:00:00.000Z',
            },
          },
        },
        UserRegister: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              example: 'johndoe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
            },
            password: {
              type: 'string',
              minLength: 6,
              example: 'securepassword123',
            },
          },
        },
        UserLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
            },
            password: {
              type: 'string',
              example: 'securepassword123',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
              },
            },
          },
        },
        BalanceResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                balance: {
                  type: 'number',
                  format: 'decimal',
                  example: 150.50,
                },
                currency: {
                  type: 'string',
                  example: 'USD',
                },
              },
            },
          },
        },
        PaginatedTransactionsResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Transaction',
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  example: 1,
                },
                limit: {
                  type: 'integer',
                  example: 5,
                },
                total: {
                  type: 'integer',
                  example: 25,
                },
                pages: {
                  type: 'integer',
                  example: 5,
                },
              },
            },
          },
        },
        CurrentUserResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User',
            },
            balance: {
              type: 'number',
              format: 'decimal',
              example: 20366.17,
            },
            recentTransactions: {
              $ref: '#/components/schemas/PaginatedTransactionsResponse',
            },
          },
        },
        TransactionRequest: {
          type: 'object',
          required: ['amount', 'type'],
          properties: {
            amount: {
              type: 'number',
              format: 'decimal',
              minimum: 0.01,
              example: 50.00,
            },
            type: {
              type: 'string',
              enum: ['credit', 'debit'],
              example: 'credit',
            },
            description: {
              type: 'string',
              example: 'Admin credit for bonus',
            },
          },
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Paths to files containing OpenAPI definitions
};

export const specs = swaggerJsdoc(options);