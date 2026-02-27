-- Migration: 043_cart_items_table.sql
-- Description: Create cart_items table for variant-level cart items with size chart support

CREATE TABLE IF NOT EXISTS cart_items (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('crti'),

    cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,

    -- Product reference
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,

    -- Quantity
    quantity INTEGER NOT NULL DEFAULT 1,

    -- Size chart selection (NULL if product has no size chart)
    size_chart_value_id TEXT REFERENCES size_chart_values(id) ON DELETE SET NULL,

    -- Price snapshot (in paise) at the time of adding to cart
    added_price INTEGER NOT NULL DEFAULT 0,

    -- Metadata (extensible, for future fields like engraving)
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Same variant + same size = same cart item (split unique indexes for NULL handling)
CREATE UNIQUE INDEX idx_cart_items_unique ON cart_items(cart_id, variant_id, size_chart_value_id)
    WHERE size_chart_value_id IS NOT NULL;
CREATE UNIQUE INDEX idx_cart_items_unique_no_size ON cart_items(cart_id, variant_id)
    WHERE size_chart_value_id IS NULL;

-- Lookup by cart
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);

-- Lookup by product/variant (for checking if variant is in any cart)
CREATE INDEX idx_cart_items_variant ON cart_items(variant_id);

-- Ordering
CREATE INDEX idx_cart_items_created ON cart_items(created_at DESC);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_cart_items
    BEFORE UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE cart_items IS 'Cart items with variant + size chart uniqueness. Same variant + same size = same item (quantity increments).';
COMMENT ON COLUMN cart_items.size_chart_value_id IS 'NULL if product has no size chart. SET NULL on delete — reverts to default pricing on next fetch.';
COMMENT ON COLUMN cart_items.added_price IS 'Selling price in paise at add time — used for price-change indicators';
COMMENT ON COLUMN cart_items.metadata IS 'Extensible metadata for future item-level fields (e.g., engraving text)';
