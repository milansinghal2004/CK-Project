INSERT INTO offers (id, title, description, code, discount_percent, discount_flat, min_order_value, is_new_user_only) VALUES
('off-new-001', 'Welcome Feast', 'Flat 50% off on your very first order as a new user.', 'WELCOME50', 50, NULL, 200, TRUE),
('off-gen-002', 'Weekend Party', 'Get 25% off on orders above 500.', 'FEAST25', 25, NULL, 500, FALSE),
('off-gen-003', 'Startup Delight', 'Flat Rs 100 off on gourmet bowls.', 'DELIGHT100', NULL, 100, 300, FALSE)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  discount_percent = EXCLUDED.discount_percent,
  discount_flat = EXCLUDED.discount_flat,
  min_order_value = EXCLUDED.min_order_value,
  is_new_user_only = EXCLUDED.is_new_user_only;

-- Update the existing Flat 100 off if it exists to be new user only
UPDATE offers SET is_new_user_only = TRUE WHERE code = 'CK100';
