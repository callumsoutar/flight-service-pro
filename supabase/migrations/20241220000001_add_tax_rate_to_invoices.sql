-- Migration to add missing columns to invoices table
-- These columns are missing from the single_tenant_schema.sql but are needed for the tax system

-- Add tax_rate column to invoices table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'tax_rate') THEN
        ALTER TABLE "public"."invoices" ADD COLUMN "tax_rate" numeric(5,2) DEFAULT 0.15 NOT NULL;
    END IF;
END $$;

-- Add booking_id column to invoices table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'booking_id') THEN
        ALTER TABLE "public"."invoices" ADD COLUMN "booking_id" uuid;
    END IF;
END $$;

-- Add payment_method column to invoices table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_method') THEN
        ALTER TABLE "public"."invoices" ADD COLUMN "payment_method" "public"."payment_method";
    END IF;
END $$;

-- Add payment_reference column to invoices table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_reference') THEN
        ALTER TABLE "public"."invoices" ADD COLUMN "payment_reference" text;
    END IF;
END $$;

-- Add reference column to invoices table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'reference') THEN
        ALTER TABLE "public"."invoices" ADD COLUMN "reference" text;
    END IF;
END $$;

-- Add foreign key constraint for booking_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'invoices_booking_id_fkey') THEN
        ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Add constraint to ensure tax_rate is non-negative
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'invoices_tax_rate_positive') THEN
        ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_tax_rate_positive" CHECK ("tax_rate" >= 0);
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_invoices_booking_id" ON "public"."invoices" ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_payment_method" ON "public"."invoices" ("payment_method"); 