-- Table: product_tags
-- Purpose: Junction table linking products to tags (many-to-many)

CREATE TABLE IF NOT EXISTS product_tags (
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

    PRIMARY KEY (product_id, tag_id)
);

-- Indexes
CREATE INDEX idx_pt_product ON product_tags(product_id);
CREATE INDEX idx_pt_tag ON product_tags(tag_id);

-- Comments
COMMENT ON TABLE product_tags IS 'Links products to tags (many-to-many)';
