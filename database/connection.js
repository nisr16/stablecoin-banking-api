const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Open database connection
const dbPath = path.join(dbDir, 'stablecoin.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database with schema
function initializeDatabase() {
  try {
    // Run original schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schema);
    }

    // Run user management schema
    const userSchemaPath = path.join(__dirname, 'user-management-schema.sql');
    if (fs.existsSync(userSchemaPath)) {
      const userSchema = fs.readFileSync(userSchemaPath, 'utf8');
      db.exec(userSchema);
    }

    // Run notifications schema
    const notificationsSchemaPath = path.join(__dirname, 'notifications-schema.sql');
    if (fs.existsSync(notificationsSchemaPath)) {
      const notificationsSchema = fs.readFileSync(notificationsSchemaPath, 'utf8');
      db.exec(notificationsSchema);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize on startup
initializeDatabase();

// Graceful shutdown
process.on('exit', () => {
  db.close();
});

process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

module.exports = db; 