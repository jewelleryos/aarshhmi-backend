-- Table: product_categories
-- Purpose: Junction table linking products to categories (many-to-many)

CREATE TABLE IF NOT EXISTS product_categories (
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (product_id, category_id)
);

-- Indexes
CREATE INDEX idx_pc_product ON product_categories(product_id);
CREATE INDEX idx_pc_category ON product_categories(category_id);
CREATE INDEX idx_pc_primary ON product_categories(product_id, is_primary) WHERE is_primary = TRUE;

-- Comments
COMMENT ON TABLE product_categories IS 'Links products to categories (many-to-many)';
COMMENT ON COLUMN product_categories.is_primary IS 'Primary category for the product';
