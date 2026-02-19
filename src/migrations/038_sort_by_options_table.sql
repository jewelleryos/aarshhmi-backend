-- Sort-By Options table
-- System-seeded sort options for storefront product listing
-- Admin can toggle active/inactive, rename labels, and reorder

CREATE TABLE IF NOT EXISTS sort_by_options (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('sbo'),

    -- Unique system key (not editable by admin)
    key VARCHAR(50) UNIQUE NOT NULL,

    -- Display label (editable by admin)
    label VARCHAR(100) NOT NULL,

    -- Sort configuration (not editable by admin)
    sort_column VARCHAR(100) NOT NULL,
    sort_direction VARCHAR(4) NOT NULL,
    tiebreaker_column VARCHAR(100),
    tiebreaker_direction VARCHAR(4),

    -- Admin-managed settings
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rank INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sbo_is_active ON sort_by_options(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_sbo_rank ON sort_by_options(rank);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_sort_by_options
    BEFORE UPDATE ON sort_by_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed data
INSERT INTO sort_by_options (key, label, sort_column, sort_direction, tiebreaker_column, tiebreaker_direction, is_active, rank) VALUES
    ('newest',     'Newest First',        'p.created_at',   'DESC', 'p.id',           'DESC', TRUE,  1),
    ('price_low',  'Price: Low to High',  'p.min_price',    'ASC',  'p.name', 'ASC',  TRUE,  2),
    ('price_high', 'Price: High to Low',  'p.max_price',    'DESC', 'p.name', 'ASC',  TRUE,  3);
    -- ('name_asc',   'Name: A to Z',        'p.name', 'ASC',  'p.id',           'ASC',  TRUE,  4),
    -- ('name_desc',  'Name: Z to A',        'p.name', 'DESC', 'p.id',           'DESC', FALSE, 5),
    -- ('discount',   'Biggest Discount',    'p.discount_pct', 'DESC', 'p.min_price',    'ASC',  FALSE, 6);
