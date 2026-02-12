-- Table: users
-- Purpose: Stores admin user accounts and authentication data

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('usr'),

    -- User basic information
    email VARCHAR(255) NOT NULL UNIQUE CHECK (email = LOWER(email)),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(25),

    -- Authentication
    password TEXT NOT NULL,
    password_reset_token TEXT,
    password_reset_expires_at TIMESTAMPTZ,

    -- Login tracking and security
    last_login_at TIMESTAMPTZ,
    login_attempt_count INTEGER NOT NULL DEFAULT 0,
    last_failed_login_at TIMESTAMPTZ,
    account_locked_until TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Permissions
    permissions INTEGER[] DEFAULT '{}',

    -- Metadata (flexible key-value storage)
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_permissions ON users USING GIN (permissions);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
