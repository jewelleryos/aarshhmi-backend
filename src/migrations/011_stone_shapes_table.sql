-- Table: stone_shapes
-- Purpose: Stores shapes for diamonds/stones used in jewellery products
-- Note: This is master data managed via admin panel

CREATE TABLE IF NOT EXISTS stone_shapes (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('sshp'),

    -- Stone shape information
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
CREATE INDEX idx_stone_shapes_slug ON stone_shapes(slug);
CREATE INDEX idx_stone_shapes_status ON stone_shapes(status) WHERE status = TRUE;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_stone_shapes
    BEFORE UPDATE ON stone_shapes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
