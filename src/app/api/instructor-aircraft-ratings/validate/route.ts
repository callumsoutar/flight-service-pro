import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";
import { verifyInstructorTypeRating } from "@/lib/instructor-type-rating-validation";

// POST /api/instructor-aircraft-ratings/validate - Validate instructor type rating for aircraft
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { instructor_id, aircraft_id } = await req.json();
    
    if (!instructor_id || !aircraft_id) {
      return NextResponse.json({ 
        error: "instructor_id and aircraft_id are required" 
      }, { status: 400 });
    }

    const validation = await verifyInstructorTypeRating(supabase, instructor_id, aircraft_id);
    return NextResponse.json(validation);
  } catch (error) {
    console.error("Error validating instructor type rating:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

