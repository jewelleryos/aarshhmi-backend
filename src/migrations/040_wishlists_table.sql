-- Migration: 040_wishlists_table.sql
-- Description: Create wishlists table for storefront wishlist feature
-- Supports both authenticated customers and guest wishlists

CREATE TABLE IF NOT EXISTS wishlists (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('wlst'),

    -- Owner: NULL for guest wishlists, customer ID for authenticated
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_wishlists_customer_id ON wishlists(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_wishlists_guest ON wishlists(created_at) WHERE customer_id IS NULL;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_wishlists
    BEFORE UPDATE ON wishlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE wishlists IS 'Customer and guest wishlists — one per authenticated user, multiple for guests';
COMMENT ON COLUMN wishlists.customer_id IS 'NULL for guest wishlists, FK to customers for authenticated';
