-- Table: badges
-- Purpose: Product badges for display on product images
-- Examples: "New", "Sale", "Limited Edition", "Best Seller"

CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY DEFAULT generate_ulid('bagd'),

    -- Basic information
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,

    -- Styling
    bg_color VARCHAR(100) NOT NULL,      -- Background color (e.g., "#FF0000", "red", "rgb(255,0,0)")
    font_color VARCHAR(100) NOT NULL,    -- Font/text color

    -- Position on product image (1-6)
    position INTEGER NOT NULL,
    /*
    Position values:
    1 = top-left
    2 = top-center
    3 = top-right
    4 = bottom-left
    5 = bottom-center
    6 = bottom-right
    */

    -- Status (internal use only)
    status BOOLEAN NOT NULL DEFAULT TRUE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_badges_position CHECK (position >= 1 AND position <= 6)
);

-- Indexes
CREATE INDEX idx_badges_slug ON badges(slug);
CREATE INDEX idx_badges_status ON badges(status) WHERE status = TRUE;
CREATE INDEX idx_badges_position ON badges(position);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_badges
    BEFORE UPDATE ON badges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE badges IS 'Product badges for display on product images';
COMMENT ON COLUMN badges.position IS 'Position on product image: 1=top-left, 2=top-center, 3=top-right, 4=bottom-left, 5=bottom-center, 6=bottom-right';
COMMENT ON COLUMN badges.bg_color IS 'Background color for the badge';
COMMENT ON COLUMN badges.font_color IS 'Font/text color for the badge';
