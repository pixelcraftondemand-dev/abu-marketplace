-- Store submissions awaiting admin review.
-- Safe to run more than once.
create table if not exists public.store_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  owner_email text not null,
  owner_name text,
  name text not null,
  slug text not null,
  tagline text,
  description text,
  location_hub text,
  province text,
  street_address text,
  phone text not null,
  payout_provider text,
  payout_phone text,
  logo text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  -- Set when the submission is rejected; lets the same store try again later.
  created_store_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_submissions_status_idx on public.store_submissions (status, created_at desc);
create index if not exists store_submissions_owner_idx on public.store_submissions (owner_id);

alter table public.store_submissions enable row level security;

-- Owners can read their own submissions so the UI can show "pending review".
drop policy if exists "read own submissions" on public.store_submissions;
create policy "read own submissions" on public.store_submissions
  for select using (auth.uid() = owner_id);

-- Deliberately no insert/update policy: the server writes with the secret key,
-- so a client cannot approve its own store or rewrite its status.
