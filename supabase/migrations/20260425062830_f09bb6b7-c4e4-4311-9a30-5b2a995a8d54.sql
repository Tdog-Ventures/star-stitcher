ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS render_job_id text,
  ADD COLUMN IF NOT EXISTS rendered_video_url text,
  ADD COLUMN IF NOT EXISTS render_status text;