-- Table: tags
-- Purpose: Individual tag values that belong to tag groups (e.g., "Diwali Collection" in "Collection" group)

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('tags'),

    -- Parent reference
    tag_group_id TEXT NOT NULL REFERENCES tag_groups(id) ON DELETE CASCADE,

    -- Basic information
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,  -- HTML description

    -- Media (single media URL for image or video)
    media_url TEXT,
    media_alt_text VARCHAR(255),

    -- SEO (read-only JSONB, not queryable)
    seo JSONB DEFAULT '{}',
    /*
    SEO structure (same as tag_groups):
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

    -- System tag reference (links to source master record when is_system_generated = TRUE)
    source_id TEXT,  -- ID of the source record (metal_color.id, gemstone_type.id, etc.)

    -- Configuration
    is_system_generated BOOLEAN NOT NULL DEFAULT FALSE,  -- System tags can't be edited by user
    is_filterable BOOLEAN NOT NULL DEFAULT TRUE,         -- Show in frontend filters
    filter_display_name VARCHAR(100),                    -- Custom display name for filters
    rank INTEGER NOT NULL DEFAULT 0,                     -- Display order within group

    -- Status (internal use)
    status BOOLEAN NOT NULL DEFAULT TRUE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique slug per group
    CONSTRAINT unique_tag_slug_per_group UNIQUE (tag_group_id, slug)
);

-- Indexes
CREATE INDEX idx_tags_group_id ON tags(tag_group_id);
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_status ON tags(status) WHERE status = TRUE;
CREATE INDEX idx_tags_system ON tags(is_system_generated);
CREATE INDEX idx_tags_source_id ON tags(source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_tags_filterable ON tags(is_filterable, rank) WHERE is_filterable = TRUE;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_tags
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
