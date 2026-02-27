-- Migration: 042_carts_table.sql
-- Description: Create carts table for storefront cart feature
-- Supports both authenticated customers and guest carts

CREATE TABLE IF NOT EXISTS carts (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('crt'),

    -- Owner: NULL for guest carts, customer ID for authenticated
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,

    -- Applied coupon (future — for coupon module)
    applied_coupon_id TEXT,

    -- Metadata (extensible, for future fields)
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One cart per authenticated customer
CREATE UNIQUE INDEX idx_carts_customer_id ON carts(customer_id) WHERE customer_id IS NOT NULL;

-- Guest cart cleanup by age
CREATE INDEX idx_carts_guest_cleanup ON carts(created_at) WHERE customer_id IS NULL;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_carts
    BEFORE UPDATE ON carts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE carts IS 'Customer and guest carts — one per authenticated user, ID stored in localStorage for guests';
COMMENT ON COLUMN carts.customer_id IS 'NULL for guest carts, FK to customers for authenticated';
COMMENT ON COLUMN carts.applied_coupon_id IS 'Currently applied coupon ID — will become FK when coupon table is created';
COMMENT ON COLUMN carts.metadata IS 'Extensible metadata for future cart-level fields';
