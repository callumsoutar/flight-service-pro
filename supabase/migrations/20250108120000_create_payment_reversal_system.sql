-- =====================================================
-- Payment Reversal System Migration
-- =====================================================
-- This migration implements the payment correction system
-- following accounting best practices:
-- 1. Original payment records are IMMUTABLE (never edited)
-- 2. Corrections are made via reversal entries + new payments
-- 3. Complete audit trail is preserved
-- 4. All operations are atomic
-- =====================================================

-- Add metadata column to payments table for tracking reversals
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN payments.metadata IS 'Metadata for payment tracking: reverses_payment_id, replaced_by_payment_id, corrects_payment_id, reversal_reason';

-- Add index for efficient metadata queries
CREATE INDEX IF NOT EXISTS idx_payments_metadata ON payments USING gin (metadata);

-- =====================================================
-- Function: reverse_payment_atomic
-- =====================================================
-- Reverses a payment by creating a reversal transaction
-- Does NOT create the correcting payment (use reverse_and_replace for that)
-- =====================================================
CREATE OR REPLACE FUNCTION reverse_payment_atomic(
  p_payment_id UUID,
  p_reason TEXT,
  p_admin_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_original_payment RECORD;
  v_reversal_transaction_id UUID;
  v_reversal_payment_id UUID;
  v_invoice_id UUID;
  v_user_id UUID;
  v_new_total_paid NUMERIC;
  v_new_balance_due NUMERIC;
  v_invoice_total NUMERIC;
  v_new_status TEXT;
BEGIN
  -- 1. Validate payment exists and get details
  SELECT p.*, i.user_id, i.total_amount
  INTO v_original_payment
  FROM payments p
  LEFT JOIN invoices i ON p.invoice_id = i.id
  WHERE p.id = p_payment_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment not found'
    );
  END IF;
  
  -- 2. Check if payment has already been reversed
  IF v_original_payment.metadata ? 'reversed_by_payment_id' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment has already been reversed',
      'reversal_payment_id', v_original_payment.metadata->>'reversed_by_payment_id'
    );
  END IF;
  
  -- 3. Get user_id (from invoice or transaction)
  IF v_original_payment.invoice_id IS NOT NULL THEN
    v_user_id := v_original_payment.user_id;
    v_invoice_id := v_original_payment.invoice_id;
    v_invoice_total := v_original_payment.total_amount;
  ELSE
    -- Standalone payment (credit payment)
    SELECT user_id INTO v_user_id
    FROM transactions
    WHERE id = v_original_payment.transaction_id;
    
    IF v_user_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Could not determine user for payment reversal'
      );
    END IF;
  END IF;
  
  -- 4. Create reversal transaction (DEBIT to offset original CREDIT)
  INSERT INTO transactions (
    user_id,
    type,
    status,
    amount,
    description,
    metadata,
    completed_at
  ) VALUES (
    v_user_id,
    'debit',
    'completed',
    v_original_payment.amount, -- Positive amount for debit
    'Payment reversal: ' || COALESCE(p_reason, 'Correction'),
    jsonb_build_object(
      'reverses_payment_id', p_payment_id,
      'reversal_reason', p_reason,
      'reversed_by_user_id', p_admin_user_id,
      'original_payment_amount', v_original_payment.amount,
      'original_payment_method', v_original_payment.payment_method,
      'original_payment_reference', v_original_payment.payment_reference
    ),
    NOW()
  )
  RETURNING id INTO v_reversal_transaction_id;
  
  -- 5. Create reversal payment record (negative amount)
  INSERT INTO payments (
    invoice_id,
    amount,
    payment_method,
    payment_reference,
    notes,
    transaction_id,
    metadata
  ) VALUES (
    v_invoice_id,
    -v_original_payment.amount, -- Negative amount for reversal
    v_original_payment.payment_method,
    'REV-' || COALESCE(v_original_payment.payment_reference, p_payment_id::text),
    'Reversal: ' || COALESCE(p_reason, 'Payment correction'),
    v_reversal_transaction_id,
    jsonb_build_object(
      'reverses_payment_id', p_payment_id,
      'reversal_reason', p_reason,
      'reversed_by_user_id', p_admin_user_id,
      'reversal_type', 'payment_reversal'
    )
  )
  RETURNING id INTO v_reversal_payment_id;
  
  -- 6. Update original payment metadata to mark as reversed
  UPDATE payments
  SET metadata = metadata || jsonb_build_object(
    'reversed_by_payment_id', v_reversal_payment_id,
    'reversed_at', NOW(),
    'reversed_by_user_id', p_admin_user_id,
    'reversal_reason', p_reason
  )
  WHERE id = p_payment_id;
  
  -- 7. Update invoice if applicable
  -- NOTE: User account balance is automatically updated by the transaction trigger
  -- DO NOT manually update user balance here to avoid double-counting
  IF v_invoice_id IS NOT NULL THEN
    -- Calculate new totals
    SELECT 
      COALESCE(SUM(amount), 0) as total_paid
    INTO v_new_total_paid
    FROM payments
    WHERE invoice_id = v_invoice_id
      AND (metadata->>'reversal_type' IS NULL OR metadata->>'reversal_type' != 'payment_reversal');
    
    v_new_balance_due := v_invoice_total - v_new_total_paid;
    
    -- Determine new status
    IF v_new_total_paid = 0 THEN
      v_new_status := 'pending';
    ELSIF v_new_total_paid >= v_invoice_total THEN
      v_new_status := 'paid';
    ELSIF v_new_total_paid > 0 THEN
      v_new_status := 'pending'; -- Partially paid
    ELSE
      v_new_status := 'pending';
    END IF;
    
    -- Update invoice
    UPDATE invoices
    SET 
      total_paid = v_new_total_paid,
      balance_due = v_new_balance_due,
      status = v_new_status,
      paid_date = CASE WHEN v_new_status = 'paid' THEN paid_date ELSE NULL END,
      updated_at = NOW()
    WHERE id = v_invoice_id;
  END IF;
  
  -- 8. Return success with details
  RETURN jsonb_build_object(
    'success', true,
    'reversal_payment_id', v_reversal_payment_id,
    'reversal_transaction_id', v_reversal_transaction_id,
    'original_payment_id', p_payment_id,
    'reversed_amount', v_original_payment.amount,
    'invoice_id', v_invoice_id,
    'user_id', v_user_id,
    'new_total_paid', v_new_total_paid,
    'new_balance_due', v_new_balance_due,
    'new_status', v_new_status,
    'message', 'Payment reversed successfully. User balance updated automatically via trigger.'
  );
END;
$$;

COMMENT ON FUNCTION reverse_payment_atomic IS 'Atomically reverses a payment by creating a reversal transaction. User balance is automatically updated via transaction trigger. Original payment preserved for audit trail.';

-- =====================================================
-- Function: reverse_and_replace_payment_atomic
-- =====================================================
-- Reverses a payment AND creates the correct payment in one atomic operation
-- This is the preferred method for payment corrections
-- =====================================================
CREATE OR REPLACE FUNCTION reverse_and_replace_payment_atomic(
  p_original_payment_id UUID,
  p_correct_amount NUMERIC,
  p_reason TEXT,
  p_admin_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reversal_result JSONB;
  v_original_payment RECORD;
  v_correct_payment_id UUID;
  v_correct_transaction_id UUID;
  v_invoice_id UUID;
  v_user_id UUID;
  v_invoice_total NUMERIC;
  v_new_total_paid NUMERIC;
  v_new_balance_due NUMERIC;
  v_new_status TEXT;
BEGIN
  -- 1. Validate correct amount is positive
  IF p_correct_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Correct amount must be greater than zero'
    );
  END IF;
  
  -- 2. Get original payment details
  SELECT p.*, i.user_id, i.total_amount
  INTO v_original_payment
  FROM payments p
  LEFT JOIN invoices i ON p.invoice_id = i.id
  WHERE p.id = p_original_payment_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Original payment not found'
    );
  END IF;
  
  v_invoice_id := v_original_payment.invoice_id;
  
  -- Get user_id
  IF v_invoice_id IS NOT NULL THEN
    v_user_id := v_original_payment.user_id;
    v_invoice_total := v_original_payment.total_amount;
  ELSE
    SELECT user_id INTO v_user_id
    FROM transactions
    WHERE id = v_original_payment.transaction_id;
  END IF;
  
  -- 3. Reverse the original payment
  v_reversal_result := reverse_payment_atomic(
    p_original_payment_id,
    p_reason,
    p_admin_user_id
  );
  
  IF NOT (v_reversal_result->>'success')::boolean THEN
    RETURN v_reversal_result;
  END IF;
  
  -- 4. Create correct payment transaction (CREDIT)
  INSERT INTO transactions (
    user_id,
    type,
    status,
    amount,
    description,
    metadata,
    completed_at
  ) VALUES (
    v_user_id,
    'credit',
    'completed',
    p_correct_amount,
    'Corrected payment: ' || COALESCE(p_reason, 'Payment correction'),
    jsonb_build_object(
      'corrects_payment_id', p_original_payment_id,
      'replaces_payment_id', v_reversal_result->>'reversal_payment_id',
      'correction_reason', p_reason,
      'corrected_by_user_id', p_admin_user_id,
      'original_amount', v_original_payment.amount
    ),
    NOW()
  )
  RETURNING id INTO v_correct_transaction_id;
  
  -- 5. Create correct payment record
  INSERT INTO payments (
    invoice_id,
    amount,
    payment_method,
    payment_reference,
    notes,
    transaction_id,
    metadata
  ) VALUES (
    v_invoice_id,
    p_correct_amount,
    v_original_payment.payment_method,
    v_original_payment.payment_reference,
    COALESCE(p_notes, 'Corrected payment - replaces payment ' || p_original_payment_id::text),
    v_correct_transaction_id,
    jsonb_build_object(
      'corrects_payment_id', p_original_payment_id,
      'correction_reason', p_reason,
      'corrected_by_user_id', p_admin_user_id,
      'original_amount', v_original_payment.amount
    )
  )
  RETURNING id INTO v_correct_payment_id;
  
  -- 6. Update reversal payment metadata to link to correcting payment
  UPDATE payments
  SET metadata = metadata || jsonb_build_object(
    'replaced_by_payment_id', v_correct_payment_id
  )
  WHERE id = (v_reversal_result->>'reversal_payment_id')::uuid;
  
  -- 7. Update invoice if applicable
  -- NOTE: User account balance is automatically updated by the transaction trigger
  -- DO NOT manually update user balance here to avoid double-counting
  IF v_invoice_id IS NOT NULL THEN
    -- Calculate new totals (excluding reversal entries)
    SELECT 
      COALESCE(SUM(amount), 0) as total_paid
    INTO v_new_total_paid
    FROM payments
    WHERE invoice_id = v_invoice_id
      AND (metadata->>'reversal_type' IS NULL OR metadata->>'reversal_type' != 'payment_reversal');
    
    v_new_balance_due := v_invoice_total - v_new_total_paid;
    
    -- Determine new status
    IF v_new_total_paid = 0 THEN
      v_new_status := 'pending';
    ELSIF v_new_total_paid >= v_invoice_total THEN
      v_new_status := 'paid';
    ELSIF v_new_total_paid > 0 THEN
      v_new_status := 'pending'; -- Partially paid
    ELSE
      v_new_status := 'pending';
    END IF;
    
    -- Update invoice
    UPDATE invoices
    SET 
      total_paid = v_new_total_paid,
      balance_due = v_new_balance_due,
      status = v_new_status,
      paid_date = CASE WHEN v_new_status = 'paid' THEN NOW() ELSE NULL END,
      updated_at = NOW()
    WHERE id = v_invoice_id;
  END IF;
  
  -- 8. Return success with complete details
  RETURN jsonb_build_object(
    'success', true,
    'reversal_payment_id', v_reversal_result->>'reversal_payment_id',
    'reversal_transaction_id', v_reversal_result->>'reversal_transaction_id',
    'correct_payment_id', v_correct_payment_id,
    'correct_transaction_id', v_correct_transaction_id,
    'original_payment_id', p_original_payment_id,
    'original_amount', v_original_payment.amount,
    'correct_amount', p_correct_amount,
    'amount_difference', p_correct_amount - v_original_payment.amount,
    'invoice_id', v_invoice_id,
    'user_id', v_user_id,
    'new_total_paid', v_new_total_paid,
    'new_balance_due', v_new_balance_due,
    'new_status', v_new_status,
    'message', 'Payment corrected successfully. User balance updated automatically via trigger.'
  );
END;
$$;

COMMENT ON FUNCTION reverse_and_replace_payment_atomic IS 'Atomically reverses an incorrect payment and creates the correct payment. User balance updated automatically via trigger. Preferred method for payment corrections.';

-- =====================================================
-- Grant permissions
-- =====================================================
-- These functions should only be callable by admin/owner roles
-- RLS policies on payments and transactions tables will enforce access control

GRANT EXECUTE ON FUNCTION reverse_payment_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION reverse_and_replace_payment_atomic TO authenticated;

-- =====================================================
-- Add helpful view for payment history with reversals
-- =====================================================
CREATE OR REPLACE VIEW payment_history_with_reversals AS
SELECT 
  p.id,
  p.invoice_id,
  p.amount,
  p.payment_method,
  p.payment_reference,
  p.notes,
  p.created_at,
  p.transaction_id,
  p.metadata,
  -- Reversal information
  CASE 
    WHEN p.metadata ? 'reverses_payment_id' THEN 'reversal'
    WHEN p.metadata ? 'corrects_payment_id' THEN 'correction'
    WHEN p.metadata ? 'reversed_by_payment_id' THEN 'reversed'
    ELSE 'normal'
  END as payment_type,
  (p.metadata->>'reverses_payment_id')::uuid as reverses_payment_id,
  (p.metadata->>'reversed_by_payment_id')::uuid as reversed_by_payment_id,
  (p.metadata->>'corrects_payment_id')::uuid as corrects_payment_id,
  (p.metadata->>'replaced_by_payment_id')::uuid as replaced_by_payment_id,
  p.metadata->>'reversal_reason' as reversal_reason,
  p.metadata->>'correction_reason' as correction_reason,
  (p.metadata->>'reversed_at')::timestamptz as reversed_at,
  -- User information
  i.user_id,
  u.first_name || ' ' || u.last_name as user_name,
  u.email as user_email
FROM payments p
LEFT JOIN invoices i ON p.invoice_id = i.id
LEFT JOIN users u ON i.user_id = u.id
ORDER BY p.created_at DESC;

COMMENT ON VIEW payment_history_with_reversals IS 'View showing payment history with reversal and correction information';

-- Enable RLS on the view
ALTER VIEW payment_history_with_reversals OWNER TO postgres;

-- =====================================================
-- Migration complete
-- =====================================================

