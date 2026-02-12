-- Table: variant_option_values
-- Purpose: Junction table linking variants to their option values
-- Defines which combination of options makes up each variant

CREATE TABLE IF NOT EXISTS variant_option_values (
    variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    option_value_id TEXT NOT NULL REFERENCES product_option_values(id) ON DELETE CASCADE,

    PRIMARY KEY (variant_id, option_value_id)
);

-- Indexes
CREATE INDEX idx_vov_variant ON variant_option_values(variant_id);
CREATE INDEX idx_vov_option_value ON variant_option_values(option_value_id);

-- Comments
COMMENT ON TABLE variant_option_values IS 'Links variants to their option values';
COMMENT ON COLUMN variant_option_values.variant_id IS 'FK to product_variants';
COMMENT ON COLUMN variant_option_values.option_value_id IS 'FK to product_option_values';
