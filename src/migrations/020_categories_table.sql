-- Table: categories
-- Purpose: Product categories with single-level parent-child hierarchy
-- Examples: "Ring" (parent) -> "Engagement Ring", "Wedding Ring" (children)

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('cat'),

    -- Basic information
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,  -- HTML content

    -- Hierarchy (single level only: parent -> child, no grandchildren)
    parent_category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
    mpath TEXT NOT NULL DEFAULT '',  -- Materialized path for efficient queries

    -- Media (single media URL for image or video)
    media_url TEXT,
    media_alt_text VARCHAR(255),

    -- SEO (read-only JSONB, not queryable)
    seo JSONB DEFAULT '{}',
    /*
    SEO structure:
    {
        "meta_title": "",
        "meta_keywords": "",
        "meta_description": "",
        "meta_robots": "",
        "meta_canonical": "",
        "og_title": "",
        "og_site_name": "",
        "og_description": "",
        "og_url": "",
        "og_image_url": "",
        "twitter_card_title": "",
        "twitter_card_site_name": "",
        "twitter_card_description": "",
        "twitter_url": "",
        "twitter_media": ""
    }
    */

    -- Configuration
    is_filterable BOOLEAN NOT NULL DEFAULT TRUE,   -- Show in frontend filters
    filter_display_name VARCHAR(100),              -- Custom display name for filters
    rank INTEGER NOT NULL DEFAULT 0,               -- Display order (children ranked within parent group)

    -- Status (internal use only)
    status BOOLEAN NOT NULL DEFAULT TRUE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_category_id);
CREATE INDEX idx_categories_mpath ON categories(mpath);
CREATE INDEX idx_categories_status ON categories(status) WHERE status = TRUE;
CREATE INDEX idx_categories_rank ON categories(parent_category_id, rank);
CREATE INDEX idx_categories_filterable ON categories(is_filterable, rank) WHERE is_filterable = TRUE;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_categories
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE categories IS 'Product categories with single-level parent-child hierarchy';
COMMENT ON COLUMN categories.parent_category_id IS 'NULL for root categories, parent ID for child categories';
COMMENT ON COLUMN categories.mpath IS 'Materialized path: empty for root, parent_id for children';
COMMENT ON COLUMN categories.rank IS 'Display order - children are ranked within their parent group only';
