-- Other Charges table for miscellaneous charges (packaging, hallmark, certificate, etc.)
CREATE TABLE IF NOT EXISTS other_charges (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('ochr'),
    name TEXT NOT NULL,
    description TEXT,
    amount INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_other_charges_amount_positive CHECK (amount >= 0)
);

-- Unique constraint on name (case-insensitive) for active records
CREATE UNIQUE INDEX idx_other_charges_name_lower ON other_charges (LOWER(name)) WHERE status = true;

-- Index for listing active records
CREATE INDEX idx_other_charges_status ON other_charges (status);

-- Trigger for updated_at
CREATE TRIGGER update_other_charges_updated_at
    BEFORE UPDATE ON other_charges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
