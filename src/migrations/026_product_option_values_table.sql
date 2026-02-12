-- Table: product_option_values
-- Purpose: Values for each product option (Gold, Silver, Size 7, Red, etc.)
-- Each option can have multiple values

CREATE TABLE IF NOT EXISTS product_option_values (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('povl'),
    option_id TEXT NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,

    -- Value info
    value VARCHAR(200) NOT NULL,             -- "Gold", "Diamond", "Size 7", "Red"

    -- Ordering
    rank INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_value_per_option UNIQUE (option_id, value)
);

-- Indexes
CREATE INDEX idx_option_values_option ON product_option_values(option_id);
CREATE INDEX idx_option_values_rank ON product_option_values(option_id, rank);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_product_option_values
    BEFORE UPDATE ON product_option_values
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE product_option_values IS 'Values for each product option (Gold, Silver, Size 7, etc.)';
COMMENT ON COLUMN product_option_values.value IS 'The actual option value displayed to user';
COMMENT ON COLUMN product_option_values.rank IS 'Display order within option';
