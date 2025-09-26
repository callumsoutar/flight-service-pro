import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { public_directory_opt_in } = body;

  if (typeof public_directory_opt_in !== 'boolean') {
    return NextResponse.json({ error: "public_directory_opt_in must be a boolean" }, { status: 400 });
  }

  // Update the current user's public directory opt-in status
  const { data, error } = await supabase
    .from("users")
    .update({ public_directory_opt_in })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating public directory opt-in:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true,
    public_directory_opt_in: data.public_directory_opt_in 
  });
}

export async function GET() {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the current user's public directory opt-in status
  const { data, error } = await supabase
    .from("users")
    .select("public_directory_opt_in")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error('Error fetching public directory opt-in:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    public_directory_opt_in: data.public_directory_opt_in 
  });
}
