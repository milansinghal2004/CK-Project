BEGIN;

INSERT INTO chefs (id, name, station, is_on_duty, is_active)
VALUES
('chef-001', 'Ankit Verma', 'Hot Kitchen', TRUE, TRUE),
('chef-002', 'Riya Shah', 'Tandoor & Grill', TRUE, TRUE),
('chef-003', 'Farhan Ali', 'Snacks & Fry', TRUE, TRUE),
('chef-004', 'Mansi Rao', 'Plating & QA', FALSE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  station = EXCLUDED.station,
  is_on_duty = EXCLUDED.is_on_duty,
  is_active = EXCLUDED.is_active,
  last_seen = NOW();

COMMIT;
