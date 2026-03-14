-- Table: sequence_counters
-- Purpose: Gap-free sequential numbers for invoices, receipts, credit notes (GST compliance)

CREATE TABLE IF NOT EXISTS sequence_counters (
    counter_key TEXT PRIMARY KEY,                  -- e.g., 'invoice_2526'
    counter_type TEXT NOT NULL,                     -- 'invoice' | 'receipt' | 'credit_note'
    fiscal_year TEXT NOT NULL,                      -- e.g., '2526' for FY 2025-26
    current_value INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_sequence_counters
    BEFORE UPDATE ON sequence_counters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function: get_next_gap_free_number
-- Atomic upsert + increment, gap-free within fiscal year
CREATE OR REPLACE FUNCTION get_next_gap_free_number(
    p_counter_type TEXT,
    p_prefix TEXT,
    p_fiscal_year TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_fiscal_year TEXT;
    v_counter INTEGER;
    v_key TEXT;
    v_type_prefix TEXT;
BEGIN
    -- Calculate fiscal year (April to March in India)
    IF p_fiscal_year IS NULL THEN
        IF EXTRACT(MONTH FROM NOW()) >= 4 THEN
            v_fiscal_year := SUBSTRING(EXTRACT(YEAR FROM NOW())::TEXT FROM 3) ||
                             SUBSTRING((EXTRACT(YEAR FROM NOW()) + 1)::TEXT FROM 3);
        ELSE
            v_fiscal_year := SUBSTRING((EXTRACT(YEAR FROM NOW()) - 1)::TEXT FROM 3) ||
                             SUBSTRING(EXTRACT(YEAR FROM NOW())::TEXT FROM 3);
        END IF;
    ELSE
        v_fiscal_year := p_fiscal_year;
    END IF;

    v_key := p_counter_type || '_' || v_fiscal_year;

    -- Atomic upsert + increment
    INSERT INTO sequence_counters (counter_key, counter_type, fiscal_year, current_value)
    VALUES (v_key, p_counter_type, v_fiscal_year, 1)
    ON CONFLICT (counter_key)
    DO UPDATE SET current_value = sequence_counters.current_value + 1,
                  updated_at = NOW()
    RETURNING current_value INTO v_counter;

    -- Build formatted number
    IF p_counter_type = 'invoice' THEN
        v_type_prefix := 'INV';
    ELSIF p_counter_type = 'credit_note' THEN
        v_type_prefix := 'CN';
    ELSIF p_counter_type = 'receipt' THEN
        v_type_prefix := 'RCT';
    END IF;

    RETURN v_type_prefix || '-' || p_prefix || '-' || v_fiscal_year || '-' || LPAD(v_counter::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
