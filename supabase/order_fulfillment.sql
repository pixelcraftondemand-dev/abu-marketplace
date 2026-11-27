-- Per-store fulfilment.
--
-- One order can contain items from several stores, so "dispatched" or "delivered" belongs
-- to the store's own lines, not to the whole order. The merchant dashboard writes this
-- column and rolls the order's overall status up from it. Safe to run more than once.
alter table public.order_items
  add column if not exists fulfillment_status text not null default 'placed';

do $$
begin
  alter table public.order_items
    add constraint order_items_fulfillment_status_check
    check (fulfillment_status in ('placed', 'dispatched', 'delivered', 'cancelled'));
exception
  when duplicate_object then null;
end $$;

create index if not exists order_items_fulfillment_idx
  on public.order_items (store_id, order_id);
