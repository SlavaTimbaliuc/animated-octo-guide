# Yeet Casino Backend API & Wallet Service

Welcome to the **Yeet Casino Backend API** - a robust, scalable wallet management system built with Node.js, TypeScript, and PostgreSQL!

## 🌟 Features

- **User Management**: Registration, authentication, and role-based access control
- **Wallet Operations**: Credit/debit operations with atomic transactions
- **Transaction History**: Complete audit trail with pagination and filtering
- **Idempotent Processing**: Duplicate transaction prevention
- **Real-time Balance Management**: Atomic balance updates with race condition protection
- **RESTful API**: Clean, intuitive endpoints with comprehensive error handling
- **Comprehensive Testing**: Jest + Supertest with high test coverage
- **Docker Support**: Easy deployment with Docker Compose
- **Database Migrations**: Automated schema setup and data seeding

## 🏗️ Architecture

### Database Schema

The system uses PostgreSQL with the following core entities:

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    role VARCHAR(20) NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);
```

#### Transactions Table
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    type transaction_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    balance_before DECIMAL(15, 2) NOT NULL CHECK (balance_before >= 0),
    balance_after DECIMAL(15, 2) NOT NULL CHECK (balance_after >= 0),
    description TEXT,
    metadata JSONB,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transaction_balance_consistency
        CHECK (
            (type IN ('credit', 'payout', 'bonus', 'refund') AND balance_after = balance_before + amount) OR
            (type IN ('debit', 'wager') AND balance_after = balance_before - amount)
        )
);
```

#### Transaction Types Enum
```sql
CREATE TYPE transaction_type AS ENUM ('credit', 'debit', 'wager', 'payout', 'bonus', 'refund');
```

### Key Design Decisions

1. **Atomic Transactions**: Database function `process_transaction()` ensures balance updates and transaction logging happen atomically
2. **Idempotency**: Unique `transaction_id` prevents duplicate processing
3. **Audit Trail**: Complete transaction history with before/after balances
4. **Role-based Security**: Admin vs. Player permissions
5. **Scalable Pagination**: Efficient offset-based pagination with sorting

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (if running locally)

### Using Docker Compose (Recommended)

1. **Clone and start the services:**
```bash
cp .env.example .env
docker-compose up --build
```

2. **The API will be available at:**
   - API: http://localhost:3000
   - **API Documentation**: http://localhost:3000/api-docs
   - Database: localhost:5432

### Local Development Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment:**
```bash
cp .env.example .env
# Edit .env with your local database credentials
```

3. **Initialize database:**
```bash
npm run db:setup
npm run db:seed
```

4. **Start development server:**
```bash
npm run dev
```

## 📋 API Documentation

The API includes comprehensive Swagger/OpenAPI documentation for all endpoints:

### Interactive API Docs
Visit **http://localhost:3000/api-docs** to:
- **Explore all endpoints** with detailed descriptions
- **Test API calls** directly from your browser
- **View request/response schemas** and examples
- **Authenticate** with API keys and JWT tokens
- **Download OpenAPI spec** for client SDK generation

### API Specification
The OpenAPI 3.0 specification is automatically generated from JSDoc comments in the route files and can be accessed at:
- **Swagger UI**: http://localhost:3000/api-docs

## 🔑 API Documentation

### Authentication

All API endpoints require an API key:
```
Headers: x-api-key: yeet-casino-api-key-2025
```

User endpoints also require JWT authentication:
```
Headers: Authorization: Bearer <jwt_token>
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Running Integration Tests

```bash
# Start PostgreSQL database
docker-compose up -d postgres

# Set up the database
npm run db:setup

# Run integration tests
npm run test:integration
```

### Sample Test Users

After running `npm run db:seed`, you'll have these test accounts:

```
Admin User:
- Email: admin@yeetcasino.com
- Password: admin123

Sample Players:
- Email: john@example.com, Password: password123
- Email: jane@example.com, Password: password123
- Email: big@highroller.com, Password: password123
```

## 🐳 Docker Configuration

### Services

- **postgres**: PostgreSQL 15 database
- **api**: Node.js application

### Environment Variables

```env
# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=yeet_casino
POSTGRES_USER=yeet_user
POSTGRES_PASSWORD=yeet_password

# API
PORT=3000
API_KEY=yeet-casino-api-key-2025
JWT_SECRET=your-super-secret-jwt-key

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

## 🔒 Security Features

1. **Password Hashing**: bcrypt with configurable rounds
2. **JWT Authentication**: Secure token-based auth
3. **API Key Protection**: All endpoints require valid API key
4. **Role-based Access**: Admin vs Player permissions
5. **Input Validation**: Comprehensive Joi validation
6. **SQL Injection Protection**: Parameterized queries
7. **Rate Limiting Ready**: Helmet.js security headers

## 📊 Database Functions

### `process_transaction()`

Atomic function for processing transactions:

```sql
SELECT process_transaction(
  user_id,
  transaction_id,
  transaction_type,
  amount,
  description,
  metadata
);
```

**Parameters:**
- `p_user_id UUID` - User identifier
- `p_transaction_id VARCHAR(100)` - Unique transaction identifier for idempotency
- `p_type transaction_type` - Transaction type (credit, debit, wager, payout, bonus, refund)
- `p_amount DECIMAL(15, 2)` - Transaction amount
- `p_description TEXT` - Optional transaction description
- `p_metadata JSONB` - Optional metadata for additional details

**Returns:** Complete transaction record

**Features:**
- Row-level locking to prevent race conditions
- Automatic balance calculation and validation
- Insufficient funds checking for debit operations
- Idempotency support via unique transaction_id
- Balance consistency enforcement
- Atomic balance update and transaction logging

### `update_updated_at_column()`

Trigger function that automatically updates the `updated_at` timestamp:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

**Features:**
- Automatically sets `updated_at` to current timestamp
- Called by triggers on table updates
- Ensures consistent timestamp tracking

### `update_users_updated_at` Trigger

Automatically updates the `updated_at` column whenever a user record is modified:

```sql
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Features:**
- Fires before any UPDATE operation on the users table
- Maintains accurate last modification timestamps
- No manual intervention required

### `user_summary` View

Provides a comprehensive view of user information with transaction statistics:

```sql
CREATE OR REPLACE VIEW user_summary AS
SELECT
    u.id,
    u.username,
    u.email,
    u.balance,
    u.status,
    u.role,
    u.created_at,
    u.updated_at,
    u.last_login,
    COALESCE(t.transaction_count, 0) as transaction_count,
    t.last_transaction_date
FROM users u
LEFT JOIN (
    SELECT
        user_id,
        COUNT(*) as transaction_count,
        MAX(processed_at) as last_transaction_date
    FROM transactions
    GROUP BY user_id
) t ON u.id = t.user_id;
```

**Features:**
- Combines user data with transaction statistics
- Shows total transaction count per user
- Displays date of last transaction
- Useful for user analytics and reporting

## 🎯 Key Concepts

### Idempotency

All wallet operations use unique `transaction_id` to ensure:
- Duplicate API calls return the same result
- No double-spending or double-crediting
- Safe retry mechanisms

### Atomic Operations

Database transactions ensure:
- Balance updates and transaction logging happen together
- No partial updates in case of failures
- Consistency across concurrent operations

### Audit Trail

Complete transaction history includes:
- Before and after balances
- Transaction metadata
- Timestamps and descriptions
- User attribution

## 📝 Assumptions & Design Choices

1. **Single Currency**: All amounts in single decimal currency (USD assumed)
2. **PostgreSQL**: Chosen for ACID compliance and JSON support
3. **JWT Tokens**: 24-hour expiry, could be made configurable
4. **API Keys**: Simple implementation, could be enhanced with rate limiting
5. **Pagination**: Offset-based, cursor-based might be better for large datasets
6. **Logging**: Console-based, production would use structured logging services
