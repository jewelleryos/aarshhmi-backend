-- Table: metal_types
-- Purpose: Stores master data for metal types used in jewellery products

CREATE TABLE IF NOT EXISTS metal_types (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('mtyp'),

    -- Metal type information
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
CREATE INDEX idx_metal_types_slug ON metal_types(slug);
CREATE INDEX idx_metal_types_status ON metal_types(status) WHERE status = TRUE;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_metal_types
    BEFORE UPDATE ON metal_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
