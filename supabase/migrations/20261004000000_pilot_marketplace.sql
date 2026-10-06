-- Sierra Leone pilot marketplace.
--
-- Adds the pilot fulfilment vocabulary to the OrderStatus enum and a vendor
-- WhatsApp contact column to Store. Purely additive and idempotent, so it is
-- safe to replay against existing production databases.
--
-- Legacy OrderStatus values (PROCESSING, SHIPPED) are intentionally NOT
-- rewritten here: data-mutating statements are blocked by the repository
-- migration guard, and the application treats them as aliases of CONFIRMED and
-- OUT_FOR_DELIVERY respectively (see app/api/store/orders/route.js). Historical
-- rows therefore keep reading correctly without a destructive mass update.

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Vendor WhatsApp number in international format with no plus or spaces
-- (e.g. "23276123456"). Null means the vendor has not supplied one.
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "whatsappNumber" TEXT;
