-- CMS Sections Table
CREATE TABLE cms_sections (
  id TEXT PRIMARY KEY DEFAULT generate_ulid('csec'),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for slug lookup
CREATE INDEX idx_cms_sections_slug ON cms_sections(slug);

-- Trigger for updated_at
CREATE TRIGGER update_cms_sections_updated_at
  BEFORE UPDATE ON cms_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
