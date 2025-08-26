-- Yeet Casino Database Schema
-- PostgreSQL 15+

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - stores essential user information
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    role VARCHAR(20) NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,

    -- Indexes for performance
    CONSTRAINT users_balance_non_negative CHECK (balance >= 0)
);

-- Transaction types enum
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('credit', 'debit', 'wager', 'payout', 'bonus', 'refund');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Transactions table - records all financial activities
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100) UNIQUE NOT NULL, -- For idempotency
    type transaction_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    balance_before DECIMAL(15, 2) NOT NULL CHECK (balance_before >= 0),
    balance_after DECIMAL(15, 2) NOT NULL CHECK (balance_after >= 0),
    description TEXT,
    metadata JSONB, -- For storing additional transaction details
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Ensure balance consistency
    CONSTRAINT transaction_balance_consistency
        CHECK (
            (type IN ('credit', 'payout', 'bonus', 'refund') AND balance_after = balance_before + amount) OR
            (type IN ('debit', 'wager') AND balance_after = balance_before - amount)
        )
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_processed_at ON transactions(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_processed ON transactions(user_id, processed_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to handle balance updates atomically
CREATE OR REPLACE FUNCTION process_transaction(
    p_user_id UUID,
    p_transaction_id VARCHAR(100),
    p_type transaction_type,
    p_amount DECIMAL(15, 2),
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS transactions AS $$
DECLARE
    current_balance DECIMAL(15, 2);
    new_balance DECIMAL(15, 2);
    transaction_record transactions;
BEGIN
    -- Lock the user row to prevent race conditions
    SELECT balance INTO current_balance
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    -- Calculate new balance based on transaction type
    CASE p_type
        WHEN 'credit', 'payout', 'bonus', 'refund' THEN
            new_balance := current_balance + p_amount;
        WHEN 'debit', 'wager' THEN
            new_balance := current_balance - p_amount;
            IF new_balance < 0 THEN
                RAISE EXCEPTION 'Insufficient funds. Current balance: %, Attempted debit: %', current_balance, p_amount;
            END IF;
        ELSE
            RAISE EXCEPTION 'Invalid transaction type: %', p_type;
    END CASE;

    -- Insert transaction record and return the row directly
    INSERT INTO transactions (
        user_id, transaction_id, type, amount,
        balance_before, balance_after, description, metadata
    ) VALUES (
        p_user_id, p_transaction_id, p_type, p_amount,
        current_balance, new_balance, p_description, p_metadata
    ) RETURNING * INTO transaction_record;

    -- Update user balance
    UPDATE users
    SET balance = new_balance, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    RETURN transaction_record;
END;
$$ LANGUAGE plpgsql;

-- Create view for user summary with recent transaction count
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
