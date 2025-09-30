-- Phase 3: Disable Invoice Triggers and Functions
-- Run this script ONLY after verifying that application logic is working correctly

-- Step 1: Disable all invoice-related triggers
-- Invoice Items Table Triggers
DROP TRIGGER IF EXISTS calculate_invoice_item_amounts_trigger ON invoice_items;
DROP TRIGGER IF EXISTS update_invoice_totals_on_item_change ON invoice_items;

-- Invoices Table Triggers
DROP TRIGGER IF EXISTS ensure_invoice_number ON invoices;
DROP TRIGGER IF EXISTS trg_invoice_approval ON invoices;
DROP TRIGGER IF EXISTS trg_invoice_reverse_debit ON invoices;
DROP TRIGGER IF EXISTS trg_invoice_reverse_debit_delete ON invoices;
DROP TRIGGER IF EXISTS trg_invoice_sync_debit ON invoices;
DROP TRIGGER IF EXISTS trg_update_invoice_balance_due ON invoices;
DROP TRIGGER IF EXISTS update_invoice_status_on_payment ON invoices;

-- Payments Table Triggers (invoice-related)
DROP TRIGGER IF EXISTS trg_update_invoice_payment_totals_delete ON payments;
DROP TRIGGER IF EXISTS trg_update_invoice_payment_totals_insert ON payments;
DROP TRIGGER IF EXISTS trg_update_invoice_payment_totals_update ON payments;

-- Step 2: Drop all invoice-related functions
DROP FUNCTION IF EXISTS calculate_invoice_item_amounts();
DROP FUNCTION IF EXISTS update_invoice_totals();
DROP FUNCTION IF EXISTS set_invoice_number();
DROP FUNCTION IF EXISTS process_invoice_approval();
DROP FUNCTION IF EXISTS reverse_invoice_debit_transaction();
DROP FUNCTION IF EXISTS sync_invoice_debit_transaction();
DROP FUNCTION IF EXISTS update_invoice_balance_due();
DROP FUNCTION IF EXISTS update_invoice_status();
DROP FUNCTION IF EXISTS update_invoice_payment_totals();

-- Note: Keep generate_invoice_number() - it's now used by the application
-- Note: Keep the new helper functions we created (begin_transaction, etc.)

-- Log the migration
INSERT INTO audit_logs (table_name, action, record_id, user_id, old_data, new_data, column_changes, created_at)
VALUES (
    'migration',
    'DISABLE_TRIGGERS',
    gen_random_uuid(),
    NULL,
    jsonb_build_object('phase', 'trigger_removal'),
    jsonb_build_object('status', 'completed', 'timestamp', now()),
    jsonb_build_object('triggers_dropped', 12, 'functions_dropped', 9),
    now()
);
