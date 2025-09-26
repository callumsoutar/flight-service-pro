import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { getTaxRateForUser } from "@/lib/tax-rates";

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

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Invoice access requires admin or owner role' 
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
  const { user_id, booking_id, status = 'draft' } = body;
  
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
    // Get the appropriate tax rate for this user
    const taxRate = await getTaxRateForUser(user_id);
    
    // Create invoice with correct single-tenant schema fields
    const { data, error } = await supabase
      .from("invoices")
      .insert([{
        user_id,
        booking_id,
        status,
        tax_rate: taxRate,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        subtotal: 0,
        tax_total: 0,
        total_amount: 0,
        total_paid: 0,
        balance_due: 0,
      }])
      .select()
      .single();
      
    if (error) {
      console.error('Invoice creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
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
  
  const { error } = await supabase
    .from("invoices")
    .update(updateFields)
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Fetch and return the updated invoice
  const { data: updatedInvoice, error: fetchError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  return NextResponse.json({ invoice: updatedInvoice });
}

export async function DELETE() {
  // TODO: Implement DELETE invoice
  return NextResponse.json({ message: "DELETE invoice" });
} 