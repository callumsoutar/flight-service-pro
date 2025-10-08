CREATE TABLE IF NOT EXISTS chargeable_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


INSERT INTO chargeable_types (code, name, description, is_system) VALUES
  ('aircraft_rental', 'Aircraft Rental', 'Charges for aircraft rental', true),
  ('instructor_fee', 'Instructor Fee', 'Instructor services', true),
  ('membership_fee', 'Membership Fee', 'Membership fees', true),
  ('landing_fee', 'Landing Fee', 'Airport landing fees', true),
  ('facility_rental', 'Facility Rental', 'Facility rentals', true),
  ('product_sale', 'Product Sale', 'Product sales', true),
  ('service_fee', 'Service Fee', 'Service fees', true),
  ('other', 'Other', 'Other charges', true),
  ('default_briefing', 'Briefing Fee', 'Flight briefing fees', true),
  ('airways_fees', 'Airways Fees', 'Airways navigation fees', true);

-- Add new foreign key column
ALTER TABLE chargeables ADD COLUMN chargeable_type_id uuid;

-- Migrate existing data from enum to FK
UPDATE chargeables c
SET chargeable_type_id = ct.id
FROM chargeable_types ct
WHERE ct.code = c.type::text;

-- Make column required and add foreign key constraint
ALTER TABLE chargeables
  ALTER COLUMN chargeable_type_id SET NOT NULL,
  ADD CONSTRAINT fk_chargeable_type
    FOREIGN KEY (chargeable_type_id)
    REFERENCES chargeable_types(id)
    ON DELETE RESTRICT;

-- Drop old enum column
ALTER TABLE chargeables DROP COLUMN type;

-- Drop enum type (CASCADE will drop dependencies)
DROP TYPE IF EXISTS chargeable_type CASCADE;

-- Add chargeable_id foreign key column
ALTER TABLE membership_types ADD COLUMN chargeable_id uuid;

-- Create chargeables for existing membership types
WITH membership_chargeable_type AS (
  SELECT id FROM chargeable_types WHERE code = 'membership_fee'
),
new_chargeables AS (
  INSERT INTO chargeables (name, description, rate, is_taxable, is_active, chargeable_type_id)
  SELECT
    mt.name || ' Fee',
    'Membership fee for ' || mt.name,
    mt.price,
    false, -- membership fees typically not taxable
    mt.is_active,
    mct.id
  FROM membership_types mt
  CROSS JOIN membership_chargeable_type mct
  WHERE mt.chargeable_id IS NULL -- Only for membership types without existing chargeable
  RETURNING id, name
)
UPDATE membership_types mt
SET chargeable_id = nc.id
FROM new_chargeables nc
WHERE nc.name = mt.name || ' Fee';

-- Add foreign key constraint
ALTER TABLE membership_types
  ADD CONSTRAINT fk_membership_chargeable
    FOREIGN KEY (chargeable_id)
    REFERENCES chargeables(id)
    ON DELETE RESTRICT;

-- Add index
CREATE INDEX idx_membership_types_chargeable ON membership_types(chargeable_id);

ALTER TABLE chargeable_types ENABLE ROW LEVEL SECURITY;

-- Users can view all chargeable types
CREATE POLICY "Users can view chargeable types"
  ON chargeable_types FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert chargeable types
CREATE POLICY "Users can insert chargeable types"
  ON chargeable_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update chargeable types
CREATE POLICY "Users can update chargeable types"
  ON chargeable_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Users can delete only non-system chargeable types
CREATE POLICY "Users can delete non-system chargeable types"
  ON chargeable_types FOR DELETE
  TO authenticated
  USING (is_system = false);


CREATE TRIGGER set_updated_at_chargeable_types
  BEFORE UPDATE ON chargeable_types
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

COMMIT;

