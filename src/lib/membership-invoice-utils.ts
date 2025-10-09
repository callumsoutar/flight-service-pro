import { createClient } from '@/lib/SupabaseServerClient';
import { InvoiceService } from '@/lib/invoice-service';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Parameters for creating a membership invoice
 */
export interface CreateMembershipInvoiceParams {
  userId: string;
  membershipTypeId: string;
  membershipTypeName: string;
  membershipTypeCode: string;
  expiryDate: Date;
}

/**
 * Result of membership invoice creation
 */
export interface CreateMembershipInvoiceResult {
  invoiceId: string;
  invoiceNumber: string | null;
}

/**
 * Create an invoice for a membership (new or renewal)
 *
 * This function:
 * 1. Finds or creates a chargeable for the membership type
 * 2. Creates an invoice with a single line item for the membership fee
 * 3. Links the invoice to the membership for payment tracking
 *
 * @param params - Membership and pricing information
 * @returns Invoice ID and number, or null if creation fails
 */
export async function createMembershipInvoice(
  params: CreateMembershipInvoiceParams
): Promise<CreateMembershipInvoiceResult | null> {
  const supabase = await createClient();

  try {
    // 1. Get or create chargeable for this membership type
    const chargeableId = await getOrCreateMembershipChargeable(
      supabase,
      params.membershipTypeCode
    );

    if (!chargeableId) {
      throw new Error('Failed to get or create chargeable for membership type');
    }

    // 2. Get organization tax rate
    const taxRate = await InvoiceService.getTaxRateForInvoice();

    // 3. Calculate due date (earlier of expiry date or 30 days from now)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const dueDate = params.expiryDate < thirtyDaysFromNow
      ? params.expiryDate
      : thirtyDaysFromNow;

    // 4. Get the chargeable rate (which should be tax-inclusive)
    const { data: chargeable } = await supabase
      .from('chargeables')
      .select('rate')
      .eq('id', chargeableId)
      .single();

    if (!chargeable) {
      throw new Error('Chargeable not found');
    }

    // 5. Calculate invoice item amounts using InvoiceService
    // Note: chargeable.rate is tax-inclusive, so we need to calculate tax-exclusive amount
    const taxInclusiveRate = parseFloat(chargeable.rate);
    const taxExclusiveRate = taxInclusiveRate / (1 + taxRate);
    
    const itemAmounts = InvoiceService.calculateItemAmounts({
      quantity: 1,
      unit_price: taxExclusiveRate,
      tax_rate: taxRate
    });

    // 5. Create invoice
    const { data: result, error } = await supabase.rpc('create_invoice_with_transaction', {
      p_user_id: params.userId,
      p_booking_id: null,
      p_status: 'pending',
      p_tax_rate: taxRate,
      p_due_date: dueDate.toISOString()
    });

    if (error || !result.success) {
      throw new Error(result?.error || error?.message || 'Failed to create invoice');
    }

    // 6. Update invoice with reference and notes
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        reference: `MEMBERSHIP-${params.membershipTypeCode.toUpperCase()}`,
        issue_date: new Date().toISOString(),
        notes: `Membership fee for ${params.membershipTypeName}`
      })
      .eq('id', result.invoice_id);

    if (updateError) {
      console.error('Failed to update invoice details:', updateError);
    }

    // 7. Create invoice item
    const invoiceItems = [{
      invoice_id: result.invoice_id,
      chargeable_id: chargeableId,
      description: `${params.membershipTypeName} Membership Fee`,
      quantity: 1,
      unit_price: taxExclusiveRate,
      tax_rate: taxRate,
      amount: itemAmounts.amount,
      tax_amount: itemAmounts.tax_amount,
      line_total: itemAmounts.line_total,
      rate_inclusive: itemAmounts.rate_inclusive,
    }];

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems);

    if (itemsError) {
      console.error('Failed to create invoice items:', itemsError);
      throw new Error('Failed to create invoice items');
    }

    // 8. Update invoice totals
    await InvoiceService.updateInvoiceTotalsWithTransactionSync(result.invoice_id);

    // 9. Fetch invoice number
    const { data: invoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('id', result.invoice_id)
      .single();

    return {
      invoiceId: result.invoice_id,
      invoiceNumber: invoice?.invoice_number || null
    };

  } catch (error) {
    console.error('Error creating membership invoice:', error);
    return null;
  }
}

/**
 * Get existing or create new chargeable for a membership type
 *
 * @param supabase - Supabase client
 * @param membershipTypeCode - Code of the membership type (e.g., "flying_member")
 * @param membershipTypeName - Display name of the membership type
 * @returns Chargeable ID or null if operation fails
 */
async function getOrCreateMembershipChargeable(
  supabase: SupabaseClient,
  membershipTypeCode: string
): Promise<string | null> {
  try {
    // 1. Get the membership_fee chargeable type ID
    const { data: chargeableType, error: typeError } = await supabase
      .from('chargeable_types')
      .select('id')
      .eq('code', 'membership_fee')
      .single();

    if (typeError || !chargeableType) {
      console.error('membership_fee chargeable type not found:', typeError);
      return null;
    }

    // 2. Look for existing active chargeable with this membership type code
    const { data: existingChargeable } = await supabase
      .from('chargeables')
      .select('id')
      .eq('chargeable_type_id', chargeableType.id)
      .eq('name', membershipTypeCode)
      .eq('is_active', true)
      .maybeSingle();

    if (existingChargeable) {
      return existingChargeable.id;
    }

    // 3. If not found, this is an error - chargeables should be pre-created
    console.error(`No active chargeable found for membership type: ${membershipTypeCode}`);
    return null;

  } catch (error) {
    console.error('Error in getOrCreateMembershipChargeable:', error);
    return null;
  }
}
