-- Migration: Add instructor role to invoice-related RLS policies
-- This fixes the issue where instructors couldn't view/download invoices due to RLS restrictions
-- Date: 2025-01-07

-- =====================================================
-- INVOICES TABLE
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "invoices_view_all" ON public.invoices;
DROP POLICY IF EXISTS "invoices_manage" ON public.invoices;

-- Recreate policies with instructor included
CREATE POLICY "invoices_view_all" 
ON public.invoices 
FOR SELECT 
USING (
  check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role])
);

CREATE POLICY "invoices_manage" 
ON public.invoices 
FOR ALL 
USING (
  check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role])
);

COMMENT ON POLICY "invoices_view_all" ON public.invoices IS 
'Allows admin, owner, and instructor roles to view all invoices';

COMMENT ON POLICY "invoices_manage" ON public.invoices IS 
'Allows admin, owner, and instructor roles to manage all invoices';

-- =====================================================
-- INVOICE_ITEMS TABLE
-- =====================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "invoice_items_manage" ON public.invoice_items;

-- Recreate policy with instructor included
CREATE POLICY "invoice_items_manage" 
ON public.invoice_items 
FOR ALL 
USING (
  check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role])
);

COMMENT ON POLICY "invoice_items_manage" ON public.invoice_items IS 
'Allows admin, owner, and instructor roles to manage all invoice items';

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "payments_view_all" ON public.payments;
DROP POLICY IF EXISTS "payments_manage" ON public.payments;

-- Recreate policies with instructor included
CREATE POLICY "payments_view_all" 
ON public.payments 
FOR SELECT 
USING (
  check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role])
);

CREATE POLICY "payments_manage" 
ON public.payments 
FOR ALL 
USING (
  check_user_role_simple(auth.uid(), ARRAY['admin'::user_role, 'owner'::user_role, 'instructor'::user_role])
);

COMMENT ON POLICY "payments_view_all" ON public.payments IS 
'Allows admin, owner, and instructor roles to view all payments';

COMMENT ON POLICY "payments_manage" ON public.payments IS 
'Allows admin, owner, and instructor roles to manage all payments';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify the policies have been updated correctly
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies 
-- WHERE tablename IN ('invoices', 'invoice_items', 'payments')
-- ORDER BY tablename, policyname;

