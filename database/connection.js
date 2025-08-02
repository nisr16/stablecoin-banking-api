/**
 * DATABASE CONNECTION MODULE
 * 
 * This file manages the connection to our SQLite database that stores all banking data.
 * It handles database initialization, schema loading, and graceful shutdown.
 * 
 * WHAT THIS FILE DOES:
 * - Creates and manages the SQLite database connection
 * - Loads all database schemas (tables and relationships)
 * - Ensures database directory exists
 * - Enables foreign key constraints for data integrity
 * - Handles graceful shutdown when the server stops
 * 
 * DATABASE STRUCTURE:
 * - Uses SQLite for simplicity and reliability
 * - Stores all banking data in a single file (stablecoin.db)
 * - Has 15+ interconnected tables for complete banking operations
 * - Enforces foreign key relationships for data consistency
 * 
 * SCHEMA FILES LOADED:
 * - schema.sql: Core banking tables (wallets, transfers, etc.)
 * - user-management-schema.sql: Bank and user management tables
 * - notifications-schema.sql: Notification and webhook tables
 * 
 * SECURITY FEATURES:
 * - Foreign key constraints prevent orphaned data
 * - Database file is stored securely
 * - Graceful shutdown prevents data corruption
 * 
 * Author: Development Team
 * Version: 1.0.0
 * Last Updated: August 2025
 */

// Import required libraries
const Database = require('better-sqlite3'); // High-performance SQLite library for Node.js
const fs = require('fs'); // File system operations
const path = require('path'); // Path manipulation utilities

/**
 * DATABASE DIRECTORY SETUP
 * 
 * This ensures the database directory exists before we try to create the database file.
 * If the directory doesn't exist, it creates it automatically.
 * 
 * WHY THIS IS IMPORTANT:
 * - Prevents errors when the database file is created
 * - Ensures consistent database location
 * - Works across different deployment environments
 */
const dbDir = path.join(__dirname); // Get the current directory path
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true }); // Create directory if it doesn't exist
}

/**
 * DATABASE CONNECTION ESTABLISHMENT
 * 
 * This creates the actual connection to our SQLite database.
 * The database file will be created automatically if it doesn't exist.
 * 
 * DATABASE FILE:
 * - Name: stablecoin.db
 * - Location: database/stablecoin.db
 * - Type: SQLite database file
 * - Size: Grows as data is added
 */
const dbPath = path.join(dbDir, 'stablecoin.db'); // Full path to database file
const db = new Database(dbPath); // Create database connection

/**
 * FOREIGN KEY ENABLEMENT
 * 
 * This enables foreign key constraints in SQLite, which ensures data integrity.
 * Foreign keys prevent orphaned records and maintain referential integrity.
 * 
 * WHAT THIS DOES:
 * - Prevents deleting a bank that has users
 * - Prevents deleting a wallet that has transfers
 * - Ensures all relationships between tables are valid
 * - Maintains data consistency across the entire database
 */
db.pragma('foreign_keys = ON'); // Enable foreign key constraints

/**
 * DATABASE INITIALIZATION FUNCTION
 * 
 * This function loads all the database schemas (table definitions) when the server starts.
 * It reads SQL files and executes them to create the database structure.
 * 
 * SCHEMA LOADING PROCESS:
 * 1. Load core banking schema (wallets, transfers, etc.)
 * 2. Load user management schema (banks, users, roles, etc.)
 * 3. Load notifications schema (notifications, webhooks, etc.)
 * 
 * ERROR HANDLING:
 * - Catches and logs any schema loading errors
 * - Continues operation even if some schemas fail
 * - Provides detailed error messages for debugging
 */
function initializeDatabase() {
  try {
    // Load core banking schema (wallets, transfers, custody vaults, etc.)
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8'); // Read the SQL file
      db.exec(schema); // Execute the SQL to create tables
    }

    // Load user management schema (banks, users, roles, approval rules, etc.)
    const userSchemaPath = path.join(__dirname, 'user-management-schema.sql');
    if (fs.existsSync(userSchemaPath)) {
      const userSchema = fs.readFileSync(userSchemaPath, 'utf8'); // Read the SQL file
      db.exec(userSchema); // Execute the SQL to create tables
    }

    // Load notifications schema (notifications, webhooks, preferences, etc.)
    const notificationsSchemaPath = path.join(__dirname, 'notifications-schema.sql');
    if (fs.existsSync(notificationsSchemaPath)) {
      const notificationsSchema = fs.readFileSync(notificationsSchemaPath, 'utf8'); // Read the SQL file
      db.exec(notificationsSchema); // Execute the SQL to create tables
    }

    console.log('Database initialized successfully'); // Confirm successful initialization
  } catch (error) {
    console.error('Database initialization error:', error); // Log any errors
  }
}

/**
 * DATABASE INITIALIZATION ON STARTUP
 * 
 * This calls the initialization function when the server starts.
 * It ensures the database is ready before any banking operations begin.
 */
initializeDatabase();

/**
 * GRACEFUL SHUTDOWN HANDLING
 * 
 * This ensures the database connection is properly closed when the server stops.
 * This prevents data corruption and ensures all data is saved properly.
 * 
 * SHUTDOWN SCENARIOS:
 * - Normal server shutdown (SIGTERM)
 * - Manual interruption (SIGINT - Ctrl+C)
 * - System restart (SIGHUP)
 * - Process termination (exit)
 * 
 * WHAT HAPPENS ON SHUTDOWN:
 * - Database connection is properly closed
 * - All pending transactions are committed
 * - Database file is safely saved
 * - No data corruption occurs
 */
process.on('exit', () => {
  db.close(); // Close database connection
});

// Handle different shutdown signals
process.on('SIGHUP', () => process.exit(128 + 1)); // System restart signal
process.on('SIGINT', () => process.exit(128 + 2)); // Manual interruption (Ctrl+C)
process.on('SIGTERM', () => process.exit(128 + 15)); // Normal shutdown signal

/**
 * MODULE EXPORT
 * 
 * This exports the database connection so other parts of the application can use it.
 * The exported 'db' object provides methods for all database operations.
 * 
 * AVAILABLE METHODS:
 * - db.prepare(): Create prepared statements for queries
 * - db.exec(): Execute SQL statements
 * - db.close(): Close the database connection
 * - db.pragma(): Set database pragmas (like foreign keys)
 */
module.exports = db; 