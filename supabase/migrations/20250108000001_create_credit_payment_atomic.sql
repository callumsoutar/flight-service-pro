-- Migration: Create atomic credit payment processing function
-- Description: Process standalone credit payments (without invoice) atomically
-- Author: System
-- Date: 2025-01-08

-- Drop function if exists
DROP FUNCTION IF EXISTS process_credit_payment_atomic(UUID, NUMERIC, TEXT, TEXT, TEXT);

-- Create atomic credit payment processing function
CREATE OR REPLACE FUNCTION process_credit_payment_atomic(
  p_user_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_user RECORD;
  v_payment_id UUID;
  v_transaction_id UUID;
  v_result JSONB;
BEGIN
  -- Start transaction (implicitly in function)
  BEGIN
    -- Validate user exists and get details
    SELECT 
      id,
      first_name,
      last_name,
      email
    INTO v_user
    FROM users 
    WHERE id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'User not found',
        'user_id', p_user_id
      );
    END IF;
    
    -- Validate payment amount
    IF p_amount <= 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Payment amount must be positive',
        'user_id', p_user_id
      );
    END IF;
    
    -- Validate payment method
    IF p_payment_method NOT IN ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'online_payment', 'other') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid payment method',
        'user_id', p_user_id
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
      p_user_id,
      'credit',
      p_amount,
      'Credit payment received from ' || v_user.first_name || ' ' || v_user.last_name,
      jsonb_build_object(
        'user_id', p_user_id,
        'user_name', v_user.first_name || ' ' || v_user.last_name,
        'user_email', v_user.email,
        'transaction_type', 'credit_payment',
        'payment_method', p_payment_method,
        'payment_reference', p_payment_reference,
        'notes', p_notes
      ),
      'completed',
      NOW()
    ) RETURNING id INTO v_transaction_id;
    
    -- Create payment record (without invoice_id)
    INSERT INTO payments (
      invoice_id,
      transaction_id,
      amount,
      payment_method,
      payment_reference,
      notes
    ) VALUES (
      NULL, -- No invoice for standalone credit payment
      v_transaction_id,
      p_amount,
      p_payment_method::payment_method,
      p_payment_reference,
      p_notes
    ) RETURNING id INTO v_payment_id;
    
    -- Return success result
    RETURN jsonb_build_object(
      'success', true,
      'payment_id', v_payment_id,
      'transaction_id', v_transaction_id,
      'user_id', p_user_id,
      'user_name', v_user.first_name || ' ' || v_user.last_name,
      'amount', p_amount,
      'payment_method', p_payment_method,
      'message', 'Credit payment processed atomically'
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Any error will cause the entire transaction to rollback
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'user_id', p_user_id,
        'message', 'Credit payment processing rolled back due to error'
      );
  END;
END;
$$;

-- Add comment
COMMENT ON FUNCTION process_credit_payment_atomic IS 'Process standalone credit payment atomically without invoice. Creates transaction and payment records in single atomic operation.';

