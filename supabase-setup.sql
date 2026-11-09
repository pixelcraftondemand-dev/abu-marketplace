-- Safe to run more than once.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text unique,
  role text not null default 'buyer',
  preferred_city text,
  provider text,
  cart jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile. There is no update policy on purpose,
-- so nobody can change their own role. The server updates profiles with the secret key.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, preferred_city, provider)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data->>'preferred_city',
    new.raw_app_meta_data->>'provider'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
