-- Table: metal_purities
-- Purpose: Stores purity levels for metal types used in jewellery products
-- Note: price is stored in smallest currency unit (paise/cents)

CREATE TABLE IF NOT EXISTS metal_purities (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('mpur'),

    -- Reference to metal type
    metal_type_id TEXT NOT NULL REFERENCES metal_types(id) ON DELETE CASCADE,

    -- Metal purity information
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    image_alt_text VARCHAR(255),

    -- Price per gram in smallest unit (paise/cents)
    price INTEGER NOT NULL,

    -- Status
    status BOOLEAN NOT NULL DEFAULT TRUE,

    -- Metadata (flexible key-value storage)
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_metal_purities_metal_type_id ON metal_purities(metal_type_id);
CREATE INDEX idx_metal_purities_slug ON metal_purities(slug);
CREATE INDEX idx_metal_purities_status ON metal_purities(status) WHERE status = TRUE;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_metal_purities
    BEFORE UPDATE ON metal_purities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
