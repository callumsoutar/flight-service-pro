-- Add missing columns to users table
-- These columns were in the original multi-tenant schema but are missing from the single-tenant version

-- Add missing columns to users table
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "license_number" text,
ADD COLUMN IF NOT EXISTS "license_expiry" date,
ADD COLUMN IF NOT EXISTS "medical_expiry" date,
ADD COLUMN IF NOT EXISTS "date_of_last_flight" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "street_address" text,
ADD COLUMN IF NOT EXISTS "next_of_kin_name" text,
ADD COLUMN IF NOT EXISTS "next_of_kin_phone" text,
ADD COLUMN IF NOT EXISTS "company_name" text,
ADD COLUMN IF NOT EXISTS "occupation" text,
ADD COLUMN IF NOT EXISTS "employer" text,
ADD COLUMN IF NOT EXISTS "notes" text,
ADD COLUMN IF NOT EXISTS "account_balance" numeric DEFAULT 0;

-- Rename existing columns to match the original schema
ALTER TABLE "public"."users" 
RENAME COLUMN "address" TO "street_address";

-- Drop columns that don't exist in the original schema
ALTER TABLE "public"."users" 
DROP COLUMN IF EXISTS "city",
DROP COLUMN IF EXISTS "state", 
DROP COLUMN IF EXISTS "postal_code",
DROP COLUMN IF EXISTS "country",
DROP COLUMN IF EXISTS "emergency_contact_name",
DROP COLUMN IF EXISTS "emergency_contact_phone", 
DROP COLUMN IF EXISTS "emergency_contact_relationship",
DROP COLUMN IF EXISTS "medical_certificate_number",
DROP COLUMN IF EXISTS "medical_certificate_expiry",
DROP COLUMN IF EXISTS "pilot_license_number",
DROP COLUMN IF EXISTS "pilot_license_type",
DROP COLUMN IF EXISTS "pilot_license_expiry",
DROP COLUMN IF EXISTS "total_flight_hours",
DROP COLUMN IF EXISTS "is_active";

-- Verify the updated schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position; 