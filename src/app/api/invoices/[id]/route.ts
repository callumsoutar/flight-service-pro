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

  // Allow updating these fields
  const updatableFields = [
    "reference", "issue_date", "due_date", "user_id", "notes", "status"
  ];
  const updateData: Record<string, string | number | undefined> = {};
  for (const key of updatableFields) {
    if (body[key] !== undefined) {
      updateData[key] = body[key];
    }
  }
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  try {
    // Check if status is being updated
    const statusChange = updateData.status;
    
    // If status is being changed, let InvoiceService handle it (includes transaction logic)
    if (statusChange && typeof statusChange === 'string') {
      console.log(`Invoice ${id} status changed to: ${statusChange}`);
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

// DELETE: Delete invoice
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
} 