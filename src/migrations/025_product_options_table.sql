-- Table: product_options
-- Purpose: Option definitions per product (Metal Type, Color, Size, Stone Type, etc.)
-- Each product can have multiple options, each option has multiple values

CREATE TABLE IF NOT EXISTS product_options (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('popt'),
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Option info
    name VARCHAR(100) NOT NULL,              -- "Metal Type", "Color", "Size", "Stone Type"

    -- Ordering
    rank INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_option_per_product UNIQUE (product_id, name)
);

-- Indexes
CREATE INDEX idx_product_options_product ON product_options(product_id);
CREATE INDEX idx_product_options_rank ON product_options(product_id, rank);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_product_options
    BEFORE UPDATE ON product_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE product_options IS 'Option definitions per product (Metal Type, Size, Color, etc.)';
COMMENT ON COLUMN product_options.name IS 'Option name like Metal Type, Color, Size, Stone Type';
COMMENT ON COLUMN product_options.rank IS 'Display order within product';
