-- ABU Pay provider-neutral payment metadata.
-- Safe to run against existing production databases.
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'abu_pay';
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "providerMetadata" JSONB;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod')
     AND NOT EXISTS (
       SELECT 1 FROM pg_enum
       WHERE enumtypid = '"PaymentMethod"'::regtype
       AND enumlabel = 'MOBILE_MONEY'
     ) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE 'MOBILE_MONEY';
  END IF;
END $$;
