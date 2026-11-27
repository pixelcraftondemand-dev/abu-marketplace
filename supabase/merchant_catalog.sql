-- Merchant self-service catalog.
--
-- These tables were created while the app still used Supabase Auth: their foreign keys
-- point at public.users, the old auth mirror. Sign-in now runs through Clerk, whose ids
-- (user_…) never exist in that table, and public.users is empty, so the constraints
-- rejected every merchant product and every order. Drop only those three keys; the
-- seller/buyer/owner column keeps storing the signed-in account id.
--
-- `products.store_id` still references `vendor_stores`, which the merchant dashboard
-- creates for each approved store. Safe to run more than once.

alter table public.products drop constraint if exists products_seller_id_fkey;
alter table public.orders drop constraint if exists orders_buyer_id_fkey;
alter table public.vendor_stores drop constraint if exists vendor_stores_owner_id_fkey;
