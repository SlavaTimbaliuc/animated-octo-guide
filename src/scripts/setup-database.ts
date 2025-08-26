import database from '../database';
import logger from '../utils/logger';
import { readFileSync } from 'fs';
import { join } from 'path';

async function setupDatabase() {
  try {
    logger.info('Setting up database...');

    // Connect to database
    await database.connect();

    // Read and execute the SQL file
    const sqlPath = join(__dirname, '../../sql/init.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    // Parse SQL statements while handling dollar-quoted strings and PL/pgSQL functions
    const statements = [];
    let currentStatement = '';
    let inDollarQuotes = false;
    let dollarQuoteStart = '';

    // Split by lines but preserve statement structure
    const lines = sql.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (trimmedLine.startsWith('--') || trimmedLine === '') {
        i++;
        continue;
      }

      currentStatement += line + '\n';

      // Check for dollar quote start/end
      if (!inDollarQuotes) {
        // Look for opening dollar quotes
        const dollarMatch = trimmedLine.match(/\$\$/g);
        if (dollarMatch && dollarMatch.length === 1) {
          inDollarQuotes = true;
          dollarQuoteStart = '$$';
        }
      } else {
        // Look for closing dollar quotes
        if (trimmedLine.includes('$$')) {
          inDollarQuotes = false;
          dollarQuoteStart = '';
        }
      }

      // If we're not in dollar quotes and the line ends with semicolon, it's a statement end
      if (!inDollarQuotes && trimmedLine.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }

      i++;
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await database.query(statement);
          logger.debug('Executed SQL statement:', statement.substring(0, 100) + '...');
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            logger.warn('Statement skipped (already exists):', statement.substring(0, 50) + '...');
          } else {
            throw error;
          }
        }
      }
    }

    logger.info('Database setup completed successfully');
    await database.close();
    
  } catch (error) {
    logger.error('Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupDatabase();
}

export default setupDatabase;
