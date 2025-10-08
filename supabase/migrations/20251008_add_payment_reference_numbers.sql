-- =====================================================
-- Migration: Add Payment Reference Number System
-- =====================================================
-- Date: October 8, 2025
-- Description: Add auto-generated payment reference numbers
--              similar to invoice numbering system
-- =====================================================

BEGIN;

-- 1. Create payment_sequences table
CREATE TABLE IF NOT EXISTS payment_sequences (
  year_month TEXT PRIMARY KEY,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_payment_sequences_year_month ON payment_sequences(year_month);

COMMENT ON TABLE payment_sequences IS 'Tracks sequential payment numbers by year-month for auto-generation';

-- Enable RLS
ALTER TABLE payment_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view payment sequences"
  ON payment_sequences FOR SELECT
  TO authenticated
  USING (true);

-- 2. Add payment_number column to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_number TEXT;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_payment_number_unique 
ON payments(payment_number) 
WHERE payment_number IS NOT NULL;

COMMENT ON COLUMN payments.payment_number IS 'Auto-generated unique payment reference number (e.g., PAY-2025-10-0001). Distinct from user-provided payment_reference field.';

-- 3. Create payment number generation function
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year_month TEXT;
  v_sequence INTEGER;
  v_payment_number TEXT;
BEGIN
  v_year_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  INSERT INTO payment_sequences (year_month, last_sequence)
  VALUES (v_year_month, 1)
  ON CONFLICT (year_month)
  DO UPDATE SET 
    last_sequence = payment_sequences.last_sequence + 1,
    updated_at = NOW()
  RETURNING last_sequence INTO v_sequence;
  
  v_payment_number := 'PAY-' || v_year_month || '-' || LPAD(v_sequence::TEXT, 4, '0');
  
  RETURN v_payment_number;
END;
$$;

COMMENT ON FUNCTION generate_payment_number IS 'Generate unique sequential payment number in format PAY-YYYY-MM-XXXX';

-- 4. Backfill existing payments with payment numbers
-- Note: This runs once to give existing payments reference numbers
DO $$
DECLARE
  payment_record RECORD;
  new_payment_number TEXT;
BEGIN
  FOR payment_record IN 
    SELECT id, created_at 
    FROM payments 
    WHERE payment_number IS NULL 
    ORDER BY created_at ASC
  LOOP
    new_payment_number := generate_payment_number();
    UPDATE payments 
    SET payment_number = new_payment_number 
    WHERE id = payment_record.id;
  END LOOP;
END $$;

-- 5. Update process_credit_payment_atomic function
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
  v_payment_number TEXT;
  v_result JSONB;
BEGIN
  BEGIN
    SELECT 
      id, first_name, last_name, email
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
    
    IF p_amount <= 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Payment amount must be positive',
        'user_id', p_user_id
      );
    END IF;
    
    IF p_payment_method NOT IN ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'online_payment', 'other') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid payment method',
        'user_id', p_user_id
      );
    END IF;
    
    -- Generate payment number
    v_payment_number := generate_payment_number();
    
    INSERT INTO transactions (
      user_id, type, amount, description, metadata, status, completed_at
    ) VALUES (
      p_user_id, 'credit', p_amount,
      'Credit payment received from ' || v_user.first_name || ' ' || v_user.last_name,
      jsonb_build_object(
        'user_id', p_user_id,
        'user_name', v_user.first_name || ' ' || v_user.last_name,
        'user_email', v_user.email,
        'transaction_type', 'credit_payment',
        'payment_method', p_payment_method,
        'payment_reference', p_payment_reference,
        'payment_number', v_payment_number,
        'notes', p_notes
      ),
      'completed', NOW()
    ) RETURNING id INTO v_transaction_id;
    
    INSERT INTO payments (
      invoice_id, transaction_id, amount, payment_method, 
      payment_reference, payment_number, notes
    ) VALUES (
      NULL, v_transaction_id, p_amount, p_payment_method::payment_method,
      p_payment_reference, v_payment_number, p_notes
    ) RETURNING id INTO v_payment_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'payment_id', v_payment_id,
      'payment_number', v_payment_number,
      'transaction_id', v_transaction_id,
      'user_id', p_user_id,
      'user_name', v_user.first_name || ' ' || v_user.last_name,
      'amount', p_amount,
      'payment_method', p_payment_method,
      'message', 'Credit payment ' || v_payment_number || ' processed atomically'
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'user_id', p_user_id,
        'message', 'Credit payment processing rolled back due to error'
      );
  END;
END;
$$;

-- 6. Update process_payment_atomic function (invoice payments)
CREATE OR REPLACE FUNCTION process_payment_atomic(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice RECORD;
  v_payment_id UUID;
  v_transaction_id UUID;
  v_payment_number TEXT;
  v_remaining_balance NUMERIC;
  v_new_status TEXT;
  v_new_total_paid NUMERIC;
  v_total_credits NUMERIC;
  v_new_balance_due NUMERIC;
BEGIN
  BEGIN
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
    
    IF p_amount <= 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Payment amount must be positive',
        'invoice_id', p_invoice_id
      );
    END IF;
    
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_total_credits
    FROM credit_notes
    WHERE original_invoice_id = p_invoice_id
      AND status = 'applied'
      AND deleted_at IS NULL;
    
    SELECT COALESCE(v_invoice.total_amount - COALESCE(SUM(amount), 0) - v_total_credits, v_invoice.total_amount - v_total_credits)
    INTO v_remaining_balance
    FROM payments
    WHERE invoice_id = p_invoice_id;
    
    IF p_amount > ROUND(v_remaining_balance, 2) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Payment amount exceeds remaining balance',
        'remaining_balance', ROUND(v_remaining_balance, 2),
        'invoice_id', p_invoice_id
      );
    END IF;
    
    -- Generate payment number
    v_payment_number := generate_payment_number();
    
    INSERT INTO transactions (
      user_id, type, amount, description, metadata, status, completed_at
    ) VALUES (
      v_invoice.user_id, 'credit', p_amount,
      'Payment for invoice: ' || v_invoice.invoice_number,
      jsonb_build_object(
        'invoice_id', p_invoice_id,
        'invoice_number', v_invoice.invoice_number,
        'payment_number', v_payment_number,
        'transaction_type', 'payment_credit'
      ),
      'completed', NOW()
    ) RETURNING id INTO v_transaction_id;
    
    INSERT INTO payments (
      invoice_id, transaction_id, amount, payment_method,
      payment_reference, payment_number, notes
    ) VALUES (
      p_invoice_id, v_transaction_id, p_amount, p_payment_method::payment_method,
      p_payment_reference, v_payment_number, p_notes
    ) RETURNING id INTO v_payment_id;
    
    SELECT COALESCE(SUM(amount), 0)
    INTO v_new_total_paid
    FROM payments
    WHERE invoice_id = p_invoice_id;
    
    v_new_balance_due := ROUND(v_invoice.total_amount - v_new_total_paid - v_total_credits, 2);
    
    UPDATE invoices 
    SET 
      total_paid = ROUND(v_new_total_paid, 2),
      balance_due = v_new_balance_due,
      updated_at = NOW()
    WHERE id = p_invoice_id;
    
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
    
    RETURN jsonb_build_object(
      'success', true,
      'payment_id', v_payment_id,
      'payment_number', v_payment_number,
      'transaction_id', v_transaction_id,
      'invoice_id', p_invoice_id,
      'invoice_number', v_invoice.invoice_number,
      'new_status', v_new_status,
      'remaining_balance', v_remaining_balance,
      'total_paid', ROUND(v_new_total_paid, 2),
      'total_credits', v_total_credits,
      'message', 'Payment ' || v_payment_number || ' processed atomically'
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'invoice_id', p_invoice_id,
        'message', 'Payment processing rolled back due to error'
      );
  END;
END;
$$;

COMMIT;

-- Verification queries
SELECT 'Payment sequences table created:' as status, COUNT(*) as count FROM payment_sequences;
SELECT 'Payments with payment_number:' as status, COUNT(*) as count FROM payments WHERE payment_number IS NOT NULL;
SELECT 'Sample payment numbers:' as status, payment_number, amount, created_at FROM payments ORDER BY created_at DESC LIMIT 5;

