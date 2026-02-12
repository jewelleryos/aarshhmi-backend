-- Table: tag_groups
-- Purpose: Groups for organizing product tags (Collections, Occasions, Zodiac, etc.)

CREATE TABLE IF NOT EXISTS tag_groups (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('tagg'),

    -- Basic information
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,  -- HTML description

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
    is_system_generated BOOLEAN NOT NULL DEFAULT FALSE,  -- System groups can't be edited by user
    is_filterable BOOLEAN NOT NULL DEFAULT TRUE,         -- Show in frontend filters
    filter_display_name VARCHAR(100),                    -- Custom display name for filters
    rank INTEGER NOT NULL DEFAULT 0,                     -- Display order

    -- Status (internal use)
    status BOOLEAN NOT NULL DEFAULT TRUE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tag_groups_slug ON tag_groups(slug);
CREATE INDEX idx_tag_groups_status ON tag_groups(status) WHERE status = TRUE;
CREATE INDEX idx_tag_groups_system ON tag_groups(is_system_generated);
CREATE INDEX idx_tag_groups_filterable ON tag_groups(is_filterable, rank) WHERE is_filterable = TRUE;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_tag_groups
    BEFORE UPDATE ON tag_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
