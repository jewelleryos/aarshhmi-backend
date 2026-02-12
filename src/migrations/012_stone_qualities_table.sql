-- Table: stone_qualities
-- Purpose: Stores quality grades/levels for stones within each stone group
-- Note: This is backend-managed data, no frontend/API exposed currently

CREATE TABLE IF NOT EXISTS stone_qualities (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('sqty'),

    -- Reference to stone group
    stone_group_id TEXT NOT NULL REFERENCES stone_groups(id) ON DELETE CASCADE,

    -- Stone quality information
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
CREATE INDEX idx_stone_qualities_stone_group_id ON stone_qualities(stone_group_id);
CREATE INDEX idx_stone_qualities_slug ON stone_qualities(slug);
CREATE INDEX idx_stone_qualities_status ON stone_qualities(status) WHERE status = TRUE;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_stone_qualities
    BEFORE UPDATE ON stone_qualities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
