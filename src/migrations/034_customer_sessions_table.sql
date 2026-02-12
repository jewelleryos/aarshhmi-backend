-- Migration: 034_customer_sessions_table.sql
-- Description: Create customer_sessions table for active session tracking

CREATE TABLE IF NOT EXISTS customer_sessions (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('csess'),
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    -- Token (stored for validation)
    token TEXT NOT NULL,

    -- Session Info
    login_method VARCHAR(20) NOT NULL,           -- How they logged in
    device_info JSONB DEFAULT '{}',              -- User agent, device type, etc.
    ip_address INET,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customer_sessions_customer_id ON customer_sessions(customer_id);
CREATE INDEX idx_customer_sessions_token ON customer_sessions(token);

-- Comments
COMMENT ON TABLE customer_sessions IS 'Active customer login sessions';
