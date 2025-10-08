-- ============================================
-- Migration: Remove fee_paid column from memberships
-- ============================================
--
-- This migration removes the fee_paid column from the memberships table.
-- Payment status is now determined by checking the linked invoice status.
--
-- BEFORE RUNNING:
-- 1. Ensure all code is updated to use invoices.status instead of fee_paid
-- 2. Verify the API is joining invoice data in membership queries
-- 3. Test thoroughly that payment status displays correctly
--
-- HOW TO RUN:
-- Run this migration AFTER deploying the code changes that reference
-- invoices.status instead of fee_paid.
--
-- ============================================

-- Drop the fee_paid column from memberships table
ALTER TABLE memberships DROP COLUMN IF EXISTS fee_paid;

-- Drop the amount_paid column as well (also redundant with invoice data)
ALTER TABLE memberships DROP COLUMN IF EXISTS amount_paid;

-- Add comment to invoice_id column to clarify its purpose
COMMENT ON COLUMN memberships.invoice_id IS 'Foreign key to invoices table. Payment status determined by invoice.status (paid = membership paid).';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after the migration to verify:

-- 1. Check that columns are dropped
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'memberships'
-- AND column_name IN ('fee_paid', 'amount_paid');
-- (Should return 0 rows)

-- 2. Verify invoice status can be queried
-- SELECT m.id, m.invoice_id, i.status as payment_status
-- FROM memberships m
-- LEFT JOIN invoices i ON m.invoice_id = i.id
-- LIMIT 5;

-- 3. Check for any memberships without invoices (if needed, create invoices for them)
-- SELECT id, user_id, membership_type_id, invoice_id
-- FROM memberships
-- WHERE invoice_id IS NULL
-- AND is_active = true;
