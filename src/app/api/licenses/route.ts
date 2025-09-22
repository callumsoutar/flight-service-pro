import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/SupabaseServerClient";

const licenseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  is_active: z.boolean().optional().default(true),
});

// GET: List all licenses
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get('active_only') === 'true';

  let query = supabase
    .from("licenses")
    .select("*");

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order("name", { ascending: true });

  if (error) return NextResponse.json({ licenses: [], error: error.message }, { status: 500 });
  return NextResponse.json({ licenses: data ?? [] });
}

// POST: Create a new license
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const parse = licenseSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("licenses")
    .insert([parse.data])
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ license: data });
}
