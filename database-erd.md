# Yeet Casino Database ERD

## Entity Relationship Diagram

### ASCII Diagram

```
┌─────────────────┐       ┌───────────────────┐
│     users       │       │   transactions    │
├─────────────────┤       ├───────────────────┤
│ id (PK)         │◄──────┤ id (PK)           │
│ username (UK)   │       │ user_id (FK)      │
│ email (UK)      │       │ transaction_id(UK)│
│ password_hash   │       │ type              │
│ balance         │       │ amount            │
│ status          │       │ balance_before    │
│ role            │       │ balance_after     │
│ created_at      │       │ description       │
│ updated_at      │       │ metadata          │
│ last_login      │       │ processed_at      │
└─────────────────┘       │ created_at        │
                          └───────────────────┘
                                 │
                                 │
                                 ▼
                    ┌───────────────────┐
                    │  user_summary     │
                    │     (view)        │
                    ├───────────────────┤
                    │ id (PK)           │
                    │ username          │
                    │ email             │
                    │ balance           │
                    │ status            │
                    │ role              │
                    │ created_at        │
                    │ updated_at        │
                    │ last_login        │
                    │ transaction_count │
                    │ last_transaction..│
                    └───────────────────┘
```

### Mermaid Diagram (for GitHub/GitLab rendering)

```mermaid
ERD
    users ||--o{ transactions : "has many"
    users {
        UUID id PK
        VARCHAR username UK
        VARCHAR email UK
        VARCHAR password_hash
        DECIMAL balance
        VARCHAR status
        VARCHAR role
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP last_login
    }

    transactions {
        UUID id PK
        UUID user_id FK
        VARCHAR transaction_id UK
        ENUM type
        DECIMAL amount
        DECIMAL balance_before
        DECIMAL balance_after
        TEXT description
        JSONB metadata
        TIMESTAMP processed_at
        TIMESTAMP created_at
    }

    user_summary ||--|| users : "extends"
    user_summary {
        UUID id PK
        VARCHAR username
        VARCHAR email
        DECIMAL balance
        VARCHAR status
        VARCHAR role
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP last_login
        INTEGER transaction_count
        TIMESTAMP last_transaction_date
    }
```

## Detailed Entity Descriptions

### Users Entity
- **Primary Key**: `id` (UUID)
- **Unique Constraints**: `username`, `email`
- **Relationships**:
  - One-to-many with `transactions` (via `user_id` foreign key)
- **Key Attributes**:
  - `balance`: User's current balance (must be >= 0)
  - `status`: User status (active/suspended/inactive)
  - `role`: User role (player/admin)

### Transactions Entity
- **Primary Key**: `id` (UUID)
- **Unique Constraints**: `transaction_id` (for idempotency)
- **Foreign Key**: `user_id` references `users.id`
- **Relationships**:
  - Many-to-one with `users`
- **Key Attributes**:
  - `type`: Transaction type (credit/debit/wager/payout/bonus/refund)
  - `amount`: Transaction amount (must be > 0)
  - `balance_before`/`balance_after`: Balance tracking for consistency
  - `metadata`: Flexible JSON storage for additional details

### User Summary View
- **Primary Key**: `id` (inherited from users)
- **Purpose**: Aggregated view combining user data with transaction statistics
- **Usage in Codebase**: Used in `src/repositories/userRepository.ts` for listing users with transaction counts
- **Database Definition**: Located in `sql/init.sql` (lines 138-159)
- **Documentation**: Documented in `README.md` section on database views
- **Key Attributes**:
  - `transaction_count`: Total number of transactions for the user
  - `last_transaction_date`: Timestamp of the most recent transaction

## Relationship Cardinality
- **users** ↔ **transactions**: One-to-Many
  - One user can have multiple transactions
  - Each transaction belongs to exactly one user
  - Cascade delete: deleting a user removes all their transactions

## Data Flow
1. User registration creates a record in `users` table
2. Financial operations create records in `transactions` table
3. Balance updates are handled atomically via the `process_transaction` function
4. `user_summary` view provides aggregated data for reporting and analytics

## Indexes
- Performance optimized with indexes on:
  - `users`: username, email, status, created_at, balance
  - `transactions`: user_id, type, processed_at, transaction_id, composite (user_id, processed_at)