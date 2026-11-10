create table if not exists public.clerk_profiles (
  clerk_id text primary key,
  email text,
  name text not null default 'Shopper',
  image text,
  phone text,
  role text not null default 'buyer',
  preferred_city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clerk_profiles enable row level security;

alter table public.store_submissions
  drop constraint if exists store_submissions_owner_id_fkey;
alter table public.store_submissions
  alter column owner_id type text using owner_id::text;
alter table public.store_submissions
  drop constraint if exists store_submissions_reviewed_by_fkey;
alter table public.store_submissions
  alter column reviewed_by type text using reviewed_by::text;

drop policy if exists "read own submissions" on public.store_submissions;
create policy "read own submissions" on public.store_submissions
  for select using ((select auth.jwt()->>'sub') = owner_id);