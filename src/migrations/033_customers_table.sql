-- Migration: 033_customers_table.sql
-- Description: Create customers table for storefront customer accounts

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('cust'),

    -- Contact Information (at least one required)
    email VARCHAR(255) UNIQUE CHECK (email = LOWER(email)),
    phone VARCHAR(20) UNIQUE,                    -- Stored with country code: 919876543210

    -- Profile Information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_picture TEXT,                        -- URL from social provider or uploaded
    birth_date TIMESTAMPTZ,                      -- Customer's birth date
    anniversary_date TIMESTAMPTZ,                -- Customer's anniversary date

    -- Authentication
    password TEXT,                               -- NULL for social-only accounts

    -- Password Reset
    password_reset_token TEXT,
    password_reset_expires_at TIMESTAMPTZ,

    -- Social Auth Identifiers
    google_id VARCHAR(255) UNIQUE,               -- Google OAuth sub claim
    facebook_id VARCHAR(255) UNIQUE,             -- Facebook user ID

    -- Account Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Login Tracking
    last_login_at TIMESTAMPTZ,
    last_login_method VARCHAR(20),               -- 'sms', 'whatsapp', 'google', 'facebook'

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT customers_contact_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_google_id ON customers(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX idx_customers_facebook_id ON customers(facebook_id) WHERE facebook_id IS NOT NULL;
CREATE INDEX idx_customers_is_active ON customers(is_active) WHERE is_active = true;
CREATE INDEX idx_customers_created_at ON customers(created_at DESC);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_customers
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE customers IS 'Storefront customer accounts';
COMMENT ON COLUMN customers.phone IS 'Phone with country code, e.g., 919876543210';
COMMENT ON COLUMN customers.password IS 'NULL for social-only accounts (Google/Facebook)';
COMMENT ON COLUMN customers.last_login_method IS 'sms, whatsapp, google, facebook';
