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
  if (!invoice_id || !description || !quantity || !unit_price) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  
  try {
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
  
  try {
    // Get current item data
    const { data: currentItem, error: fetchError } = await supabase
      .from('invoice_items')
      .select('invoice_id, quantity, unit_price, tax_rate')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
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
    // Get invoice_id before deleting
    const { data: item, error: fetchError } = await supabase
      .from('invoice_items')
      .select('invoice_id')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    // Delete the item
    const { error } = await supabase
      .from('invoice_items')
      .delete()
      .eq('id', id);
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Update parent invoice totals and sync transaction amounts
    await InvoiceService.updateInvoiceTotalsWithTransactionSync(item.invoice_id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invoice item deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete invoice item' }, { status: 500 });
  }
} 