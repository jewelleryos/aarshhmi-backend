-- Migration: 046_similar_products_tables.sql
-- Description: Create similar products tables for product-to-product similarity relationships

-- Table 1: similar_products - stores manual and system-generated product links
CREATE TABLE IF NOT EXISTS similar_products (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('sprec'),
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    similar_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    source VARCHAR(10) NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    rank INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_similar UNIQUE (product_id, similar_product_id),
    CONSTRAINT no_self_reference CHECK (product_id != similar_product_id)
);

CREATE INDEX idx_sprec_product ON similar_products(product_id);
CREATE INDEX idx_sprec_source ON similar_products(product_id, source);
CREATE INDEX idx_sprec_similar ON similar_products(similar_product_id);

-- Table 2: similar_products_scoring_config - configurable scoring weights
CREATE TABLE IF NOT EXISTS similar_products_scoring_config (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('spsc'),
    condition_key VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    weight INTEGER NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rank INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_similar_products_scoring_config
    BEFORE UPDATE ON similar_products_scoring_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default scoring conditions
INSERT INTO similar_products_scoring_config (condition_key, label, description, weight, rank) VALUES
    ('primary_category', 'Same Primary Category', 'Both products share the same primary category', 30, 1),
    ('shared_categories', 'Shared Categories', 'Number of non-primary categories in common', 15, 2),
    ('shared_tags', 'Shared Tags', 'Number of non-system tags in common', 20, 3),
    ('price_proximity', 'Price Proximity', 'Product price within +/-30% range', 20, 4),
    ('same_product_type', 'Same Product Type', 'Both products have same product type', 10, 5),
    ('shared_badges', 'Shared Badges', 'Number of badges in common', 5, 6);

-- Table 3: similar_products_sync_jobs - tracks sync job progress
CREATE TABLE IF NOT EXISTS similar_products_sync_jobs (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('spsj'),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    triggered_by TEXT REFERENCES users(id),
    total_products INTEGER NOT NULL DEFAULT 0,
    processed_products INTEGER NOT NULL DEFAULT 0,
    failed_products INTEGER NOT NULL DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spsj_status ON similar_products_sync_jobs(status);
CREATE INDEX idx_spsj_created ON similar_products_sync_jobs(created_at DESC);
