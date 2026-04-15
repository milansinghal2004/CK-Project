BEGIN;

CREATE TABLE IF NOT EXISTS chefs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  station TEXT NOT NULL,
  is_on_duty BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_assignments (
  order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  chef_id TEXT NOT NULL REFERENCES chefs(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chefs_on_duty ON chefs(is_on_duty, is_active);
CREATE INDEX IF NOT EXISTS idx_assignments_chef ON order_assignments(chef_id);

COMMIT;
