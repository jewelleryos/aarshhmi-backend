-- Table: payment_transactions
-- Purpose: Record every payment attempt and refund for audit and reconciliation

CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('ptxn'),
    order_id TEXT NOT NULL REFERENCES orders(id),
    order_item_id TEXT,                                 -- NULL for order-level payment, set for item-level refund

    -- Gateway info
    gateway_name TEXT NOT NULL,
    gateway_transaction_id TEXT,
    gateway_order_id TEXT,

    -- Transaction details
    type TEXT NOT NULL,                                 -- 'payment' | 'refund' | 'partial_refund'
    amount INTEGER NOT NULL,                            -- In paise
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL,                               -- 'pending' | 'captured' | 'failed' | 'refunded'

    -- Gateway response (full JSON for debugging)
    gateway_response JSONB,

    -- Refund-specific
    refund_reason TEXT,
    parent_transaction_id TEXT,

    -- Metadata
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(order_id);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_payment_transactions
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
