import { NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET() {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ categories: [] }, { status: 401 });
  }
  
  // Fetch all categories
  const { data, error } = await supabase
    .from("cancellation_categories")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) {
    return NextResponse.json({ categories: [] }, { status: 500 });
  }
  return NextResponse.json({ categories: data ?? [] });
} 