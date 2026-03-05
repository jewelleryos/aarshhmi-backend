-- Migration: 044_coupons_table.sql
-- Description: Create coupons table for coupon management

CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('cpn'),

    -- Coupon identity
    code VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    -- Types: cart_flat, cart_percentage, first_purchase, product_flat,
    --        product_percentage, customer_specific, making_charge_discount,
    --        diamond_discount, gemstone_discount

    -- Discount fields (usage depends on type)
    discount_type VARCHAR(20),                  -- 'flat' or 'percentage' (for first_purchase, customer_specific)
    discount_value INTEGER,                     -- Fixed amount in paise (for flat types)
    discount_percent NUMERIC(5,2),              -- Percentage (for percentage types)
    max_discount INTEGER,                       -- Max cap in paise (for percentage types)
    max_discount_per_product INTEGER,           -- Per-product cap (for product_percentage)

    -- Targeting
    applicable_product_ids TEXT[],              -- For product_flat, product_percentage
    assigned_customer_emails TEXT[],            -- For customer_specific

    -- Conditions (AND logic)
    conditions JSONB DEFAULT '[]',

    -- Constraints
    min_cart_value INTEGER,                     -- Minimum cart subtotal in paise
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    usage_limit INTEGER,                        -- NULL = unlimited
    usage_count INTEGER DEFAULT 0,              -- Current total usage

    -- Flags
    is_active BOOLEAN DEFAULT true,
    guest_allowed BOOLEAN DEFAULT true,
    show_on_storefront BOOLEAN DEFAULT true,

    -- Display
    description TEXT,                           -- Admin-facing
    display_text TEXT,                          -- Customer-facing

    -- Metadata (extensible JSON — terms_and_conditions HTML, etc.)
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique coupon codes (case-insensitive)
CREATE UNIQUE INDEX idx_coupons_code ON coupons(UPPER(code));

-- Lookup indexes
CREATE INDEX idx_coupons_type ON coupons(type);
CREATE INDEX idx_coupons_active ON coupons(is_active) WHERE is_active = true;
CREATE INDEX idx_coupons_valid ON coupons(valid_from, valid_until);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_coupons
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE coupons IS 'Coupon definitions with type-specific fields. One of 9 fixed types.';
COMMENT ON COLUMN coupons.type IS 'One of: cart_flat, cart_percentage, first_purchase, product_flat, product_percentage, customer_specific, making_charge_discount, diamond_discount, gemstone_discount';
COMMENT ON COLUMN coupons.conditions IS 'Array of condition objects with AND logic. Structure: [{field, operator, value}]';
COMMENT ON COLUMN coupons.usage_count IS 'Incremented when order completes, not when coupon is applied to cart';
