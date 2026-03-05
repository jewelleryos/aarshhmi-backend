-- Migration: 041_wishlist_items_table.sql
-- Description: Create wishlist_items table for variant-level wishlist items

CREATE TABLE IF NOT EXISTS wishlist_items (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('wli'),

    wishlist_id TEXT NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,

    -- Product reference
    product_type VARCHAR(50) NOT NULL DEFAULT 'jewellery_default',
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,

    -- Price snapshot (in paise) at the time of adding to wishlist
    added_price INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_wishlist_items_unique ON wishlist_items(wishlist_id, product_id, variant_id);
CREATE INDEX idx_wishlist_items_wishlist ON wishlist_items(wishlist_id);
CREATE INDEX idx_wishlist_items_product_variant ON wishlist_items(product_id, variant_id);
CREATE INDEX idx_wishlist_items_created ON wishlist_items(created_at DESC);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_wishlist_items
    BEFORE UPDATE ON wishlist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE wishlist_items IS 'Variant-level wishlist items with price snapshot for drop detection';
COMMENT ON COLUMN wishlist_items.product_type IS 'Product type for future multi-type support (currently jewellery_default)';
COMMENT ON COLUMN wishlist_items.added_price IS 'Variant selling price in paise when item was wishlisted — used for price drop badge';
