-- Table: metal_colors
-- Purpose: Stores global colors for jewellery products (shared across all metal types)

CREATE TABLE IF NOT EXISTS metal_colors (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('mclr'),

    -- Metal color information
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
CREATE INDEX idx_metal_colors_slug ON metal_colors(slug);
CREATE INDEX idx_metal_colors_status ON metal_colors(status) WHERE status = TRUE;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_metal_colors
    BEFORE UPDATE ON metal_colors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
