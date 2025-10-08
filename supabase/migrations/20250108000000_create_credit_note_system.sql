-- =====================================================
-- CREDIT NOTE SYSTEM MIGRATION
-- =====================================================
-- This migration creates the credit note system for handling
-- corrections to approved invoices following accounting best practices.
-- =====================================================

-- =====================================================
-- 1. CREATE CREDIT_NOTES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number TEXT UNIQUE NOT NULL,
  original_invoice_id UUID NOT NULL REFERENCES invoices(id),
  user_id UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'cancelled')),
  issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_date TIMESTAMPTZ NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_total NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  deleted_by UUID REFERENCES users(id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_credit_notes_original_invoice 
  ON credit_notes(original_invoice_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_credit_notes_user 
  ON credit_notes(user_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_credit_notes_status 
  ON credit_notes(status) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_credit_notes_deleted 
  ON credit_notes(deleted_at, deleted_by) 
  WHERE deleted_at IS NOT NULL;

-- Add comment
COMMENT ON TABLE credit_notes IS 'Credit notes for correcting approved invoices';

-- =====================================================
-- 2. CREATE CREDIT_NOTE_ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS credit_note_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  original_invoice_item_id UUID REFERENCES invoice_items(id),
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  tax_rate NUMERIC NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 1),
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  deleted_by UUID REFERENCES users(id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note 
  ON credit_note_items(credit_note_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_credit_note_items_original 
  ON credit_note_items(original_invoice_item_id) 
  WHERE deleted_at IS NULL;

-- Add comment
COMMENT ON TABLE credit_note_items IS 'Line items for credit notes';

-- =====================================================
-- 3. GENERATE CREDIT NOTE NUMBER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_credit_note_number()
RETURNS TEXT AS $$
DECLARE
  v_year_month TEXT;
  v_sequence INT;
  v_credit_note_number TEXT;
BEGIN
  -- Format: CN-YYYYMM-NNN (e.g., CN-202501-001)
  v_year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  -- Get the next sequence number for this month
  SELECT COALESCE(MAX(
    CASE 
      WHEN credit_note_number ~ ('^CN-' || v_year_month || '-[0-9]+$')
      THEN CAST(SUBSTRING(credit_note_number FROM '[0-9]+$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO v_sequence
  FROM credit_notes;
  
  -- Format with leading zeros (3 digits)
  v_credit_note_number := 'CN-' || v_year_month || '-' || LPAD(v_sequence::TEXT, 3, '0');
  
  RETURN v_credit_note_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_credit_note_number() IS 'Generates sequential credit note numbers in format CN-YYYYMM-NNN';

-- =====================================================
-- 4. SOFT DELETE CREDIT NOTE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION soft_delete_credit_note(
  p_credit_note_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT 'User initiated deletion'
)
RETURNS JSONB AS $$
DECLARE
  v_credit_note RECORD;
  v_items_count INT;
BEGIN
  -- Get credit note with lock
  SELECT * INTO v_credit_note
  FROM credit_notes
  WHERE id = p_credit_note_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Credit note not found'
    );
  END IF;
  
  -- Only draft credit notes can be deleted
  IF v_credit_note.status != 'draft' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete applied or cancelled credit note',
      'credit_note_number', v_credit_note.credit_note_number,
      'status', v_credit_note.status
    );
  END IF;
  
  -- Soft delete credit note
  UPDATE credit_notes
  SET 
    deleted_at = NOW(),
    deleted_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_credit_note_id;
  
  -- Soft delete all associated items
  UPDATE credit_note_items
  SET 
    deleted_at = NOW(),
    deleted_by = p_user_id,
    updated_at = NOW()
  WHERE credit_note_id = p_credit_note_id
  AND deleted_at IS NULL;
  
  -- Count deleted items
  SELECT COUNT(*) INTO v_items_count
  FROM credit_note_items
  WHERE credit_note_id = p_credit_note_id
  AND deleted_at IS NOT NULL;
  
  RETURN jsonb_build_object(
    'success', true,
    'credit_note_id', p_credit_note_id,
    'credit_note_number', v_credit_note.credit_note_number,
    'items_deleted', v_items_count,
    'deleted_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION soft_delete_credit_note(UUID, UUID, TEXT) IS 'Soft deletes a draft credit note and its items';

-- =====================================================
-- 5. APPLY CREDIT NOTE ATOMIC FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION apply_credit_note_atomic(
  p_credit_note_id UUID,
  p_applied_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_credit_note RECORD;
  v_transaction_id UUID;
  v_new_balance NUMERIC;
BEGIN
  -- Get credit note with lock
  SELECT * INTO v_credit_note
  FROM credit_notes
  WHERE id = p_credit_note_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Credit note not found'
    );
  END IF;
  
  -- Validate status
  IF v_credit_note.status != 'draft' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Credit note has already been applied or cancelled',
      'status', v_credit_note.status
    );
  END IF;
  
  -- Validate amount
  IF v_credit_note.total_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Credit note amount must be greater than zero'
    );
  END IF;
  
  -- Create credit transaction (credit = positive amount for user)
  INSERT INTO transactions (
    user_id,
    type,
    status,
    amount,
    description,
    metadata,
    reference_number,
    completed_at
  ) VALUES (
    v_credit_note.user_id,
    'credit',
    'completed',
    v_credit_note.total_amount,
    'Credit note applied: ' || v_credit_note.credit_note_number || ' for invoice correction',
    jsonb_build_object(
      'credit_note_id', p_credit_note_id,
      'credit_note_number', v_credit_note.credit_note_number,
      'original_invoice_id', v_credit_note.original_invoice_id,
      'reason', v_credit_note.reason,
      'applied_by', p_applied_by
    ),
    v_credit_note.credit_note_number,
    NOW()
  ) RETURNING id INTO v_transaction_id;
  
  -- Update credit note status to applied
  UPDATE credit_notes
  SET 
    status = 'applied',
    applied_date = NOW(),
    updated_at = NOW()
  WHERE id = p_credit_note_id;
  
  -- Get new account balance (transaction triggers will handle balance update)
  SELECT account_balance INTO v_new_balance
  FROM users
  WHERE id = v_credit_note.user_id;
  
  -- Return success with details
  RETURN jsonb_build_object(
    'success', true,
    'credit_note_id', p_credit_note_id,
    'credit_note_number', v_credit_note.credit_note_number,
    'transaction_id', v_transaction_id,
    'amount_credited', v_credit_note.total_amount,
    'new_balance', v_new_balance,
    'applied_date', NOW(),
    'message', 'Credit note applied successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to apply credit note: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION apply_credit_note_atomic(UUID, UUID) IS 'Atomically applies a credit note by creating a credit transaction and updating account balance';

-- =====================================================
-- 6. PREVENT APPLIED CREDIT NOTE MODIFICATION TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_applied_credit_note_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent modification of applied credit notes
  IF OLD.status = 'applied' THEN
    -- Allow soft delete
    IF (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) AND NEW.deleted_at IS NOT NULL THEN
      RETURN NEW;
    END IF;
    
    -- Allow updated_at changes (for tracking)
    IF (NEW.updated_at IS DISTINCT FROM OLD.updated_at) AND 
       (NEW IS NOT DISTINCT FROM OLD OR 
        (NEW.updated_at IS DISTINCT FROM OLD.updated_at AND 
         jsonb_strip_nulls(to_jsonb(NEW)) - 'updated_at' = jsonb_strip_nulls(to_jsonb(OLD)) - 'updated_at')) THEN
      RETURN NEW;
    END IF;
    
    -- Block all other modifications
    RAISE EXCEPTION 'Cannot modify applied credit note %. Applied credit notes are immutable.', OLD.credit_note_number
      USING HINT = 'Credit note status: applied, applied_date: ' || OLD.applied_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_credit_note_modification
  BEFORE UPDATE ON credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION prevent_applied_credit_note_modification();

COMMENT ON FUNCTION prevent_applied_credit_note_modification() IS 'Prevents modification of applied credit notes (immutability for accounting compliance)';

-- =====================================================
-- 7. PREVENT APPLIED CREDIT NOTE ITEM MODIFICATION TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_applied_credit_note_item_modification()
RETURNS TRIGGER AS $$
DECLARE
  v_credit_note_status TEXT;
BEGIN
  -- Get credit note status
  SELECT status INTO v_credit_note_status
  FROM credit_notes
  WHERE id = COALESCE(NEW.credit_note_id, OLD.credit_note_id)
  AND deleted_at IS NULL;
  
  -- Block changes to items on applied credit notes
  IF v_credit_note_status = 'applied' THEN
    -- Allow soft delete
    IF TG_OP = 'UPDATE' AND (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) AND NEW.deleted_at IS NOT NULL THEN
      RETURN NEW;
    END IF;
    
    RAISE EXCEPTION 'Cannot modify items on applied credit note. Applied credit notes are immutable.'
      USING HINT = 'Credit note status: applied';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_credit_note_item_insert
  BEFORE INSERT ON credit_note_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_applied_credit_note_item_modification();

CREATE TRIGGER prevent_credit_note_item_update
  BEFORE UPDATE ON credit_note_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_applied_credit_note_item_modification();

CREATE TRIGGER prevent_credit_note_item_delete
  BEFORE DELETE ON credit_note_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_applied_credit_note_item_modification();

COMMENT ON FUNCTION prevent_applied_credit_note_item_modification() IS 'Prevents modification of credit note items on applied credit notes';

-- =====================================================
-- 8. ROW-LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on credit_notes
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own non-deleted credit notes
CREATE POLICY credit_notes_view_own
  ON credit_notes FOR SELECT
  USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL
  );

-- Policy: Admins/Owners can view all credit notes (including deleted)
CREATE POLICY credit_notes_view_all
  ON credit_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Policy: Instructors can view credit notes for their students' invoices
CREATE POLICY credit_notes_view_instructor_students
  ON credit_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'instructor'
    )
    AND deleted_at IS NULL
  );

-- Policy: Admins/Owners can manage credit notes
CREATE POLICY credit_notes_manage
  ON credit_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Enable RLS on credit_note_items
ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view items on their credit notes
CREATE POLICY credit_note_items_view_own
  ON credit_note_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM credit_notes
      WHERE credit_notes.id = credit_note_items.credit_note_id
      AND credit_notes.user_id = auth.uid()
      AND credit_note_items.deleted_at IS NULL
    )
  );

-- Policy: Admins/Owners can view all credit note items
CREATE POLICY credit_note_items_view_all
  ON credit_note_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Policy: Instructors can view credit note items for their students
CREATE POLICY credit_note_items_view_instructor_students
  ON credit_note_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'instructor'
    )
    AND deleted_at IS NULL
  );

-- Policy: Admins/Owners can manage credit note items
CREATE POLICY credit_note_items_manage
  ON credit_note_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION generate_credit_note_number() TO authenticated;
GRANT EXECUTE ON FUNCTION apply_credit_note_atomic(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_credit_note(UUID, UUID, TEXT) TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'credit_notes') THEN
    RAISE EXCEPTION 'credit_notes table was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'credit_note_items') THEN
    RAISE EXCEPTION 'credit_note_items table was not created';
  END IF;
  
  RAISE NOTICE 'Credit note system migration completed successfully';
END $$;

