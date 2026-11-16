-- Single-item listings and artisan registrations join the store review queue.
-- Safe to run more than once.
alter table public.store_submissions
  add column if not exists kind text not null default 'store';
alter table public.store_submissions
  add column if not exists payload jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'store_submissions_kind_check'
  ) then
    alter table public.store_submissions
      add constraint store_submissions_kind_check
      check (kind in ('store', 'product', 'service'));
  end if;
end $$;

create index if not exists store_submissions_kind_status_idx
  on public.store_submissions (kind, status, created_at desc);

-- Existing rows predate the column, so they are stores.
update public.store_submissions set kind = 'store' where kind is null;

notify pgrst, 'reload schema';
