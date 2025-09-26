import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/SupabaseServerClient";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const examId = searchParams.get("id");

  let query = supabase.from("exam").select("*").is("voided_at", null);
  if (examId) {
    query = query.eq("id", examId);
    const { data, error } = await query.single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ exam: data });
  }

  const { data, error } = await query
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ exams: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, syllabus_id, passing_score, is_active } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (passing_score < 0 || passing_score > 100) {
      return NextResponse.json({ error: "Passing score must be between 0 and 100" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("exam")
      .insert([{
        name,
        description: description || null,
        syllabus_id: syllabus_id || null,
        passing_score: passing_score ?? 70,
        is_active: is_active ?? true
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exam: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, description, syllabus_id, passing_score, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (passing_score < 0 || passing_score > 100) {
      return NextResponse.json({ error: "Passing score must be between 0 and 100" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("exam")
      .update({
        name,
        description: description || null,
        syllabus_id: syllabus_id || null,
        passing_score: passing_score ?? 70,
        is_active: is_active ?? true,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({ exam: data[0] });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const examId = searchParams.get("id");

  if (!examId) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Check if the record exists and is not already voided
  const { data: existingRecord, error: fetchError } = await supabase
    .from("exam")
    .select("voided_at")
    .eq("id", examId)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  if (existingRecord.voided_at) {
    return NextResponse.json({ error: "Exam is already voided" }, { status: 400 });
  }

  // Soft delete by setting voided_at timestamp
  const { data, error } = await supabase
    .from("exam")
    .update({
      voided_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", examId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ exam: data });
}