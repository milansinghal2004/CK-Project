-- Add cancellation_fee column to orders table
ALTER TABLE orders ADD COLUMN cancellation_fee NUMERIC DEFAULT 0;
