import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/SupabaseServerClient";

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
  // Get current organization from cookie
  const currentOrgId = req.cookies.get("current_org_id")?.value;
  if (!currentOrgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }
  // Check for booking_id filter
  const { searchParams } = new URL(req.url);
  const booking_id = searchParams.get("booking_id");
  let query = supabase
    .from("invoices")
    .select(`*, users:user_id(id, first_name, last_name, email)`);
  query = query.eq("organization_id", currentOrgId);
  if (booking_id) {
    query = query.eq("booking_id", booking_id);
  }
  query = query.order("issue_date", { ascending: false });
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ invoices: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { organization_id, user_id, booking_id, status = 'draft' } = body;
  if (!organization_id || !user_id) {
    return NextResponse.json({ error: 'Missing organization_id or user_id' }, { status: 400 });
  }
  // Generate invoice number (simple: INV-YYYYMMDD-HHMMSS)
  const now = new Date();
  const invoice_number = `INV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
  const issue_date = now.toISOString().slice(0, 10);
  const due_date = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // +14 days
  const { data, error } = await supabase
    .from('invoices')
    .insert([
      {
        organization_id,
        user_id,
        booking_id: booking_id || null,
        invoice_number,
        issue_date,
        due_date,
        status,
        subtotal: 0,
        tax_amount: 0,
        tax_rate: 0.15,
        total_amount: 0,
      },
    ])
    .select('id')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}

export async function PATCH() {
  // TODO: Implement PATCH invoice
  return NextResponse.json({ message: "PATCH invoice" });
}

export async function DELETE() {
  // TODO: Implement DELETE invoice
  return NextResponse.json({ message: "DELETE invoice" });
} 