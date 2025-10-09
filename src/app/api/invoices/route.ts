import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { InvoiceService } from "@/lib/invoice-service";
import { getDefaultInvoiceDueDate } from "@/lib/settings-utils";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization - invoice access requires admin/owner role
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner', 'instructor'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Invoice access requires instructor, admin, or owner role' 
    }, { status: 403 });
  }
  
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get("id");
  const bookingId = searchParams.get("booking_id");

  let query = supabase
    .from("invoices")
    .select(`*, users:user_id(id, first_name, last_name, email)`);

  if (id) {
    query = query.eq("id", id);
  }

  if (bookingId) {
    query = query.eq("booking_id", bookingId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Invoice fetch error:', error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
  return NextResponse.json({ invoices: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization - invoice creation requires admin/owner role
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Invoice creation requires admin or owner role' 
    }, { status: 403 });
  }
  
  const body = await req.json();
  const { user_id, booking_id, status = 'draft', reference, issue_date, due_date, notes, items = [] } = body;
  
  if (!user_id) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
  }
  
  // Check if invoice already exists for this booking
  if (booking_id) {
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("id")
      .eq("booking_id", booking_id)
      .single();
      
    if (existingInvoice) {
      return NextResponse.json({ error: 'Invoice already exists for this booking' }, { status: 409 });
    }
  }
  
  try {
    // Get the organization tax rate (single-tenant: all invoices use same rate)
    const taxRate = await InvoiceService.getTaxRateForInvoice();
    
    // Get default due date if not provided
    const invoiceDueDate = due_date || await getDefaultInvoiceDueDate();
    
    // Use atomic database function to create invoice and transaction
    const { data: result, error } = await supabase.rpc('create_invoice_with_transaction', {
      p_user_id: user_id,
      p_booking_id: booking_id || null,
      p_status: status,
      p_tax_rate: taxRate,
      p_due_date: invoiceDueDate
    });
      
    if (error) {
      console.error('Invoice creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!result.success) {
      console.error('Invoice creation failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    
    // Update invoice with additional fields
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        reference: reference || null,
        issue_date: issue_date || new Date().toISOString(),
        notes: notes || null
      })
      .eq('id', result.invoice_id);
    
    if (updateError) {
      console.error('Failed to update invoice details:', updateError);
      return NextResponse.json({ error: 'Failed to update invoice details' }, { status: 500 });
    }
    
    // Create invoice items if provided
    if (items.length > 0) {
      const invoiceItems = items.map((item: { chargeable_id?: string; description: string; quantity: number; unit_price: number; tax_rate?: number | null; notes?: string }, index: number) => {
        try {
          // Use InvoiceService for currency-safe calculations
          const calculatedAmounts = InvoiceService.calculateItemAmounts({
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate ?? taxRate
          });

          return {
            invoice_id: result.invoice_id,
            chargeable_id: item.chargeable_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate ?? taxRate,
            // Application-calculated values using currency-safe arithmetic
            amount: calculatedAmounts.amount,
            tax_amount: calculatedAmounts.tax_amount,
            line_total: calculatedAmounts.line_total,
            rate_inclusive: calculatedAmounts.rate_inclusive,
            notes: item.notes || null
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown calculation error';
          throw new Error(`Failed to calculate amounts for item ${index + 1} (${item.description}): ${errorMessage}`);
        }
      });

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);
      
      if (itemsError) {
        console.error('Failed to create invoice items:', itemsError);
        return NextResponse.json({ error: 'Failed to create invoice items' }, { status: 500 });
      }
      
      // Update invoice totals
      await InvoiceService.updateInvoiceTotalsWithTransactionSync(result.invoice_id);
    }
    
    // Fetch the complete invoice to return
    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", result.invoice_id)
      .single();
      
    if (fetchError) {
      console.error('Failed to fetch created invoice:', fetchError);
      return NextResponse.json({ error: 'Invoice created but failed to fetch details' }, { status: 500 });
    }
    
    
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Invoice creation error:', error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization - invoice updates require admin/owner role
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Invoice updates require admin or owner role' 
    }, { status: 403 });
  }
  
  const body = await req.json();
  const { id, ...updateFields } = body;
  if (!id) {
    return NextResponse.json({ error: "Invoice id is required" }, { status: 400 });
  }
  
  try {
    // Get current invoice data to check status
    const { data: currentInvoice, error: statusFetchError } = await supabase
      .from("invoices")
      .select("total_amount, total_paid, due_date, paid_date, status, invoice_number")
      .eq("id", id)
      .single();
      
    if (statusFetchError) {
      return NextResponse.json({ error: statusFetchError.message }, { status: 500 });
    }
    
    // Paid invoices are immutable - only allow payment workflow fields to be updated
    // (total_paid, balance_due, paid_date, status, updated_at)
    if (currentInvoice.status === 'paid') {
      const paymentWorkflowFields = ['total_paid', 'balance_due', 'paid_date', 'status', 'updated_at'];
      const nonPaymentFields = Object.keys(updateFields).filter(f => !paymentWorkflowFields.includes(f));
      
      if (nonPaymentFields.length > 0) {
        return NextResponse.json({ 
          error: `Cannot modify ${nonPaymentFields.join(', ')} on paid invoice ${currentInvoice.invoice_number}. Paid invoices are immutable for compliance.`,
          invoice_status: currentInvoice.status,
          invoice_number: currentInvoice.invoice_number,
          disallowed_fields: nonPaymentFields,
          hint: 'Create a credit note to adjust a paid invoice.'
        }, { status: 403 });
      }
    }
    
    // Add updated timestamp
    const fieldsToUpdate = {
      ...updateFields,
      updated_at: new Date().toISOString()
    };
    
    // Handle status changes that might affect calculations
    if (updateFields.status || updateFields.total_paid !== undefined) {
      // Calculate new status if needed
      const totalAmount = fieldsToUpdate.total_amount !== undefined ? fieldsToUpdate.total_amount : currentInvoice.total_amount;
      const totalPaid = fieldsToUpdate.total_paid !== undefined ? fieldsToUpdate.total_paid : currentInvoice.total_paid;
      const dueDate = fieldsToUpdate.due_date !== undefined ? fieldsToUpdate.due_date : currentInvoice.due_date;
      const paidDate = fieldsToUpdate.paid_date !== undefined ? fieldsToUpdate.paid_date : currentInvoice.paid_date;
      
      // Auto-calculate status if not explicitly provided
      if (!updateFields.status) {
        fieldsToUpdate.status = InvoiceService.calculateInvoiceStatus(
          totalAmount,
          totalPaid,
          dueDate ? new Date(dueDate) : null,
          paidDate ? new Date(paidDate) : null
        );
      }
      
      // Auto-set paid_date if fully paid and not already set
      if (totalPaid >= totalAmount && !paidDate && !fieldsToUpdate.paid_date) {
        fieldsToUpdate.paid_date = new Date().toISOString();
      }
      
      // Calculate balance_due
      fieldsToUpdate.balance_due = totalAmount - totalPaid;
    }
    
    const { error } = await supabase
      .from("invoices")
      .update(fieldsToUpdate)
      .eq("id", id);
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Fetch and return the updated invoice
    const { data: updatedInvoice, error: updatedFetchError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();
      
    if (updatedFetchError) {
      return NextResponse.json({ error: updatedFetchError.message }, { status: 500 });
    }
    
    return NextResponse.json({ invoice: updatedInvoice });
  } catch (error) {
    console.error('Invoice update error:', error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE() {
  // TODO: Implement DELETE invoice
  return NextResponse.json({ message: "DELETE invoice" });
} 