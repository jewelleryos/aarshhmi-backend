-- Table: stone_prices
-- Purpose: Stores pricing for stones based on attributes and carat weight range
-- Note: Price is stored in smallest currency unit (paise for INR), zero allowed

CREATE TABLE IF NOT EXISTS stone_prices (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('sprc'),

    -- Stone attributes (all required except color)
    stone_group_id TEXT NOT NULL REFERENCES stone_groups(id),
    stone_type_id TEXT NOT NULL REFERENCES stone_types(id),
    stone_shape_id TEXT NOT NULL REFERENCES stone_shapes(id),
    stone_quality_id TEXT NOT NULL REFERENCES stone_qualities(id),
    stone_color_id TEXT REFERENCES stone_colors(id),

    -- Carat weight range (NUMERIC for precision, up to 4 decimal places)
    ct_from NUMERIC(10, 4) NOT NULL,
    ct_to NUMERIC(10, 4) NOT NULL,

    -- Price in smallest currency unit (paise for INR), zero allowed
    price INTEGER NOT NULL,

    -- Status (internal use only)
    status BOOLEAN NOT NULL DEFAULT TRUE,

    -- Metadata (flexible key-value storage)
    metadata JSONB NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_stone_prices_ct_range CHECK (ct_from < ct_to),
    CONSTRAINT chk_stone_prices_ct_from_positive CHECK (ct_from >= 0),
    CONSTRAINT chk_stone_prices_ct_to_positive CHECK (ct_to > 0),
    CONSTRAINT chk_stone_prices_price_non_negative CHECK (price >= 0)
);

-- Unique constraint for records WITH stone_color_id
CREATE UNIQUE INDEX idx_stone_prices_unique_with_color
ON stone_prices (stone_group_id, stone_type_id, stone_shape_id, stone_quality_id, stone_color_id, ct_from, ct_to)
WHERE stone_color_id IS NOT NULL;

-- Unique constraint for records WITHOUT stone_color_id
CREATE UNIQUE INDEX idx_stone_prices_unique_without_color
ON stone_prices (stone_group_id, stone_type_id, stone_shape_id, stone_quality_id, ct_from, ct_to)
WHERE stone_color_id IS NULL;

-- Performance indexes
CREATE INDEX idx_stone_prices_lookup
ON stone_prices (stone_group_id, stone_type_id, stone_shape_id, stone_quality_id);

CREATE INDEX idx_stone_prices_carat_range
ON stone_prices (ct_from, ct_to);

CREATE INDEX idx_stone_prices_status
ON stone_prices (status) WHERE status = TRUE;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_stone_prices
    BEFORE UPDATE ON stone_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
