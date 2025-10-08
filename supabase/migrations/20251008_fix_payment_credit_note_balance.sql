-- =====================================================
-- Fix: Payment Processing Credit Note Balance Bug
-- =====================================================
-- Date: October 8, 2025
-- Issue: process_payment_atomic() was not considering
--        applied credit notes when calculating balance_due
-- =====================================================

-- Update process_payment_atomic to include credit notes in balance calculation
CREATE OR REPLACE FUNCTION public.process_payment_atomic(
  p_invoice_id uuid, 
  p_amount numeric, 
  p_payment_method text, 
  p_payment_reference text DEFAULT NULL, 
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_invoice RECORD;
  v_payment_id UUID;
  v_transaction_id UUID;
  v_remaining_balance NUMERIC;
  v_new_status TEXT;
  v_new_total_paid NUMERIC;
  v_total_credits NUMERIC;
  v_new_balance_due NUMERIC;
  v_result JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Get invoice details with lock
    SELECT * INTO v_invoice
    FROM invoices 
    WHERE id = p_invoice_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invoice not found',
        'invoice_id', p_invoice_id
      );
    END IF;
    
    -- Validate payment amount
    IF p_amount <= 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Payment amount must be positive',
        'invoice_id', p_invoice_id
      );
    END IF;
    
    -- Calculate total applied credit notes
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_total_credits
    FROM credit_notes
    WHERE original_invoice_id = p_invoice_id
      AND status = 'applied'
      AND deleted_at IS NULL;
    
    -- Calculate remaining balance (considering credit notes)
    SELECT COALESCE(v_invoice.total_amount - COALESCE(SUM(amount), 0) - v_total_credits, v_invoice.total_amount - v_total_credits)
    INTO v_remaining_balance
    FROM payments
    WHERE invoice_id = p_invoice_id;
    
    -- Validate payment doesn't exceed remaining balance (with rounded comparison)
    IF p_amount > ROUND(v_remaining_balance, 2) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Payment amount exceeds remaining balance',
        'remaining_balance', ROUND(v_remaining_balance, 2),
        'invoice_id', p_invoice_id
      );
    END IF;
    
    -- Create credit transaction first
    INSERT INTO transactions (
      user_id,
      type,
      amount,
      description,
      metadata,
      status,
      completed_at
    ) VALUES (
      v_invoice.user_id,
      'credit',
      p_amount,
      'Payment for invoice: ' || v_invoice.invoice_number,
      jsonb_build_object(
        'invoice_id', p_invoice_id,
        'invoice_number', v_invoice.invoice_number,
        'transaction_type', 'payment_credit'
      ),
      'completed',
      NOW()
    ) RETURNING id INTO v_transaction_id;
    
    -- Create payment record
    INSERT INTO payments (
      invoice_id,
      transaction_id,
      amount,
      payment_method,
      payment_reference,
      notes
    ) VALUES (
      p_invoice_id,
      v_transaction_id,
      p_amount,
      p_payment_method::payment_method,
      p_payment_reference,
      p_notes
    ) RETURNING id INTO v_payment_id;
    
    -- Calculate new total paid amount
    SELECT COALESCE(SUM(amount), 0)
    INTO v_new_total_paid
    FROM payments
    WHERE invoice_id = p_invoice_id;
    
    -- Calculate new balance_due (including credit notes)
    v_new_balance_due := ROUND(v_invoice.total_amount - v_new_total_paid - v_total_credits, 2);
    
    -- Update invoice totals with proper rounding
    UPDATE invoices 
    SET 
      total_paid = ROUND(v_new_total_paid, 2),
      balance_due = v_new_balance_due,  -- Now includes credit notes!
      updated_at = NOW()
    WHERE id = p_invoice_id;
    
    -- Determine new status (balance should consider credit notes)
    v_remaining_balance := v_new_balance_due;
    
    IF v_remaining_balance <= 0 THEN
      v_new_status := 'paid';
      UPDATE invoices 
      SET 
        status = 'paid'::invoice_status,
        paid_date = NOW(),
        updated_at = NOW()
      WHERE id = p_invoice_id;
    ELSE
      v_new_status := v_invoice.status;
    END IF;
    
    -- Return success result
    RETURN jsonb_build_object(
      'success', true,
      'payment_id', v_payment_id,
      'transaction_id', v_transaction_id,
      'invoice_id', p_invoice_id,
      'new_status', v_new_status,
      'remaining_balance', v_remaining_balance,
      'total_paid', ROUND(v_new_total_paid, 2),
      'total_credits', v_total_credits,
      'message', 'Payment processed atomically'
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Any error will cause the entire transaction to rollback
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'invoice_id', p_invoice_id,
        'message', 'Payment processing rolled back due to error'
      );
  END;
END;
$function$;

COMMENT ON FUNCTION process_payment_atomic IS 'Atomically processes a payment for an invoice. Considers applied credit notes when calculating balance_due.';

-- =====================================================
-- Data Migration: Fix existing invoices with incorrect balance_due
-- =====================================================

-- Update all invoices to recalculate balance_due including credit notes
UPDATE invoices i
SET 
  balance_due = (
    i.total_amount 
    - i.total_paid 
    - COALESCE((
      SELECT SUM(cn.total_amount)
      FROM credit_notes cn
      WHERE cn.original_invoice_id = i.id
        AND cn.status = 'applied'
        AND cn.deleted_at IS NULL
    ), 0)
  ),
  status = CASE 
    WHEN (
      i.total_amount 
      - i.total_paid 
      - COALESCE((
        SELECT SUM(cn.total_amount)
        FROM credit_notes cn
        WHERE cn.original_invoice_id = i.id
          AND cn.status = 'applied'
          AND cn.deleted_at IS NULL
      ), 0)
    ) <= 0 
    AND i.total_paid > 0 THEN 'paid'::invoice_status
    ELSE i.status
  END,
  paid_date = CASE 
    WHEN (
      i.total_amount 
      - i.total_paid 
      - COALESCE((
        SELECT SUM(cn.total_amount)
        FROM credit_notes cn
        WHERE cn.original_invoice_id = i.id
          AND cn.status = 'applied'
          AND cn.deleted_at IS NULL
      ), 0)
    ) <= 0 
    AND i.total_paid > 0 
    AND i.paid_date IS NULL THEN NOW()
    ELSE i.paid_date
  END,
  updated_at = NOW()
WHERE i.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 
    FROM credit_notes cn 
    WHERE cn.original_invoice_id = i.id 
      AND cn.status = 'applied'
      AND cn.deleted_at IS NULL
  );

-- =====================================================
-- Verification Query
-- =====================================================

-- Verify all invoices now have correct balance_due
DO $$
DECLARE
  v_mismatch_count INT;
BEGIN
  SELECT COUNT(*) INTO v_mismatch_count
  FROM (
    SELECT i.id
    FROM invoices i
    LEFT JOIN credit_notes cn ON cn.original_invoice_id = i.id 
      AND cn.status = 'applied'
      AND cn.deleted_at IS NULL
    WHERE i.deleted_at IS NULL
    GROUP BY i.id, i.balance_due, i.total_amount, i.total_paid
    HAVING ABS(i.balance_due - (
      i.total_amount 
      - i.total_paid 
      - COALESCE(SUM(cn.total_amount), 0)
    )) > 0.01
  ) sub;
  
  IF v_mismatch_count > 0 THEN
    RAISE NOTICE '⚠️ WARNING: % invoices still have balance_due mismatches!', v_mismatch_count;
  ELSE
    RAISE NOTICE '✅ SUCCESS: All invoices have correct balance_due calculations';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================

