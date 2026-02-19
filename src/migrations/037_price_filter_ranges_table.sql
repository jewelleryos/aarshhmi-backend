-- Price Filter Ranges table
-- Admin-defined price buckets for storefront filtering (e.g., "Under 20,000", "20,000 - 50,000")
-- Prices stored in paise to match products table (100 paise = 1 rupee)

CREATE TABLE IF NOT EXISTS price_filter_ranges (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('pfr'),

    -- Display
    display_name VARCHAR(100) NOT NULL,

    -- Price range (stored in paise)
    min_price INTEGER NOT NULL,
    max_price INTEGER NOT NULL,

    -- Filter display settings
    media_url TEXT,
    media_alt_text VARCHAR(255),
    rank INTEGER NOT NULL DEFAULT 0,

    -- Status
    status BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pfr_status ON price_filter_ranges(status) WHERE status = TRUE;
CREATE INDEX idx_pfr_rank ON price_filter_ranges(rank);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_price_filter_ranges
    BEFORE UPDATE ON price_filter_ranges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
