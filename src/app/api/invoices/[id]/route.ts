import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { InvoiceService } from "@/lib/invoice-service";

// PATCH: Update invoice
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();

  try {
    // Check user role for admin override capability (using check_user_role_simple RPC)
    const { data: isAdmin } = await supabase
      .rpc('check_user_role_simple', {
        user_id: user.id,
        allowed_roles: ['admin', 'owner']
      });
    
    // Get current invoice status first to enforce immutability
    const { data: currentInvoice, error: statusError } = await supabase
      .from('invoices')
      .select('status, invoice_number')
      .eq('id', id)
      .single();
      
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: 500 });
    }
    
    // Paid invoices are immutable - cannot be edited by anyone, including admins
    // This is for compliance and accounting integrity
    if (currentInvoice.status === 'paid') {
      return NextResponse.json({ 
        error: `Cannot modify paid invoice ${currentInvoice.invoice_number}. Paid invoices are immutable for compliance.`,
        invoice_status: currentInvoice.status,
        invoice_number: currentInvoice.invoice_number,
        hint: 'Create a credit note to adjust a paid invoice.'
      }, { status: 403 });
    }
    
    // Determine updatable fields based on current status and user role
    let updatableFields: string[];
    
    if (isAdmin) {
      // Admins and owners can modify all fields on non-paid invoices
      updatableFields = ["reference", "issue_date", "due_date", "user_id", "notes", "status", "subtotal", "tax_total", "total_amount"];
      console.log(`Admin override: User ${user.id} modifying invoice ${currentInvoice.invoice_number} (status: ${currentInvoice.status})`);
    } else if (currentInvoice.status === 'draft') {
      // Draft invoices can update most fields
      updatableFields = ["reference", "issue_date", "due_date", "user_id", "notes", "status"];
    } else if (currentInvoice.status === 'cancelled') {
      // Cancelled invoices can update limited fields and status
      updatableFields = ["notes", "status"];
    } else {
      // Approved invoices (pending, paid, overdue) can only change status and notes
      updatableFields = ["status", "notes"];
    }
    
    // Validate that only allowed fields are being updated
    const attemptedFields = Object.keys(body);
    const disallowedFields = attemptedFields.filter(f => !updatableFields.includes(f));
    
    if (disallowedFields.length > 0 && currentInvoice.status !== 'draft' && !isAdmin) {
      return NextResponse.json({ 
        error: `Cannot modify ${disallowedFields.join(', ')} on ${currentInvoice.status} invoice ${currentInvoice.invoice_number}. Create a credit note instead.`,
        invoice_status: currentInvoice.status,
        invoice_number: currentInvoice.invoice_number,
        disallowed_fields: disallowedFields,
        allowed_fields: updatableFields,
        hint: 'Only draft invoices can be freely modified. Contact an admin if you need to modify this invoice.'
      }, { status: 400 });
    }
    
    // Build updateData only from allowed fields
    const updateData: Record<string, string | number | undefined> = {};
    for (const key of updatableFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    // Validate dates if both are being updated or need cross-validation
    if (updateData.issue_date || updateData.due_date) {
      // Get invoice dates for validation
      const { data: invoiceDates } = await supabase
        .from("invoices")
        .select("issue_date, due_date")
        .eq("id", id)
        .single();

      const issueDate = updateData.issue_date 
        ? new Date(updateData.issue_date as string) 
        : (invoiceDates?.issue_date ? new Date(invoiceDates.issue_date) : null);
      
      const dueDate = updateData.due_date 
        ? new Date(updateData.due_date as string)
        : (invoiceDates?.due_date ? new Date(invoiceDates.due_date) : null);

      // Validate that dates are valid
      if (updateData.issue_date && (!issueDate || isNaN(issueDate.getTime()))) {
        return NextResponse.json({ error: "Invalid issue_date format" }, { status: 400 });
      }
      
      if (updateData.due_date && (!dueDate || isNaN(dueDate.getTime()))) {
        return NextResponse.json({ error: "Invalid due_date format" }, { status: 400 });
      }

      // Validate that issue_date is not after due_date
      if (issueDate && dueDate && issueDate > dueDate) {
        return NextResponse.json({ 
          error: "Issue date cannot be after due date" 
        }, { status: 400 });
      }
    }
    
    // Check if status is being updated
    const statusChange = updateData.status;
    
    // If status is being changed, let InvoiceService handle it (includes transaction logic)
    if (statusChange && typeof statusChange === 'string') {
      await InvoiceService.updateInvoiceStatus(id, statusChange);
      
      // Remove status from updateData since InvoiceService already handled it
      delete updateData.status;
    }
    
    // Update other fields if any remain
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    }
    
    // Fetch and return the updated invoice
    const { data, error: fetchError } = await supabase
      .from("invoices")
      .select()
      .eq("id", id)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    return NextResponse.json({ invoice: data });
  } catch (error) {
    console.error(`Failed to update invoice ${id}:`, error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to update invoice" 
    }, { status: 500 });
  }
}

// DELETE: Soft delete invoice (only draft invoices)
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Use atomic soft delete function
    const { data: result, error } = await supabase.rpc('soft_delete_invoice', {
      p_invoice_id: id,
      p_user_id: user.id,
      p_reason: 'User initiated deletion'
    });
    
    if (error) {
      console.error('Soft delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!result.success) {
      console.warn('Soft delete failed:', result.error);
      return NextResponse.json({ 
        error: result.error,
        hint: result.hint,
        invoice_number: result.invoice_number,
        status: result.status
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      soft_deleted: true,
      invoice_number: result.invoice_number,
      items_deleted: result.items_deleted,
      message: 'Invoice has been deleted successfully'
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to delete invoice' 
    }, { status: 500 });
  }
} 