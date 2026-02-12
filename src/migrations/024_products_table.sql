-- Table: products
-- Purpose: Main product catalog - base product information
-- Product types are config-based (JEWELLERY_DEFAULT, etc.)

-- Enum: Product status
CREATE TYPE product_status AS ENUM ('draft', 'inactive', 'active', 'archived');

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('prod'),

    -- Basic Information
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    short_description TEXT,
    description TEXT,                        -- Full HTML description

    -- Classification (from config file - JEWELLERY_DEFAULT, etc.)
    product_type VARCHAR(50) NOT NULL,

    -- SKU (base SKU for the product)
    base_sku VARCHAR(100),
    style_sku VARCHAR(100),

    -- Media (thumbnail for listings)
    -- thumbnail_url TEXT,

    -- Pricing (computed from variants - stored in paise)
    min_price INTEGER,
    max_price INTEGER,

    -- Variant Management
    variant_count INTEGER NOT NULL DEFAULT 0,
    default_variant_id TEXT,                 -- FK added after variants table created

    -- Status
    status product_status NOT NULL DEFAULT 'draft',

    -- SEO
    seo JSONB DEFAULT '{}',
    /*
    SEO structure:
    {
        "meta_title": "",
        "meta_keywords": "",
        "meta_description": "",
        "meta_robots": "",
        "meta_canonical": "",
        "og_title": "",
        "og_site_name": "",
        "og_description": "",
        "og_url": "",
        "og_image_url": "",
        "twitter_card_title": "",
        "twitter_card_site_name": "",
        "twitter_card_description": "",
        "twitter_url": "",
        "twitter_media": ""
    }
    */

    -- Metadata (any extra product-level data)
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_active ON products(status) WHERE status = 'active';
CREATE INDEX idx_products_price_range ON products(min_price, max_price);
CREATE INDEX idx_products_created ON products(created_at DESC);
CREATE INDEX idx_products_base_sku ON products(base_sku) WHERE base_sku IS NOT NULL;

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_products
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TYPE product_status IS 'Product status: draft (incomplete), inactive (hidden), active (live), archived (retired)';
COMMENT ON TABLE products IS 'Main product catalog with base product information';
COMMENT ON COLUMN products.product_type IS 'Product type code from config (JEWELLERY_DEFAULT, etc.)';
COMMENT ON COLUMN products.min_price IS 'Minimum variant price in paise (computed)';
COMMENT ON COLUMN products.max_price IS 'Maximum variant price in paise (computed)';
COMMENT ON COLUMN products.default_variant_id IS 'FK to product_variants - constraint added after variants table';
COMMENT ON COLUMN products.status IS 'draft = incomplete, inactive = ready but hidden, active = live, archived = retired';
