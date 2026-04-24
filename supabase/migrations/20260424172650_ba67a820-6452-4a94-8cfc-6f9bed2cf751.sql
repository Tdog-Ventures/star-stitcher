ALTER TABLE public.distribution_tasks
  ADD COLUMN IF NOT EXISTS impressions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_cents integer NOT NULL DEFAULT 0;