create extension if not exists pgcrypto;

create table if not exists public.job_queue (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in ('strategy', 'production', 'distribution', 'feedback')),
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  error_message text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_job_queue_created_at_desc on public.job_queue (created_at desc);
create index if not exists idx_job_queue_status_created_at on public.job_queue (status, created_at asc);

alter table public.job_queue enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_queue'
      and policyname = 'job_queue_authenticated_read'
  ) then
    create policy job_queue_authenticated_read
      on public.job_queue
      for select
      to authenticated
      using (true);
  end if;
end $$;
