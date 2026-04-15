BEGIN;

CREATE TABLE IF NOT EXISTS order_item_assignments (
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  chef_id TEXT NOT NULL REFERENCES chefs(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (order_id, item_id),
  CONSTRAINT fk_order_item_assignments_item
    FOREIGN KEY (order_id, item_id)
    REFERENCES order_items(order_id, item_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_assignments_chef ON order_item_assignments(chef_id);

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS manager_reply TEXT,
  ADD COLUMN IF NOT EXISTS manager_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manager_reply_by TEXT;

CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id BIGSERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('customer', 'admin')),
  author_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket ON support_ticket_replies(ticket_id, created_at);

COMMIT;
