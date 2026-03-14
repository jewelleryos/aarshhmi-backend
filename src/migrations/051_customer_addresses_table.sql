-- Table: customer_addresses
-- Purpose: Customer shipping/billing addresses for checkout

CREATE TABLE IF NOT EXISTS customer_addresses (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('cadr'),
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    -- Address details
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    pincode TEXT NOT NULL,
    city_id INTEGER NOT NULL REFERENCES cities(id),
    state_id INTEGER NOT NULL REFERENCES states(id),
    address_type TEXT NOT NULL DEFAULT 'home',       -- 'home' | 'office'

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_customer_addresses
    BEFORE UPDATE ON customer_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
