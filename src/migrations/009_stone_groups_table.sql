-- Table: stone_groups
-- Purpose: Stores master data for stone groups/categories used in jewellery products
-- Note: This is backend-managed data, no frontend/API exposed

CREATE TABLE IF NOT EXISTS stone_groups (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('sgrp'),

    -- Stone group information
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
CREATE INDEX idx_stone_groups_slug ON stone_groups(slug);
CREATE INDEX idx_stone_groups_status ON stone_groups(status) WHERE status = TRUE;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_stone_groups
    BEFORE UPDATE ON stone_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
