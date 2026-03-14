-- Table: order_item_logs
-- Purpose: Audit trail — every stage change for every suborder is recorded

CREATE TABLE IF NOT EXISTS order_item_logs (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('olog'),
    order_id TEXT NOT NULL REFERENCES orders(id),
    order_item_id TEXT NOT NULL REFERENCES order_items(id),
    customer_id TEXT NOT NULL,

    -- Stage at this point
    stage INTEGER NOT NULL,
    previous_stage INTEGER,

    -- Details
    note TEXT,
    metadata JSONB,

    -- Email tracking
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,

    -- Actor
    actor_type TEXT NOT NULL,                           -- 'customer' | 'admin' | 'system'
    actor_id TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_order_item_logs_order_id ON order_item_logs(order_id);
CREATE INDEX idx_order_item_logs_order_item_id ON order_item_logs(order_item_id);
