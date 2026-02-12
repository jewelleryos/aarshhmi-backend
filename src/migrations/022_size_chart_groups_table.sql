-- Table: size_chart_groups
-- Purpose: Parent table for grouping size chart values
-- Examples: "Ring Size", "Bangle Size", "Pendant Size"

CREATE TABLE IF NOT EXISTS size_chart_groups (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('scgp'),

    -- Basic information
    name VARCHAR(100) NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_size_chart_groups_name ON size_chart_groups(name);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_size_chart_groups
    BEFORE UPDATE ON size_chart_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE size_chart_groups IS 'Parent table for grouping size chart values';
