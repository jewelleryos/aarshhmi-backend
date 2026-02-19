-- Storefront Filter Group Config table
-- Group-level settings for non-tag-group filter types (category, price_filter)
-- Controls visibility (is_filterable) and ordering (rank) of filter sections on storefront

CREATE TABLE IF NOT EXISTS storefront_filter_group_config (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('sfgc'),

    -- Identity
    type VARCHAR(50) NOT NULL UNIQUE,

    -- Display settings
    display_name VARCHAR(100),

    -- Configuration
    is_filterable BOOLEAN NOT NULL DEFAULT TRUE,
    rank INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_storefront_filter_group_config
    BEFORE UPDATE ON storefront_filter_group_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed data
INSERT INTO storefront_filter_group_config (type, display_name, is_filterable, rank) VALUES
    ('category', 'Category', TRUE, 1),
    ('price_filter', 'Price', TRUE, 2);
