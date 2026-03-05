-- Migration: 045_carts_add_coupon_fk.sql
-- Description: Add foreign key constraint on carts.applied_coupon_id → coupons.id

ALTER TABLE carts
  ADD CONSTRAINT fk_carts_coupon
  FOREIGN KEY (applied_coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;

COMMENT ON COLUMN carts.applied_coupon_id IS 'Currently applied coupon — FK to coupons.id, SET NULL on coupon delete';
