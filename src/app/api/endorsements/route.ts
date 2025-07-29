import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/SupabaseServerClient";

const endorsementSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// GET: List all endorsements
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("endorsements")
    .select("*");
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