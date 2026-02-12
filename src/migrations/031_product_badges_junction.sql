-- Table: product_badges
-- Purpose: Junction table linking products to badges (many-to-many)

CREATE TABLE IF NOT EXISTS product_badges (
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,

    PRIMARY KEY (product_id, badge_id)
);

-- Indexes
CREATE INDEX idx_pb_product ON product_badges(product_id);
CREATE INDEX idx_pb_badge ON product_badges(badge_id);

-- Comments
COMMENT ON TABLE product_badges IS 'Links products to badges (many-to-many)';
