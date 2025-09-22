-- Add passenger_names JSONB column to flight_authorizations table
ALTER TABLE "public"."flight_authorizations" 
ADD COLUMN "passenger_names" jsonb DEFAULT '[]'::jsonb;
