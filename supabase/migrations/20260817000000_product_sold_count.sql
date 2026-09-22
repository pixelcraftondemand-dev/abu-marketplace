-- Additive-only: Product.soldCount backs the "X sold" social-proof chip on
-- product cards. Defaults to 0 so existing rows read cleanly; the orders
-- route increments it per unit on successful checkout (COD/WALLET) and on
-- payment confirmation (FLUTTERWAVE).

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "soldCount" INTEGER NOT NULL DEFAULT 0;
