const db = require('./connection');

/**
 * Database utility functions for managing the stablecoin database
 */

/**
 * Show database statistics
 */
function showDatabaseStats() {
  try {
    console.log('\n=== Database Statistics ===');
    
    // Count records in each table
    const tables = [
      'nexora_core_system',
      'nexora_api_layer', 
      'user_accounts',
      'core_stablecoin_logic_box',
      'circle_mint',
      'compliance_api',
      'transaction_records',
      'custody_vault',
      'fbo_wallets',
      'subwallets',
      'banks',
      'bank_users',
      'roles',
      'approval_rules',
      'transfer_approvals'
    ];
    
    for (const table of tables) {
      const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
      const result = stmt.get();
      console.log(`${table}: ${result.count} records`);
    }
    
    console.log('\n=== Recent Transactions ===');
    const transactionsStmt = db.prepare(`
      SELECT transaction_id, transaction_hash, amount, status, timestamp 
      FROM transaction_records 
      ORDER BY timestamp DESC 
      LIMIT 5
    `);
    const transactions = transactionsStmt.all();
    
    transactions.forEach(t => {
      console.log(`Transfer ${t.transaction_id}: ${t.amount} USDC - ${t.status} (${t.timestamp})`);
    });
    
    console.log('\n=== Recent Wallets ===');
    const walletsStmt = db.prepare(`
      SELECT wallet_id, wallet_address, balance, creation_date 
      FROM fbo_wallets 
      ORDER BY creation_date DESC 
      LIMIT 5
    `);
    const wallets = walletsStmt.all();
    
    wallets.forEach(w => {
      console.log(`Wallet ${w.wallet_id}: ${w.balance} USDC (${w.creation_date})`);
    });
    
  } catch (error) {
    console.error('Error showing database stats:', error);
  }
}

/**
 * Reset database (delete all data and recreate tables)
 */
function resetDatabase() {
  try {
    console.log('Resetting database...');
    
    // Drop all tables
    const tables = [
      'transfer_approvals',
      'approval_rules',
      'roles',
      'bank_users',
      'banks',
      'subwallets',
      'fbo_wallets', 
      'custody_vault',
      'transaction_records',
      'compliance_api',
      'circle_mint',
      'core_stablecoin_logic_box',
      'user_accounts',
      'nexora_api_layer',
      'nexora_core_system'
    ];
    
    for (const table of tables) {
      const dropStmt = db.prepare(`DROP TABLE IF EXISTS ${table}`);
      dropStmt.run();
    }
    
    console.log('Tables dropped. Recreating schema...');
    
    // Recreate schema
    const schemaPath = require('path').join(__dirname, 'schema.sql');
    const schema = require('fs').readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    
    console.log('Database reset successfully!');
    
  } catch (error) {
    console.error('Error resetting database:', error);
  }
}

/**
 * Show table structure
 */
function showTableStructure() {
  try {
    console.log('\n=== Database Schema ===');
    
    const tables = [
      'nexora_core_system',
      'nexora_api_layer',
      'user_accounts', 
      'core_stablecoin_logic_box',
      'circle_mint',
      'compliance_api',
      'transaction_records',
      'custody_vault',
      'fbo_wallets',
      'subwallets',
      'banks',
      'bank_users',
      'roles',
      'approval_rules',
      'transfer_approvals'
    ];
    
    for (const table of tables) {
      console.log(`\n--- ${table.toUpperCase()} ---`);
      const columnsStmt = db.prepare(`PRAGMA table_info(${table})`);
      const columns = columnsStmt.all();
      columns.forEach(col => {
        console.log(`  ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
      });
    }
    
  } catch (error) {
    console.error('Error showing table structure:', error);
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'stats':
      showDatabaseStats();
      break;
    case 'reset':
      resetDatabase();
      break;
    case 'schema':
      showTableStructure();
      break;
    default:
      console.log('Usage: node database/utils.js [stats|reset|schema]');
      console.log('  stats  - Show database statistics');
      console.log('  reset  - Reset database (delete all data)');
      console.log('  schema - Show table structure');
  }
}

module.exports = {
  showDatabaseStats,
  resetDatabase,
  showTableStructure
}; 