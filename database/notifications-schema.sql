-- Notifications and Webhooks Schema

-- WebSocket connections table
CREATE TABLE IF NOT EXISTS websocket_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connection_id TEXT UNIQUE NOT NULL,
    bank_id INTEGER,
    user_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (bank_id) REFERENCES banks(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_id INTEGER,
    user_id INTEGER,
    type TEXT NOT NULL, -- 'transfer', 'approval', 'system', 'security'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    status TEXT DEFAULT 'unread', -- 'unread', 'read', 'archived'
    metadata TEXT, -- JSON string for additional data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    FOREIGN KEY (bank_id) REFERENCES banks(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Webhook endpoints table
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_id INTEGER,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT NOT NULL, -- JSON array of event types
    secret_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_triggered DATETIME,
    failure_count INTEGER DEFAULT 0,
    FOREIGN KEY (bank_id) REFERENCES banks(id)
);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    webhook_id INTEGER,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON payload sent
    response_code INTEGER,
    response_body TEXT,
    delivery_time_ms INTEGER,
    success BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhook_id) REFERENCES webhook_endpoints(id)
);

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT NOT NULL,
    variables TEXT, -- JSON array of variable names
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SMS templates
CREATE TABLE IF NOT EXISTS sms_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    message TEXT NOT NULL,
    variables TEXT, -- JSON array of variable names
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    email_enabled BOOLEAN DEFAULT 1,
    sms_enabled BOOLEAN DEFAULT 0,
    push_enabled BOOLEAN DEFAULT 1,
    webhook_enabled BOOLEAN DEFAULT 1,
    transfer_notifications BOOLEAN DEFAULT 1,
    approval_notifications BOOLEAN DEFAULT 1,
    security_notifications BOOLEAN DEFAULT 1,
    system_notifications BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Slack/Teams integration settings
CREATE TABLE IF NOT EXISTS team_integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_id INTEGER,
    platform TEXT NOT NULL, -- 'slack', 'teams'
    webhook_url TEXT NOT NULL,
    channel TEXT,
    events TEXT NOT NULL, -- JSON array of event types
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_id) REFERENCES banks(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_bank_user ON notifications(bank_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_websocket_connections_active ON websocket_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_bank ON webhook_endpoints(bank_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id); 