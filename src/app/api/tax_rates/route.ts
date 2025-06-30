import { NextRequest, NextResponse } from "next/server";
import { createClient } from '../../../lib/SupabaseServerClient';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const organization_id = searchParams.get('organization_id');

  let query = supabase.from('tax_rates').select('*');
  if (id) {
    query = query.eq('id', id);
  } else if (organization_id) {
    query = query.eq('organization_id', organization_id);
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ tax_rates: [], error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tax_rates: data || [] });
}

export async function POST() {
  // TODO: Implement POST tax_rate
  return NextResponse.json({ message: "POST tax_rate" });
}

export async function PATCH() {
  // TODO: Implement PATCH tax_rate
  return NextResponse.json({ message: "PATCH tax_rate" });
}

export async function DELETE() {
  // TODO: Implement DELETE tax_rate
  return NextResponse.json({ message: "DELETE tax_rate" });
} 