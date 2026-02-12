-- Table: size_chart_values
-- Purpose: Individual size values with difference adjustments
-- Examples: "11", "12", "13", "14" for ring sizes with their price/weight differences

CREATE TABLE IF NOT EXISTS size_chart_values (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('scvl'),

    -- Reference to parent group
    size_chart_group_id TEXT NOT NULL REFERENCES size_chart_groups(id) ON DELETE RESTRICT,

    -- Basic information
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),

    -- Difference value (can be negative, e.g., -0.07, 0.0007, 0.014)
    difference DECIMAL(10,4) NOT NULL DEFAULT 0,

    -- Default flag (only one per group)
    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_size_chart_values_group ON size_chart_values(size_chart_group_id);
CREATE INDEX idx_size_chart_values_is_default ON size_chart_values(is_default) WHERE is_default = TRUE;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_size_chart_values
    BEFORE UPDATE ON size_chart_values
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE size_chart_values IS 'Individual size values with difference adjustments';
COMMENT ON COLUMN size_chart_values.difference IS 'Price/weight adjustment value, can be negative (e.g., -0.07, 0.0007, 0.014)';
COMMENT ON COLUMN size_chart_values.is_default IS 'Only one value per group can be default';
