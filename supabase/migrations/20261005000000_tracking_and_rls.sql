-- Consent-gated analytics and row-level security guardrails for the pilot.
-- This migration is deliberately additive and idempotent so it can be applied to
-- either a fresh Supabase database or an existing pilot database without breaking
-- current application data.

-- 1) Opt-in analytics storage: a simple consent preference keyed by session user.
CREATE TABLE IF NOT EXISTS public.analytics_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  choice text NOT NULL CHECK (choice IN ('accept', 'decline')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.analytics_consent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_consent_self_select" ON public.analytics_consent;
CREATE POLICY "analytics_consent_self_select"
  ON public.analytics_consent
  FOR SELECT
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "analytics_consent_self_upsert" ON public.analytics_consent;
CREATE POLICY "analytics_consent_self_upsert"
  ON public.analytics_consent
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "analytics_consent_self_update" ON public.analytics_consent;
CREATE POLICY "analytics_consent_self_update"
  ON public.analytics_consent
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- 2) Enable RLS on the main user and marketplace tables.
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Store" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Address" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Rating" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SupportMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."wallet_transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."psp_transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ledger_entry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."audit_log" ENABLE ROW LEVEL SECURITY;

-- Public product catalog reads are allowed; all other sensitive rows are scoped to
-- the user who owns them or to the store owner for marketplace operations.
DROP POLICY IF EXISTS "products_read_public" ON public."Product";
CREATE POLICY "products_read_public"
  ON public."Product"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "stores_read_public" ON public."Store";
CREATE POLICY "stores_read_public"
  ON public."Store"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "user_self_read" ON public."user";
CREATE POLICY "user_self_read"
  ON public."user"
  FOR SELECT
  USING (id = auth.uid()::text);

DROP POLICY IF EXISTS "user_self_update" ON public."user";
CREATE POLICY "user_self_update"
  ON public."user"
  FOR UPDATE
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

DROP POLICY IF EXISTS "address_self_manage" ON public."Address";
CREATE POLICY "address_self_manage"
  ON public."Address"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS "orders_self_or_store_owner_manage" ON public."Order";
CREATE POLICY "orders_self_or_store_owner_manage"
  ON public."Order"
  FOR ALL
  USING (
    "userId" = auth.uid()::text OR
    "storeId" IN (
      SELECT s.id FROM public."Store" s WHERE s."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "userId" = auth.uid()::text OR
    "storeId" IN (
      SELECT s.id FROM public."Store" s WHERE s."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "order_items_self_or_store_owner_manage" ON public."OrderItem";
CREATE POLICY "order_items_self_or_store_owner_manage"
  ON public."OrderItem"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public."Order" o
      WHERE o.id = "OrderItem"."orderId"
        AND (o."userId" = auth.uid()::text OR o."storeId" IN (
          SELECT s.id FROM public."Store" s WHERE s."userId" = auth.uid()::text
        ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."Order" o
      WHERE o.id = "OrderItem"."orderId"
        AND (o."userId" = auth.uid()::text OR o."storeId" IN (
          SELECT s.id FROM public."Store" s WHERE s."userId" = auth.uid()::text
        ))
    )
  );

DROP POLICY IF EXISTS "ratings_self_manage" ON public."Rating";
CREATE POLICY "ratings_self_manage"
  ON public."Rating"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS "support_tickets_self_manage" ON public."SupportTicket";
CREATE POLICY "support_tickets_self_manage"
  ON public."SupportTicket"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS "support_messages_self_manage" ON public."SupportMessage";
CREATE POLICY "support_messages_self_manage"
  ON public."SupportMessage"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public."SupportTicket" t
      WHERE t.id = "SupportMessage"."ticketId" AND t."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."SupportTicket" t
      WHERE t.id = "SupportMessage"."ticketId" AND t."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "payments_self_manage" ON public."payment";
CREATE POLICY "payments_self_manage"
  ON public."payment"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS "wallet_self_manage" ON public."wallet";
CREATE POLICY "wallet_self_manage"
  ON public."wallet"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS "wallet_transactions_self_view" ON public."wallet_transaction";
CREATE POLICY "wallet_transactions_self_view"
  ON public."wallet_transaction"
  FOR SELECT
  USING ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS "psp_transactions_self_view" ON public."psp_transaction";
CREATE POLICY "psp_transactions_self_view"
  ON public."psp_transaction"
  FOR SELECT
  USING ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS "ledger_entries_self_view" ON public."ledger_entry";
CREATE POLICY "ledger_entries_self_view"
  ON public."ledger_entry"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public."psp_transaction" p
      WHERE p.id = "ledger_entry"."pspTransactionId" AND p."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "audit_logs_self_view" ON public."audit_log";
CREATE POLICY "audit_logs_self_view"
  ON public."audit_log"
  FOR SELECT
  USING (
    "actor" = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public."psp_transaction" p
      WHERE p.id = "audit_log"."pspTransactionId" AND p."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "deny_anonymous_write_on_sensitive_tables" ON public."user";
CREATE POLICY "deny_anonymous_write_on_sensitive_tables"
  ON public."user"
  FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_anonymous_write_on_secure_data" ON public."Address";
CREATE POLICY "deny_anonymous_write_on_secure_data"
  ON public."Address"
  FOR ALL
  USING (false)
  WITH CHECK (false);
