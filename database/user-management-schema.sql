-- User Management Schema for Enterprise Stablecoin Banking API
-- This schema handles multi-bank user management, roles, and approval workflows

-- Banks table
CREATE TABLE IF NOT EXISTS banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_name TEXT NOT NULL UNIQUE,
    bank_code TEXT NOT NULL UNIQUE,
    api_key TEXT NOT NULL UNIQUE,
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
    user_id TEXT NOT NULL UNIQUE,
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
    last_login TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_id INTEGER NOT NULL,
    role_name TEXT NOT NULL,
    role_level INTEGER NOT NULL,
    permissions TEXT,
    max_transfer_amount DECIMAL(15,2),
    can_approve_transfers BOOLEAN DEFAULT FALSE,
    can_create_users BOOLEAN DEFAULT FALSE,
    can_modify_settings BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE
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
    FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE
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
    FOREIGN KEY (approver_user_id) REFERENCES bank_users(user_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_banks_api_key ON banks(api_key);
CREATE INDEX IF NOT EXISTS idx_bank_users_bank_id ON bank_users(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_users_user_id ON bank_users(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_bank_id ON roles(bank_id);
CREATE INDEX IF NOT EXISTS idx_approval_rules_bank_id ON approval_rules(bank_id);
CREATE INDEX IF NOT EXISTS idx_transfer_approvals_transfer_id ON transfer_approvals(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_approvals_approver ON transfer_approvals(approver_user_id); 