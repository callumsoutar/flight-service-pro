-- =====================================================
-- FIX: Update Invoice Balance When Credit Notes Applied
-- =====================================================
-- Date: 2025-10-08
-- Issue: When credit notes are applied, the invoice balance_due
--        was not being updated. This caused invoices to show
--        incorrect balance amounts.
--
-- Fix: Updated apply_credit_note_atomic() function to also
--      update the invoice's balance_due when applying credit notes.
-- =====================================================

-- Drop and recreate the function with balance_due update
CREATE OR REPLACE FUNCTION apply_credit_note_atomic(
  p_credit_note_id UUID,
  p_applied_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_credit_note RECORD;
  v_invoice RECORD;
  v_transaction_id UUID;
  v_new_balance NUMERIC;
  v_invoice_balance_due NUMERIC;
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
  
  -- Verify credit note is in draft status
  IF v_credit_note.status != 'draft' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Credit note already ' || v_credit_note.status,
      'status', v_credit_note.status
    );
  END IF;
  
  -- Get original invoice with lock
  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = v_credit_note.original_invoice_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Original invoice not found'
    );
  END IF;
  
  -- Create credit transaction (positive = credit to user account)
  INSERT INTO transactions (
    user_id,
    type,
    amount,
    description,
    status,
    metadata,
    created_at
  ) VALUES (
    v_credit_note.user_id,
    'credit',
    v_credit_note.total_amount,
    'Credit Note ' || v_credit_note.credit_note_number || ' for Invoice ' || v_invoice.invoice_number,
    'completed',
    jsonb_build_object(
      'credit_note_id', v_credit_note.id,
      'credit_note_number', v_credit_note.credit_note_number,
      'invoice_id', v_invoice.id,
      'invoice_number', v_invoice.invoice_number,
      'reason', v_credit_note.reason
    ),
    NOW()
  ) RETURNING id INTO v_transaction_id;
  
  -- Update credit note status
  UPDATE credit_notes
  SET 
    status = 'applied',
    applied_date = NOW(),
    updated_at = NOW()
  WHERE id = p_credit_note_id;
  
  -- Calculate new invoice balance_due (including all applied credit notes)
  SELECT 
    v_invoice.total_amount - COALESCE(v_invoice.total_paid, 0) - COALESCE(SUM(cn.total_amount), 0)
  INTO v_invoice_balance_due
  FROM credit_notes cn
  WHERE cn.original_invoice_id = v_invoice.id
    AND cn.status = 'applied'
    AND cn.deleted_at IS NULL;
  
  -- Update invoice balance_due
  UPDATE invoices
  SET 
    balance_due = v_invoice_balance_due,
    updated_at = NOW()
  WHERE id = v_invoice.id;
  
  -- Get new user balance (triggers will update it automatically)
  SELECT account_balance INTO v_new_balance
  FROM users
  WHERE id = v_credit_note.user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'credit_note_id', p_credit_note_id,
    'credit_note_number', v_credit_note.credit_note_number,
    'transaction_id', v_transaction_id,
    'amount_credited', v_credit_note.total_amount,
    'new_balance', v_new_balance,
    'invoice_balance_due', v_invoice_balance_due,
    'applied_date', NOW(),
    'message', 'Credit note applied successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION apply_credit_note_atomic(UUID, UUID) IS 
'Atomically applies a credit note by creating a credit transaction, updating account balance, and updating invoice balance_due';

-- =====================================================
-- Backfill: Fix any existing invoices with incorrect balance_due
-- =====================================================

-- Update all invoices that have applied credit notes
UPDATE invoices i
SET 
  balance_due = i.total_amount - COALESCE(i.total_paid, 0) - COALESCE(
    (SELECT SUM(cn.total_amount)
     FROM credit_notes cn
     WHERE cn.original_invoice_id = i.id
       AND cn.status = 'applied'
       AND cn.deleted_at IS NULL),
    0
  ),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 
  FROM credit_notes cn 
  WHERE cn.original_invoice_id = i.id 
    AND cn.status = 'applied'
    AND cn.deleted_at IS NULL
)
AND i.balance_due != (
  i.total_amount - COALESCE(i.total_paid, 0) - COALESCE(
    (SELECT SUM(cn.total_amount)
     FROM credit_notes cn
     WHERE cn.original_invoice_id = i.id
       AND cn.status = 'applied'
       AND cn.deleted_at IS NULL),
    0
  )
);

-- =====================================================
-- Verification
-- =====================================================

-- Log how many invoices were fixed
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM invoices i
  WHERE EXISTS (
    SELECT 1 
    FROM credit_notes cn 
    WHERE cn.original_invoice_id = i.id 
      AND cn.status = 'applied'
      AND cn.deleted_at IS NULL
  );
  
  RAISE NOTICE 'Fixed balance_due for % invoice(s) with applied credit notes', v_count;
END $$;

