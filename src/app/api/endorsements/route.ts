import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/SupabaseServerClient";

const endorsementSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  organization_id: z.string().uuid(),
});

// GET: List all endorsements for the org
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("organization_id");
  if (!orgId) return NextResponse.json({ endorsements: [], error: "Missing organization_id" }, { status: 400 });
  const { data, error } = await supabase
    .from("endorsements")
    .select("*")
    .eq("organization_id", orgId);
  if (error) return NextResponse.json({ endorsements: [], error: error.message }, { status: 500 });
  return NextResponse.json({ endorsements: data ?? [] });
}

// POST: Create a new endorsement
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const parse = endorsementSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("endorsements")
    .insert([parse.data])
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ endorsement: data });
} 