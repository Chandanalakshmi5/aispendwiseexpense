/*
# Create expenses and budgets tables (single-tenant, no auth)

1. New Tables
- `expenses`
  - `id` (uuid, primary key)
  - `amount` (numeric, not null) — amount spent in INR
  - `category` (text, not null) — e.g. Food, Transport, Shopping, etc.
  - `description` (text) — optional note about the expense
  - `date` (date, not null) — the date the expense occurred
  - `is_unusual` (boolean, default false) — flagged by anomaly detection
  - `created_at` (timestamptz, default now())
- `budgets`
  - `id` (uuid, primary key)
  - `category` (text, not null) — the spending category
  - `monthly_limit` (numeric, not null) — monthly budget cap in INR
  - `created_at` (timestamptz, default now())
2. Security
- Enable RLS on both tables.
- Grant CRUD to anon + authenticated (no-auth single-tenant app).
- Policies allow all CRUD for anon + authenticated since data is intentionally shared.
3. Notes
- Single-tenant app: no user_id, no auth.
- Indexes on expenses(date) and expenses(category) for common query patterns.
*/

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL CHECK (amount >= 0),
  category text NOT NULL,
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  is_unusual boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  monthly_limit numeric NOT NULL CHECK (monthly_limit >= 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE (category)
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date_category ON expenses(date, category);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_expenses" ON expenses;
CREATE POLICY "anon_select_expenses" ON expenses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_expenses" ON expenses;
CREATE POLICY "anon_insert_expenses" ON expenses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_expenses" ON expenses;
CREATE POLICY "anon_update_expenses" ON expenses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_expenses" ON expenses;
CREATE POLICY "anon_delete_expenses" ON expenses FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_budgets" ON budgets;
CREATE POLICY "anon_select_budgets" ON budgets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_budgets" ON budgets;
CREATE POLICY "anon_insert_budgets" ON budgets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_budgets" ON budgets;
CREATE POLICY "anon_update_budgets" ON budgets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_budgets" ON budgets;
CREATE POLICY "anon_delete_budgets" ON budgets FOR DELETE
  TO anon, authenticated USING (true);
