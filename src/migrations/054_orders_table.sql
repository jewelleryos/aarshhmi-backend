-- Table: orders
-- Purpose: Parent order record — one order per checkout

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('ord'),
    order_number TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL REFERENCES customers(id),

    -- Amounts (all in paise, matching cart system)
    subtotal INTEGER NOT NULL DEFAULT 0,               -- Sum of all item lineTotals before coupon
    tax_amount INTEGER NOT NULL DEFAULT 0,             -- Total tax across all items
    coupon_discount INTEGER NOT NULL DEFAULT 0,        -- Total coupon discount
    total_amount INTEGER NOT NULL DEFAULT 0,           -- subtotal - coupon_discount (final charged amount)

    -- Coupon reference
    coupon_id TEXT,
    coupon_code TEXT,
    coupon_type TEXT,

    -- Quantity
    total_quantity INTEGER NOT NULL DEFAULT 0,

    -- Stage
    stage INTEGER NOT NULL DEFAULT 1,

    -- Addresses (snapshot at order time)
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,

    -- Payment
    payment_gateway TEXT NOT NULL DEFAULT 'razorpay',
    payment_gateway_order_id TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending',     -- pending | captured | failed

    -- Documents
    receipt_number TEXT,
    receipt_url TEXT,

    -- Notes
    admin_notes TEXT,

    -- Cancellation window
    cancellation_window_ends_at TIMESTAMPTZ,

    -- Metadata (flexible extra data)
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_stage ON orders(stage);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_orders
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
