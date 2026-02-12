-- Table: pricing_rules
-- Purpose: Stores pricing rules with conditions and markup actions for selling price calculation

CREATE TABLE IF NOT EXISTS pricing_rules (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('prl'),

    -- Rule information
    name VARCHAR(255) NOT NULL UNIQUE,
    product_type VARCHAR(50) NOT NULL DEFAULT 'JEWELLERY_DEFAULT',

    -- Conditions and actions stored as JSONB
    conditions JSONB NOT NULL DEFAULT '[]',
    actions JSONB NOT NULL DEFAULT '{}',

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pricing_rules_product_type ON pricing_rules(product_type);
CREATE INDEX idx_pricing_rules_is_active ON pricing_rules(is_active);
CREATE INDEX idx_pricing_rules_conditions ON pricing_rules USING GIN(conditions);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_pricing_rules
    BEFORE UPDATE ON pricing_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
