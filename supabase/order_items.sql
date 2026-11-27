-- One row per line item sold, so a merchant can see what their store actually sold.
-- `orders` stores the order total only; without these rows there is no way to attribute
-- revenue to a store or a product. Safe to run more than once.
create table if not exists public.order_items (
  id bigserial primary key,
  order_id text not null references public.orders(id) on delete cascade,
  product_id text not null,
  -- The approved store that sold the item; null for seeded catalog products.
  store_id text,
  title text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_sle numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists order_items_store_idx on public.order_items (store_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

alter table public.order_items enable row level security;

-- Only the server (secret key) reads and writes line items. There is deliberately no
-- policy: buyers see their order through the API, and merchants see aggregates.
