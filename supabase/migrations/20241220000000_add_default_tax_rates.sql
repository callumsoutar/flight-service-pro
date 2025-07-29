-- Migration to add default tax rates and ensure proper table structure
-- This migration adds common tax rates for different jurisdictions

-- First, ensure the tax_rates table has the correct structure
-- (This will be a no-op if the table already exists with the right structure)
CREATE TABLE IF NOT EXISTS "public"."tax_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "country_code" "text" NOT NULL,
    "region_code" "text",
    "tax_name" "text" NOT NULL,
    "rate" numeric(6,4) NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "effective_from" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Add is_active column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tax_rates' AND column_name = 'is_active') THEN
        ALTER TABLE "public"."tax_rates" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
    END IF;
END $$;

-- Add primary key if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tax_rates_pkey') THEN
        ALTER TABLE "public"."tax_rates" ADD CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- Insert default tax rates for common jurisdictions
-- Only insert if they don't already exist

-- Default rate (15% - commonly used as fallback)
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('DEFAULT', NULL, 'Default Tax Rate', 0.1500, true, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Australia - GST
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('AU', NULL, 'GST', 0.1000, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Canada - GST
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('CA', NULL, 'GST', 0.0500, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Canada - HST (Ontario)
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('CA', 'ON', 'HST', 0.1300, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Canada - HST (Nova Scotia)
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('CA', 'NS', 'HST', 0.1500, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Canada - HST (New Brunswick)
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('CA', 'NB', 'HST', 0.1500, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Canada - HST (Newfoundland and Labrador)
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('CA', 'NL', 'HST', 0.1500, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Canada - HST (Prince Edward Island)
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('CA', 'PE', 'HST', 0.1500, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- United Kingdom - VAT
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('GB', NULL, 'VAT', 0.2000, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- United States - No federal sales tax, but common state rates
-- California
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('US', 'CA', 'Sales Tax', 0.0725, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- New York
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('US', 'NY', 'Sales Tax', 0.0400, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Texas
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('US', 'TX', 'Sales Tax', 0.0625, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Florida
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('US', 'FL', 'Sales Tax', 0.0600, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- New Zealand - GST
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('NZ', NULL, 'GST', 0.1500, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Singapore - GST
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('SG', NULL, 'GST', 0.0800, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- European Union - VAT (general rate, varies by country)
-- Germany
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('DE', NULL, 'VAT', 0.1900, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- France
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('FR', NULL, 'VAT', 0.2000, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Italy
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('IT', NULL, 'VAT', 0.2200, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Spain
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('ES', NULL, 'VAT', 0.2100, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Netherlands
INSERT INTO "public"."tax_rates" ("country_code", "region_code", "tax_name", "rate", "is_default", "effective_from")
VALUES ('NL', NULL, 'VAT', 0.2100, false, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_tax_rates_country_region" ON "public"."tax_rates" ("country_code", "region_code");
CREATE INDEX IF NOT EXISTS "idx_tax_rates_is_default" ON "public"."tax_rates" ("is_default");
CREATE INDEX IF NOT EXISTS "idx_tax_rates_effective_from" ON "public"."tax_rates" ("effective_from"); 