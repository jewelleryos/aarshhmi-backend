-- Table: stone_colors
-- Purpose: Stores color options for stones within each stone group
-- Note: This is backend-managed data, no frontend/API exposed currently

CREATE TABLE IF NOT EXISTS stone_colors (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('sclr'),

    -- Reference to stone group
    stone_group_id TEXT NOT NULL REFERENCES stone_groups(id) ON DELETE CASCADE,

    -- Stone color information
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    image_alt_text VARCHAR(255),

    -- Status
    status BOOLEAN NOT NULL DEFAULT TRUE,

    -- Metadata (flexible key-value storage)
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stone_colors_stone_group_id ON stone_colors(stone_group_id);
CREATE INDEX idx_stone_colors_slug ON stone_colors(slug);
CREATE INDEX idx_stone_colors_status ON stone_colors(status) WHERE status = TRUE;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_stone_colors
    BEFORE UPDATE ON stone_colors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
