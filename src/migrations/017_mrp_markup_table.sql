-- MRP Markup Table
-- Stores markup percentages for MRP calculation
-- This table should contain exactly ONE row

CREATE TABLE mrp_markup (
  id VARCHAR(32) PRIMARY KEY DEFAULT generate_ulid('mark'),
  diamond DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  gemstone DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  pearl DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  making_charge DECIMAL(10,2) NOT NULL DEFAULT 10.00
);

-- Add comment for documentation
COMMENT ON TABLE mrp_markup IS 'Stores MRP markup percentages. Only one row should exist.';

-- Insert default row with all values set to 10.00%
INSERT INTO mrp_markup (diamond, gemstone, pearl, making_charge)
VALUES (10.00, 10.00, 10.00, 10.00);
