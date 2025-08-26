import database from '../database';
import { UserRepository } from '../repositories/userRepository';
import { TransactionRepository } from '../repositories/transactionRepository';
import logger from '../utils/logger';
import bcrypt from 'bcrypt';
import config from '../config';
import { v4 as uuidv4 } from 'uuid';

const userRepository = new UserRepository();
const transactionRepository = new TransactionRepository();

// Sample user data
const sampleUsers = [
  {
    username: 'admin',
    email: 'admin@yeetcasino.com',
    password: 'admin123',
    role: 'admin' as const,
    balance: 10000.00
  },
  {
    username: 'johndoe',
    email: 'john@example.com',
    password: 'password123',
    role: 'player' as const,
    balance: 1000.50
  },
  {
    username: 'janedoe',
    email: 'jane@example.com',
    password: 'password123',
    role: 'player' as const,
    balance: 2500.75
  },
  {
    username: 'bighigh',
    email: 'big@highroller.com',
    password: 'password123',
    role: 'player' as const,
    balance: 50000.00
  },
  {
    username: 'newbie',
    email: 'newbie@casino.com',
    password: 'password123',
    role: 'player' as const,
    balance: 100.00
  }
];

// Generate additional random users
function generateRandomUsers(count: number) {
  const users = [];
  const firstNames = ['Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Quinn', 'Avery', 'Emerson', 'Sage'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`;
    const email = `${username}@example.com`;
    const balance = Math.round((Math.random() * 10000 + 100) * 100) / 100; // $1 to $10,000
    
    users.push({
      username,
      email,
      password: 'password123',
      role: 'player' as const,
      balance
    });
  }
  
  return users;
}

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');
    
    // Connect to database
    await database.connect();
    
    // Check if users already exist
    const existingUsers = await database.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(existingUsers.rows[0].count);
    
    if (userCount > 0) {
      logger.info(`Database already has ${userCount} users. Skipping seeding.`);
      await database.close();
      return;
    }
    
    // Create users
    const allUsers = [...sampleUsers, ...generateRandomUsers(95)]; // Total 100 users
    const createdUsers = [];
    
    logger.info(`Creating ${allUsers.length} users...`);
    
    for (const userData of allUsers) {
      try {
        // Hash password
        const passwordHash = await bcrypt.hash(userData.password, config.bcryptRounds);
        
        // Insert user
        const userResult = await database.query(`
          INSERT INTO users (username, email, password_hash, role, balance)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, username, email, balance, role, created_at
        `, [userData.username, userData.email, passwordHash, userData.role, userData.balance]);
        
        const user = userResult.rows[0];
        createdUsers.push(user);
        
        // Create initial credit transaction to fund the account
        if (userData.balance > 0) {
          const transactionId = `initial_credit_${user.id}_${Date.now()}`;
          await database.query(`
            SELECT process_transaction($1, $2, $3, $4, $5, $6)
          `, [
            user.id,
            transactionId,
            'credit',
            userData.balance,
            'Initial account funding',
            JSON.stringify({ source: 'seed', type: 'initial_funding' })
          ]);
        }
        
        logger.debug(`Created user: ${userData.username} with balance: $${userData.balance}`);
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          logger.warn(`User ${userData.username} already exists, skipping...`);
        } else {
          logger.error(`Failed to create user ${userData.username}:`, error.message);
        }
      }
    }
    
    logger.info(`Successfully created ${createdUsers.length} users`);
    
    // Create some additional sample transactions
    logger.info('Creating sample transactions...');
    const transactionTypes = ['credit', 'debit', 'wager', 'payout', 'bonus'];
    let transactionCount = 0;
    
    for (let i = 0; i < 200; i++) {
      try {
        const user = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)] as any;
        const amount = Math.round((Math.random() * 500 + 10) * 100) / 100; // $10 to $500
        const transactionId = `sample_${type}_${uuidv4()}_${Date.now()}_${i}`;
        
        // Skip debit if it would make balance negative
        if (type === 'debit' || type === 'wager') {
          const balanceResult = await database.query('SELECT balance FROM users WHERE id = $1', [user.id]);
          if (balanceResult.rows[0].balance < amount) {
            continue; // Skip this transaction
          }
        }
        
        await database.query(`
          SELECT process_transaction($1, $2, $3, $4, $5, $6)
        `, [
          user.id,
          transactionId,
          type,
          amount,
          `Sample ${type} transaction`,
          JSON.stringify({ source: 'seed', game: 'slots', round: `round_${i}` })
        ]);
        
        transactionCount++;
      } catch (error: any) {
        if (error.message.includes('Insufficient funds')) {
          continue; // Skip transactions that would cause insufficient funds
        }
        logger.warn(`Failed to create sample transaction:`, error.message);
      }
    }
    
    logger.info(`Created ${transactionCount} sample transactions`);
    
    // Summary
    const finalStats = await database.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM transactions) as total_transactions,
        (SELECT SUM(balance) FROM users) as total_balance
    `);
    
    const stats = finalStats.rows[0];
    logger.info('Seeding completed successfully!');
    logger.info(`Final stats: ${stats.total_users} users, ${stats.total_transactions} transactions, $${parseFloat(stats.total_balance).toFixed(2)} total balance`);
    
    await database.close();
    
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase();
}

export default seedDatabase;
