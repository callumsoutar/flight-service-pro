import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  const experience_type_id = searchParams.get("experience_type_id");
  const start_date = searchParams.get("start_date");
  const end_date = searchParams.get("end_date");

  if (!user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  // Build the query for experience summary
  let query = supabase
    .from("flight_experience")
    .select(`
      experience_type_id,
      duration_hours,
      created_at,
      experience_type:experience_types(name)
    `)
    .eq("user_id", user_id);

  if (experience_type_id) {
    query = query.eq("experience_type_id", experience_type_id);
  }

  if (start_date) {
    query = query.gte("created_at", start_date);
  }

  if (end_date) {
    query = query.lte("created_at", end_date);
  }

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Process the data to create summary
  interface SummaryRecord {
    experience_type: string;
    total_hours: number;
    lesson_count: number;
    first_flight: string;
    last_flight: string;
  }

  interface FlightRecord {
    experience_type: { name: string };
    duration_hours: string;
    created_at: string;
  }

  const summary = (data as unknown as FlightRecord[]).reduce((acc: Record<string, SummaryRecord>, record: FlightRecord) => {
    const typeName = (record.experience_type as unknown as { name: string }).name;
    
    if (!acc[typeName]) {
      acc[typeName] = {
        experience_type: typeName,
        total_hours: 0,
        lesson_count: 0,
        first_flight: record.created_at,
        last_flight: record.created_at,
      };
    }

    acc[typeName].total_hours += parseFloat(record.duration_hours);
    acc[typeName].lesson_count += 1;
    acc[typeName].last_flight = record.created_at;

    return acc;
  }, {});

  // Convert to array and sort by total hours
  const summaryArray = Object.values(summary).sort(
    (a: SummaryRecord, b: SummaryRecord) => b.total_hours - a.total_hours
  );

  return NextResponse.json({ data: summaryArray });
}
