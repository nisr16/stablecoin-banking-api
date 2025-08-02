-- Stablecoin Database Schema
-- Based on ERD for Nexora Core System

-- 1. NEXORA_CORE_SYSTEM
CREATE TABLE IF NOT EXISTS nexora_core_system (
    system_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_name VARCHAR(100),
    version VARCHAR(50),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. NEXORA_API_LAYER
CREATE TABLE IF NOT EXISTS nexora_api_layer (
    api_id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_version VARCHAR(20),
    endpoint_url VARCHAR(200),
    authentication_method VARCHAR(50),
    rate_limit INTEGER
);

-- 3. USER_ACCOUNTS
CREATE TABLE IF NOT EXISTS user_accounts (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_id INTEGER NOT NULL,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    kyc_status VARCHAR(20),
    FOREIGN KEY (system_id) REFERENCES nexora_core_system(system_id)
);

-- 4. CORE_STABLECOIN_LOGIC_BOX
CREATE TABLE IF NOT EXISTS core_stablecoin_logic_box (
    logic_id INTEGER PRIMARY KEY AUTOINCREMENT,
    stablecoin_name VARCHAR(50) NOT NULL,
    blockchain_network VARCHAR(50) NOT NULL,
    smart_contract_address VARCHAR(100) NOT NULL,
    total_supply DECIMAL(20,8)
);

-- 5. CIRCLE_MINT
CREATE TABLE IF NOT EXISTS circle_mint (
    mint_id INTEGER PRIMARY KEY AUTOINCREMENT,
    mint_address VARCHAR(100) NOT NULL,
    minting_capacity DECIMAL(20,8),
    last_mint_timestamp TIMESTAMP,
    mint_fee_percentage DECIMAL(5,2)
);

-- 6. COMPLIANCE_API
CREATE TABLE IF NOT EXISTS compliance_api (
    compliance_id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key VARCHAR(100) NOT NULL,
    kyc_provider VARCHAR(50),
    aml_provider VARCHAR(50),
    last_regulatory_update DATE
);

-- 7. TRANSACTION_RECORDS
CREATE TABLE IF NOT EXISTS transaction_records (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    logic_id INTEGER NOT NULL,
    transaction_hash VARCHAR(100) NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    initiated_by TEXT,
    approval_status TEXT DEFAULT 'auto_approved',
    required_approvals INTEGER DEFAULT 0,
    current_approvals INTEGER DEFAULT 0,
    approval_deadline TIMESTAMP,
    FOREIGN KEY (logic_id) REFERENCES core_stablecoin_logic_box(logic_id)
);

-- 8. CUSTODY_VAULT
CREATE TABLE IF NOT EXISTS custody_vault (
    vault_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vault_address VARCHAR(100) NOT NULL,
    security_level VARCHAR(50) NOT NULL,
    total_assets_value DECIMAL(20,8),
    insurance_coverage DECIMAL(20,8)
);

-- 9. FBO_WALLETS (For Benefit Of wallets)
CREATE TABLE IF NOT EXISTS fbo_wallets (
    wallet_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vault_id INTEGER NOT NULL,
    wallet_address VARCHAR(100) NOT NULL,
    balance DECIMAL(20,8) DEFAULT 0,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vault_id) REFERENCES custody_vault(vault_id)
);

-- 10. SUBWALLETS
CREATE TABLE IF NOT EXISTS subwallets (
    subwallet_id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER NOT NULL,
    subwallet_address VARCHAR(100) NOT NULL,
    purpose VARCHAR(50),
    balance DECIMAL(20,8) DEFAULT 0,
    FOREIGN KEY (wallet_id) REFERENCES fbo_wallets(wallet_id)
);

-- Insert initial data for the core system
INSERT OR IGNORE INTO nexora_core_system (system_id, bank_name, version) 
VALUES (1, 'Nexora', '1.0.0');

-- Insert initial stablecoin logic configuration
INSERT OR IGNORE INTO core_stablecoin_logic_box (logic_id, stablecoin_name, blockchain_network, smart_contract_address, total_supply)
VALUES (1, 'USDC', 'Ethereum', '0xA0b86a33E6441b8c4C8C0C8C0C8C0C8C0C8C0C8C', 1000000000.00000000);

-- Insert initial API layer configuration
INSERT OR IGNORE INTO nexora_api_layer (api_id, api_version, endpoint_url, authentication_method, rate_limit)
VALUES (1, 'v1.0', 'https://api.nexora.com', 'JWT', 1000);

-- Insert initial compliance API
INSERT OR IGNORE INTO compliance_api (compliance_id, api_key, kyc_provider, aml_provider, last_regulatory_update)
VALUES (1, 'compliance_key_123', 'Circle', 'Chainalysis', '2024-01-01');

-- Insert initial custody vault
INSERT OR IGNORE INTO custody_vault (vault_id, vault_address, security_level, total_assets_value, insurance_coverage)
VALUES (1, '0xVaultAddress123456789', 'Level-1', 10000000.00000000, 5000000.00000000);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_accounts_system_id ON user_accounts(system_id);
CREATE INDEX IF NOT EXISTS idx_transaction_records_logic_id ON transaction_records(logic_id);
CREATE INDEX IF NOT EXISTS idx_fbo_wallets_vault_id ON fbo_wallets(vault_id);
CREATE INDEX IF NOT EXISTS idx_subwallets_wallet_id ON subwallets(wallet_id);

-- ========================================
-- ENHANCED BANKING MANAGEMENT TABLES
-- ========================================

-- Banks table (enhanced)
CREATE TABLE IF NOT EXISTS banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_name TEXT UNIQUE NOT NULL,
    bank_code TEXT UNIQUE NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    api_secret TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    country TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bank users table
CREATE TABLE IF NOT EXISTS bank_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    bank_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT,
    employee_id TEXT,
    permissions TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    last_login TIMESTAMP,
    FOREIGN KEY (bank_id) REFERENCES banks(id),
    UNIQUE(bank_id, username),
    UNIQUE(bank_id, email)
);

-- Role definitions table
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_id INTEGER NOT NULL,
    role_name TEXT NOT NULL,
    role_level INTEGER NOT NULL,
    permissions TEXT NOT NULL,
    max_transfer_amount DECIMAL(15,2),
    can_approve_transfers BOOLEAN DEFAULT FALSE,
    can_create_users BOOLEAN DEFAULT FALSE,
    can_modify_settings BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_id) REFERENCES banks(id),
    UNIQUE(bank_id, role_name)
);

-- Approval rules table
CREATE TABLE IF NOT EXISTS approval_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_id INTEGER NOT NULL,
    rule_name TEXT NOT NULL,
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2),
    required_role_level INTEGER NOT NULL,
    required_approvals INTEGER DEFAULT 1,
    auto_approve BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY (bank_id) REFERENCES banks(id)
);

-- Transfer approvals table
CREATE TABLE IF NOT EXISTS transfer_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id TEXT NOT NULL,
    approver_user_id TEXT NOT NULL,
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comments TEXT,
    approval_method TEXT DEFAULT 'api',
    ip_address TEXT,
    FOREIGN KEY (transfer_id) REFERENCES transaction_records(transaction_id),
    FOREIGN KEY (approver_user_id) REFERENCES bank_users(user_id)
);

-- Approval columns are now included in the transaction_records table definition above

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_bank_users_bank_id ON bank_users(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_users_user_id ON bank_users(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_bank_id ON roles(bank_id);
CREATE INDEX IF NOT EXISTS idx_approval_rules_bank_id ON approval_rules(bank_id);
CREATE INDEX IF NOT EXISTS idx_transfer_approvals_transfer_id ON transfer_approvals(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_approvals_approver_id ON transfer_approvals(approver_user_id);

-- Insert sample bank data
INSERT OR IGNORE INTO banks (id, bank_name, bank_code, api_key, api_secret, contact_email, country, status)
VALUES (1, 'Nexora Bank', 'NEX001', 'nexora_api_key_123', 'nexora_secret_456', 'admin@nexora.com', 'United States', 'active');

-- Insert sample roles
INSERT OR IGNORE INTO roles (id, bank_id, role_name, role_level, permissions, max_transfer_amount, can_approve_transfers, can_create_users, can_modify_settings)
VALUES 
(1, 1, 'Admin', 10, 'all', 1000000.00, TRUE, TRUE, TRUE),
(2, 1, 'Manager', 7, 'transfers,approvals,reports', 500000.00, TRUE, FALSE, FALSE),
(3, 1, 'Operator', 5, 'transfers,reports', 100000.00, FALSE, FALSE, FALSE),
(4, 1, 'Viewer', 1, 'reports', 0.00, FALSE, FALSE, FALSE);

-- Insert sample approval rules
INSERT OR IGNORE INTO approval_rules (id, bank_id, rule_name, min_amount, max_amount, required_role_level, required_approvals, auto_approve, created_by)
VALUES 
(1, 1, 'Small Transfer', 0.01, 10000.00, 5, 1, TRUE, 'system'),
(2, 1, 'Medium Transfer', 10000.01, 100000.00, 7, 1, FALSE, 'system'),
(3, 1, 'Large Transfer', 100000.01, 1000000.00, 10, 2, FALSE, 'system'); 