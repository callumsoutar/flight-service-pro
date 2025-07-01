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
  // Get invoice_id from query string
  const { searchParams } = new URL(req.url);
  const invoice_id = searchParams.get("invoice_id");
  if (!invoice_id) {
    return NextResponse.json({ error: "Missing invoice_id" }, { status: 400 });
  }
  // Fetch invoice_items for the invoice
  const { data, error } = await supabase
    .from("invoice_items")
    .select("id, invoice_id, chargeable_id, description, quantity, rate, rate_inclusive, amount, tax_rate, tax_amount, total_amount, created_at, updated_at")
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
    rate,
    rate_inclusive,
    amount,
    tax_rate,
    tax_amount,
    total_amount,
  } = body;
  if (!invoice_id || !description || !quantity || !rate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('invoice_items')
    .insert([
      {
        invoice_id,
        chargeable_id,
        description,
        quantity,
        rate,
        rate_inclusive,
        amount,
        tax_rate,
        tax_amount,
        total_amount,
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
  // TODO: Implement PATCH invoice_item
  return NextResponse.json({ message: "PATCH invoice_item" });
}

export async function DELETE() {
  // TODO: Implement DELETE invoice_item
  return NextResponse.json({ message: "DELETE invoice_item" });
} 