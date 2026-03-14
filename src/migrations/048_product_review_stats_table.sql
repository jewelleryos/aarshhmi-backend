-- Table: product_review_stats
-- Purpose: Pre-computed review statistics per product for fast storefront reads

CREATE TABLE IF NOT EXISTS product_review_stats (
    product_id TEXT PRIMARY KEY REFERENCES products(id),

    -- Aggregated stats (only from approved + active reviews)
    average_rating DECIMAL(2,1) NOT NULL DEFAULT 0,
    total_reviews INTEGER NOT NULL DEFAULT 0,
    rating_1 INTEGER NOT NULL DEFAULT 0,
    rating_2 INTEGER NOT NULL DEFAULT 0,
    rating_3 INTEGER NOT NULL DEFAULT 0,
    rating_4 INTEGER NOT NULL DEFAULT 0,
    rating_5 INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_product_review_stats
    BEFORE UPDATE ON product_review_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
