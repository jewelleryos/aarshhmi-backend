-- Table: order_items (Suborders)
-- Purpose: Individual product within an order, each with independent stage lifecycle

CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('sord'),
    suborder_number TEXT NOT NULL UNIQUE,
    order_id TEXT NOT NULL REFERENCES orders(id),
    customer_id TEXT NOT NULL,

    -- Product reference
    product_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,

    -- Product snapshot (complete product data frozen at order time)
    -- Contains: name, sku, slug, images, variant options, metal details,
    --   stone details, size chart, pricing components, option configs, badges
    product_snapshot JSONB NOT NULL,

    -- Pricing snapshot (all in paise, from cart at order time)
    metal_price INTEGER NOT NULL DEFAULT 0,
    making_charge INTEGER NOT NULL DEFAULT 0,
    diamond_price INTEGER NOT NULL DEFAULT 0,
    gemstone_price INTEGER NOT NULL DEFAULT 0,
    pearl_price INTEGER NOT NULL DEFAULT 0,
    price_without_tax INTEGER NOT NULL DEFAULT 0,
    tax_amount INTEGER NOT NULL DEFAULT 0,
    unit_price INTEGER NOT NULL DEFAULT 0,             -- Final per-unit price (with tax if included)
    coupon_discount INTEGER NOT NULL DEFAULT 0,        -- Per-item coupon discount
    line_total INTEGER NOT NULL DEFAULT 0,             -- unit_price * quantity
    paid_amount INTEGER NOT NULL DEFAULT 0,            -- line_total - coupon_discount

    -- Quantity
    quantity INTEGER NOT NULL DEFAULT 1,

    -- Stage (independent per suborder)
    stage INTEGER NOT NULL DEFAULT 1,
    previous_stage INTEGER,

    -- Flags
    is_cancellable BOOLEAN NOT NULL DEFAULT FALSE,
    is_returnable BOOLEAN NOT NULL DEFAULT FALSE,
    is_cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
    is_return_requested BOOLEAN NOT NULL DEFAULT FALSE,

    -- Cancellation
    cancel_reason TEXT,

    -- Return
    return_reason TEXT,

    -- Shipping
    tracking_id TEXT,
    courier_name TEXT,

    -- Metal Weight Verification
    quoted_metal_weight DECIMAL(10,4),
    actual_metal_weight DECIMAL(10,4),
    weight_difference DECIMAL(10,4),
    metal_rate_per_gram INTEGER,                       -- In paise
    weight_adjustment_amount INTEGER DEFAULT 0,
    weight_adjustment_type TEXT DEFAULT 'none',         -- 'refund' | 'complimentary' | 'none'

    -- Certification
    certification_number TEXT,

    -- Documents
    order_sheet_url TEXT,
    invoice_number TEXT,
    invoice_url TEXT,
    credit_note_number TEXT,
    credit_note_url TEXT,

    -- Refund
    refund_amount INTEGER DEFAULT 0,
    refund_note TEXT,
    refund_reference_id TEXT,
    refund_processed_at TIMESTAMPTZ,
    refund_processed_by TEXT,

    -- Delivery tracking
    delivered_at TIMESTAMPTZ,
    return_window_ends_at TIMESTAMPTZ,

    -- Metadata (flexible extra data)
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_customer_id ON order_items(customer_id);
CREATE INDEX idx_order_items_stage ON order_items(stage);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_order_items
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
