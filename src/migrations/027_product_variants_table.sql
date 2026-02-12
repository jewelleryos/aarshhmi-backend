-- Table: product_variants
-- Purpose: Product variations with pricing, inventory, and physical attributes
-- Each variant is a unique combination of option values

CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('pvar'),
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Identity
    sku VARCHAR(200) NOT NULL UNIQUE,
    variant_name VARCHAR(500),               -- "Gold - 18K - Diamond - Size 7"

    -- Pricing (all in paise - smallest currency unit)
    price INTEGER NOT NULL DEFAULT 0,        -- Selling price / MRP
    compare_at_price INTEGER,                -- Original price (for showing discounts)
    cost_price INTEGER,                      -- Cost for profit calculation

    -- Price breakdown (populated by price calculator)
    price_components JSONB DEFAULT '{}',
    /*
    Example for jewelry:
    {
        "metal_value": 2500000,
        "stone_value": 1500000,
        "making_charge": 300000,
        "other_charges": 50000,
        "total": 4350000,
        "calculated_at": "2025-01-26T10:00:00Z"
    }
    */

    -- Inventory
    stock_quantity INTEGER NOT NULL DEFAULT 0,

    -- Status
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE UNIQUE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_price ON product_variants(price);
CREATE INDEX idx_variants_available ON product_variants(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_variants_default ON product_variants(product_id, is_default) WHERE is_default = TRUE;
CREATE INDEX idx_variants_stock ON product_variants(stock_quantity);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_product_variants
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add FK from products.default_variant_id to product_variants.id
ALTER TABLE products
    ADD CONSTRAINT fk_products_default_variant
    FOREIGN KEY (default_variant_id)
    REFERENCES product_variants(id)
    ON DELETE SET NULL;

-- Comments
COMMENT ON TABLE product_variants IS 'Product variations with pricing and inventory';
COMMENT ON COLUMN product_variants.sku IS 'Unique stock keeping unit';
COMMENT ON COLUMN product_variants.price IS 'Selling price in paise';
COMMENT ON COLUMN product_variants.compare_at_price IS 'Original price for showing discounts';
COMMENT ON COLUMN product_variants.cost_price IS 'Cost price for profit calculation';
COMMENT ON COLUMN product_variants.price_components IS 'Price breakdown (metal, stone, making charge, etc.)';
COMMENT ON COLUMN product_variants.is_available IS 'Disable variant without deleting';
COMMENT ON COLUMN product_variants.is_default IS 'Default variant shown on product listing';
