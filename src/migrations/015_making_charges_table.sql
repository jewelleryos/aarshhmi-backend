-- Table: making_charges
-- Purpose: Stores making charges for metal types based on weight ranges
-- Note: amount is stored as-is (no conversion)
--       For fixed pricing: amount is per gram price (e.g., 1000.00)
--       For percentage: amount is percentage value (e.g., 10.50 for 10.5%, max 100)

CREATE TABLE IF NOT EXISTS making_charges (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('mmkc'),

    -- Reference to metal type
    metal_type_id TEXT NOT NULL REFERENCES metal_types(id) ON DELETE CASCADE,

    -- Weight range in grams (using quoted identifiers as "from" and "to" are reserved words)
    "from" DECIMAL(10,4) NOT NULL,
    "to" DECIMAL(10,4) NOT NULL,

    -- Pricing type and amount
    is_fixed_pricing BOOLEAN NOT NULL DEFAULT TRUE,
    amount DECIMAL(10,2) NOT NULL,

    -- Flexible metadata storage
    metadata JSONB DEFAULT '{}',

    -- Status (internal use only)
    status BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_making_charges_weight_range CHECK ("from" < "to"),
    CONSTRAINT chk_making_charges_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_making_charges_percentage_limit CHECK (is_fixed_pricing = true OR amount <= 100)
);

-- Indexes
CREATE INDEX idx_making_charges_metal_type_id ON making_charges(metal_type_id);
CREATE INDEX idx_making_charges_status ON making_charges(status) WHERE status = TRUE;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_making_charges
    BEFORE UPDATE ON making_charges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
