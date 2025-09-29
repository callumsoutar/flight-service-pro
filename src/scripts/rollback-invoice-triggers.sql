-- ROLLBACK SCRIPT: Re-enable Invoice Triggers and Functions
-- Use this script ONLY if you need to rollback the migration

-- WARNING: This will restore the original trigger-based invoice calculation system
-- Make sure to test thoroughly after running this script

-- Step 1: Recreate the invoice calculation functions

-- Function to calculate invoice item amounts
CREATE OR REPLACE FUNCTION calculate_invoice_item_amounts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Calculate amount (before tax) - quantity * unit_price
    NEW.amount := NEW.quantity * NEW.unit_price;
    
    -- Calculate tax amount if applicable
    -- Tax rate is stored as decimal (e.g., 0.15 for 15%), not percentage
    IF NEW.tax_rate IS NOT NULL AND NEW.tax_rate > 0 THEN
        NEW.tax_amount := NEW.amount * NEW.tax_rate;
    ELSE
        NEW.tax_amount := 0;
    END IF;
    
    -- Calculate line total (amount + tax_amount)
    NEW.line_total := NEW.amount + NEW.tax_amount;
    
    -- Calculate rate_inclusive (unit_price including tax)
    -- This is the price per unit including tax
    NEW.rate_inclusive := ROUND(NEW.unit_price * (1 + COALESCE(NEW.tax_rate, 0)), 2);
    
    RETURN NEW;
END;
$$;

-- Function to update invoice totals
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_invoice_id uuid;
    v_subtotal numeric;
    v_tax_total numeric;
    v_total numeric;
BEGIN
    -- Determine which invoice to update
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;
    
    -- Calculate totals
    -- Use amount (pre-tax) for subtotal, tax_amount for tax total
    SELECT 
        COALESCE(SUM(amount), 0),  -- Changed from line_total to amount
        COALESCE(SUM(tax_amount), 0)
    INTO v_subtotal, v_tax_total
    FROM invoice_items
    WHERE invoice_id = v_invoice_id;
    
    -- Total is subtotal + tax_total
    v_total := v_subtotal + v_tax_total;
    
    -- Update invoice
    UPDATE invoices 
    SET subtotal = v_subtotal,
        tax_total = v_tax_total,
        total_amount = v_total,
        balance_due = v_total - COALESCE(total_paid, 0)
    WHERE id = v_invoice_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to set invoice number
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := generate_invoice_number();
    END IF;
    RETURN NEW;
END;
$$;

-- Function to update invoice status
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update status based on payment status
    IF NEW.paid_date IS NOT NULL THEN
        NEW.status := 'paid';
    ELSIF NEW.balance_due > 0 AND NEW.due_date < CURRENT_DATE THEN
        NEW.status := 'overdue';
    ELSIF NEW.balance_due > 0 THEN
        NEW.status := 'pending';
    ELSE
        NEW.status := 'paid';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to update balance due
CREATE OR REPLACE FUNCTION update_invoice_balance_due()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Calculate balance due based on total amount and payments
    -- Since we removed the status column from payments, all payments are considered completed
    NEW.balance_due := NEW.total_amount - COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE invoice_id = NEW.id
    ), 0);
    
    RETURN NEW;
END;
$$;

-- Transaction management functions (simplified for rollback)
CREATE OR REPLACE FUNCTION process_invoice_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_amount numeric;
BEGIN
    -- Create debit transaction when status changes to 'pending' OR 'paid' (from non-pending/paid)
    -- This handles cases where invoices go directly to 'paid' without going through 'pending'
    IF (NEW.status = 'pending' OR NEW.status = 'paid') 
       AND (OLD.status IS NULL OR (OLD.status != 'pending' AND OLD.status != 'paid')) THEN
        
        v_amount := NEW.total_amount;
        
        -- Check if a debit transaction already exists for this invoice to avoid duplicates
        IF NOT EXISTS (
            SELECT 1 FROM transactions 
            WHERE metadata->>'invoice_id' = NEW.id::text 
            AND type = 'debit'
        ) THEN
            -- Create debit transaction with POSITIVE amount (this is the key fix!)
            INSERT INTO transactions (
                user_id, type, status, amount, description, metadata, reference_number, completed_at
            ) VALUES (
                NEW.user_id, 'debit', 'completed', v_amount,  -- POSITIVE amount for debit
                'Invoice: ' || NEW.invoice_number,
                jsonb_build_object('invoice_id', NEW.id),
                NEW.invoice_number,
                CURRENT_TIMESTAMP
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION reverse_invoice_debit_transaction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete associated debit transaction when invoice is deleted or status changes
    DELETE FROM transactions 
    WHERE metadata->>'invoice_id' = COALESCE(NEW.id, OLD.id)::text
    AND type = 'debit';
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION sync_invoice_debit_transaction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_amount numeric;
BEGIN
    -- Update or create debit transaction when invoice amount changes
    v_amount := NEW.total_amount;
    
    -- Delete existing debit transaction
    DELETE FROM transactions 
    WHERE metadata->>'invoice_id' = NEW.id::text
    AND type = 'debit';
    
    -- Create new debit transaction if status is pending OR paid (consistent with process_invoice_approval)
    IF NEW.status = 'pending' OR NEW.status = 'paid' THEN
        INSERT INTO transactions (
            user_id, type, status, amount, description, metadata, reference_number, completed_at
        ) VALUES (
            NEW.user_id, 'debit', 'completed', v_amount,  -- POSITIVE amount for debit (fixed!)
            'Invoice: ' || NEW.invoice_number,
            jsonb_build_object('invoice_id', NEW.id),
            NEW.invoice_number,
            CURRENT_TIMESTAMP
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 2: Recreate all triggers

-- Triggers on invoice_items
CREATE TRIGGER calculate_invoice_item_amounts_trigger
    BEFORE INSERT OR UPDATE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION calculate_invoice_item_amounts();

CREATE TRIGGER update_invoice_totals_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

-- Triggers on invoices
CREATE TRIGGER ensure_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

CREATE TRIGGER trg_invoice_approval
    AFTER UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION process_invoice_approval();

CREATE TRIGGER trg_invoice_reverse_debit
    AFTER UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION reverse_invoice_debit_transaction();

CREATE TRIGGER trg_invoice_reverse_debit_delete
    AFTER DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION reverse_invoice_debit_transaction();

CREATE TRIGGER trg_invoice_sync_debit
    AFTER UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION sync_invoice_debit_transaction();

CREATE TRIGGER trg_update_invoice_balance_due
    AFTER UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_invoice_balance_due();

CREATE TRIGGER update_invoice_status_on_payment
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_invoice_status();

-- Log the rollback
INSERT INTO audit_logs (table_name, action, record_id, user_id, old_data, new_data, column_changes, created_at)
VALUES (
    'migration',
    'ROLLBACK_TRIGGERS',
    gen_random_uuid(),
    NULL,
    jsonb_build_object('phase', 'rollback'),
    jsonb_build_object('status', 'completed', 'timestamp', now()),
    jsonb_build_object('triggers_restored', 9, 'functions_restored', 8),
    now()
);

-- Note: No calculated_by_app columns to reset - they were removed in the clean implementation
