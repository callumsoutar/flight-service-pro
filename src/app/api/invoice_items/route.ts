import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/SupabaseServerClient";
import { InvoiceService } from "@/lib/invoice-service";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Get invoice_id from query string
  const { searchParams } = new URL(req.url);
  const invoice_id = searchParams.get("invoice_id");
  if (!invoice_id) {
    return NextResponse.json({ error: "Missing invoice_id" }, { status: 400 });
  }
  // Fetch invoice_items for the invoice
  const { data, error } = await supabase
    .from("invoice_items")
    .select("id, invoice_id, chargeable_id, description, quantity, unit_price, rate_inclusive, amount, tax_rate, tax_amount, line_total, notes, created_at, updated_at")
    .eq("invoice_id", invoice_id)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ invoice_items: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const {
    invoice_id,
    chargeable_id,
    description,
    quantity,
    unit_price,
    tax_rate,
  } = body;
  
  // Validate required fields
  if (!invoice_id || !description || quantity == null || unit_price == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  
  // Validate quantity
  if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
  }
  
  // Validate unit_price
  if (typeof unit_price !== 'number' || isNaN(unit_price) || unit_price < 0) {
    return NextResponse.json({ error: 'Unit price must be a non-negative number' }, { status: 400 });
  }
  
  // Validate tax_rate if provided
  if (tax_rate != null && (typeof tax_rate !== 'number' || isNaN(tax_rate) || tax_rate < 0 || tax_rate > 1)) {
    return NextResponse.json({ error: 'Tax rate must be between 0 and 1 (e.g., 0.15 for 15%)' }, { status: 400 });
  }
  
  try {
    // Get user for auth check
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check user role for admin override capability (using check_user_role_simple RPC)
    const { data: isAdmin } = await supabase
      .rpc('check_user_role_simple', {
        user_id: user?.id,
        allowed_roles: ['admin', 'owner']
      });
    
    // Check invoice status before allowing item addition
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('status, invoice_number')
      .eq('id', invoice_id)
      .single();
    
    if (invoiceError) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    // Paid invoices are immutable - cannot add items, even for admins
    if (invoice.status === 'paid') {
      return NextResponse.json({ 
        error: `Cannot add items to paid invoice ${invoice.invoice_number}. Paid invoices are immutable for compliance.`,
        invoice_status: invoice.status,
        invoice_number: invoice.invoice_number,
        hint: 'Create a credit note to adjust a paid invoice.'
      }, { status: 403 });
    }
    
    // Only allow adding items to draft invoices (unless admin/owner)
    if (invoice.status !== 'draft' && !isAdmin) {
      return NextResponse.json({ 
        error: `Cannot add items to approved invoice ${invoice.invoice_number}. Create a credit note instead.`,
        invoice_status: invoice.status,
        invoice_number: invoice.invoice_number,
        hint: 'Only draft invoices can have items added. Contact an admin if you need to modify this invoice.'
      }, { status: 400 });
    }
    
    // Log admin override
    if (isAdmin && invoice.status !== 'draft') {
      console.log(`Admin override: User ${user?.id} adding item to ${invoice.status} invoice ${invoice.invoice_number}`);
    }
    
    // Get the tax rate for this invoice item
    let finalTaxRate = tax_rate;
    if (!finalTaxRate) {
      // If chargeable_id is provided, check if the chargeable is taxable
      if (chargeable_id) {
        const { data: chargeable } = await supabase
          .from('chargeables')
          .select('is_taxable')
          .eq('id', chargeable_id)
          .single();
        
        if (chargeable && !chargeable.is_taxable) {
          // Chargeable is tax-exempt
          finalTaxRate = 0;
        } else {
          // Chargeable is taxable, use organization tax rate
          finalTaxRate = await InvoiceService.getTaxRateForInvoice();
        }
      } else {
        // No chargeable specified, check invoice's tax rate
        const { data: invoice } = await supabase
          .from('invoices')
          .select('tax_rate')
          .eq('id', invoice_id)
          .single();
        
        if (invoice?.tax_rate) {
          // Use the invoice's stored tax rate (from when it was created)
          finalTaxRate = invoice.tax_rate;
        } else {
          // Fallback to organization tax rate
          finalTaxRate = await InvoiceService.getTaxRateForInvoice();
        }
      }
    }
    
    // Calculate amounts using application logic
    const calculatedAmounts = InvoiceService.calculateItemAmounts({
      quantity,
      unit_price,
      tax_rate: finalTaxRate
    });
    
    // Insert with calculated values
    const { data, error } = await supabase
      .from('invoice_items')
      .insert([{
        invoice_id,
        chargeable_id,
        description,
        quantity,
        unit_price,
        tax_rate: finalTaxRate,
        // Application-calculated values
        amount: calculatedAmounts.amount,
        tax_amount: calculatedAmounts.tax_amount,
        line_total: calculatedAmounts.line_total,
        rate_inclusive: calculatedAmounts.rate_inclusive
      }])
      .select('id, amount, tax_amount, line_total, rate_inclusive')
      .single();
      
    if (error) {
      console.error('Invoice item creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Update parent invoice totals and sync transaction amounts
    await InvoiceService.updateInvoiceTotalsWithTransactionSync(invoice_id);
    
    return NextResponse.json({ 
      id: data.id,
      amount: data.amount,
      tax_amount: data.tax_amount,
      line_total: data.line_total,
      rate_inclusive: data.rate_inclusive
    });
  } catch (error) {
    console.error('Invoice item creation error:', error);
    return NextResponse.json({ error: 'Failed to create invoice item' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) {
    return NextResponse.json({ error: 'Missing invoice_item id' }, { status: 400 });
  }
  
  // Validate numeric fields if they're being updated
  if (fields.quantity != null && (typeof fields.quantity !== 'number' || isNaN(fields.quantity) || fields.quantity <= 0)) {
    return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
  }
  
  if (fields.unit_price != null && (typeof fields.unit_price !== 'number' || isNaN(fields.unit_price) || fields.unit_price < 0)) {
    return NextResponse.json({ error: 'Unit price must be a non-negative number' }, { status: 400 });
  }
  
  if (fields.tax_rate != null && (typeof fields.tax_rate !== 'number' || isNaN(fields.tax_rate) || fields.tax_rate < 0 || fields.tax_rate > 1)) {
    return NextResponse.json({ error: 'Tax rate must be between 0 and 1 (e.g., 0.15 for 15%)' }, { status: 400 });
  }
  
  try {
    // Get user for auth and role check
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check user role for admin override capability (using check_user_role_simple RPC)
    const { data: isAdmin } = await supabase
      .rpc('check_user_role_simple', {
        user_id: user?.id,
        allowed_roles: ['admin', 'owner']
      });
    
    // Get current item data and invoice status
    const { data: currentItem, error: fetchError } = await supabase
      .from('invoice_items')
      .select('invoice_id, quantity, unit_price, tax_rate, invoices!inner(status, invoice_number)')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!currentItem?.invoices) {
      return NextResponse.json({ error: 'Invoice not found for this item' }, { status: 404 });
    }
    
    // Extract invoice data (Supabase returns as object for many-to-one)
    const invoice = currentItem.invoices as unknown as { status: string; invoice_number: string };
    
    // Paid invoices are immutable - cannot modify items, even for admins
    if (invoice.status === 'paid') {
      return NextResponse.json({ 
        error: `Cannot modify items on paid invoice ${invoice.invoice_number}. Paid invoices are immutable for compliance.`,
        invoice_status: invoice.status,
        invoice_number: invoice.invoice_number,
        hint: 'Create a credit note to adjust a paid invoice.'
      }, { status: 403 });
    }
    
    // Only allow modifying items on draft invoices (unless admin/owner)
    if (invoice.status !== 'draft' && !isAdmin) {
      return NextResponse.json({ 
        error: `Cannot modify items on approved invoice ${invoice.invoice_number}. Create a credit note instead.`,
        invoice_status: invoice.status,
        invoice_number: invoice.invoice_number,
        hint: 'Only items on draft invoices can be modified. Contact an admin if you need to modify this invoice.'
      }, { status: 400 });
    }
    
    // Log admin override
    if (isAdmin && invoice.status !== 'draft') {
      console.log(`Admin override: User ${user?.id} modifying item on ${invoice.status} invoice ${invoice.invoice_number}`);
    }
    
    // Only allow updating certain fields
    const updatableFields = [
      'quantity', 'unit_price', 'tax_rate', 'description', 'chargeable_id', 'notes'
    ];
    const updateData: Record<string, string | number | boolean | undefined> = {};
    for (const key of updatableFields) {
      if (fields[key] !== undefined) {
        updateData[key] = fields[key];
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }
    
    // Check if we need to recalculate amounts
    const needsRecalculation = ['quantity', 'unit_price', 'tax_rate', 'chargeable_id'].some(field => 
      updateData[field] !== undefined
    );
    
    if (needsRecalculation) {
      // Use updated values or fall back to current values
      const quantity = updateData.quantity !== undefined ? updateData.quantity as number : currentItem.quantity;
      const unitPrice = updateData.unit_price !== undefined ? updateData.unit_price as number : currentItem.unit_price;
      let taxRate = updateData.tax_rate !== undefined ? updateData.tax_rate as number : currentItem.tax_rate;
      
      // If chargeable_id is being updated, determine tax rate based on chargeable
      if (updateData.chargeable_id !== undefined && !updateData.tax_rate) {
        const { data: chargeable } = await supabase
          .from('chargeables')
          .select('is_taxable')
          .eq('id', updateData.chargeable_id)
          .single();
        
        if (chargeable && !chargeable.is_taxable) {
          // Chargeable is tax-exempt
          taxRate = 0;
        } else {
          // Chargeable is taxable, use organization tax rate
          taxRate = await InvoiceService.getTaxRateForInvoice();
        }
      }
      
      // Calculate new amounts
      const calculatedAmounts = InvoiceService.calculateItemAmounts({
        quantity,
        unit_price: unitPrice,
        tax_rate: taxRate
      });
      
      // Add calculated fields to update data
      updateData.amount = calculatedAmounts.amount;
      updateData.tax_amount = calculatedAmounts.tax_amount;
      updateData.line_total = calculatedAmounts.line_total;
      updateData.rate_inclusive = calculatedAmounts.rate_inclusive;
    }
    
    const { data, error } = await supabase
      .from('invoice_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Update parent invoice totals and sync transaction amounts if amounts changed
    if (needsRecalculation) {
      await InvoiceService.updateInvoiceTotalsWithTransactionSync(currentItem.invoice_id);
    }
    
    return NextResponse.json({ invoice_item: data });
  } catch (error) {
    console.error('Invoice item update error:', error);
    return NextResponse.json({ error: 'Failed to update invoice item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { id } = body;
  
  if (!id) {
    return NextResponse.json({ error: 'Missing invoice_item id' }, { status: 400 });
  }
  
  try {
    // Get user for auth and soft delete
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check user role for admin override capability (using check_user_role_simple RPC)
    const { data: isAdmin } = await supabase
      .rpc('check_user_role_simple', {
        user_id: user.id,
        allowed_roles: ['admin', 'owner']
      });
    
    // Get item and invoice status before deleting
    const { data: item, error: fetchError } = await supabase
      .from('invoice_items')
      .select('invoice_id, invoices!inner(status, invoice_number)')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!item?.invoices) {
      return NextResponse.json({ error: 'Invoice not found for this item' }, { status: 404 });
    }
    
    // Extract invoice data (Supabase returns as object for many-to-one)
    const invoice = item.invoices as unknown as { status: string; invoice_number: string };
    
    // Paid invoices are immutable - cannot delete items, even for admins
    if (invoice.status === 'paid') {
      return NextResponse.json({ 
        error: `Cannot delete items from paid invoice ${invoice.invoice_number}. Paid invoices are immutable for compliance.`,
        invoice_status: invoice.status,
        invoice_number: invoice.invoice_number,
        hint: 'Create a credit note to adjust a paid invoice.'
      }, { status: 403 });
    }
    
    // Prevent deletion of items from approved invoices (unless admin/owner)
    if (invoice.status !== 'draft' && !isAdmin) {
      return NextResponse.json({ 
        error: `Cannot delete items from approved invoice ${invoice.invoice_number}. Create a credit note instead.`,
        invoice_status: invoice.status,
        invoice_number: invoice.invoice_number,
        hint: 'Only items on draft invoices can be deleted. Contact an admin if you need to modify this invoice.'
      }, { status: 400 });
    }
    
    // Log admin override
    if (isAdmin && invoice.status !== 'draft') {
      console.log(`Admin override: User ${user.id} deleting item from ${invoice.status} invoice ${invoice.invoice_number}`);
    }
    
    // Soft delete the item
    const { error } = await supabase
      .from('invoice_items')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', id);
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Update parent invoice totals and sync transaction amounts
    await InvoiceService.updateInvoiceTotalsWithTransactionSync(item.invoice_id);
    
    return NextResponse.json({ 
      success: true,
      soft_deleted: true,
      message: 'Invoice item has been deleted successfully'
    });
  } catch (error) {
    console.error('Invoice item deletion error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to delete invoice item'
    }, { status: 500 });
  }
} 