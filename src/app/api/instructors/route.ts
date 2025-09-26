import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/SupabaseServerClient';

const InstructorSchema = z.object({
  user_id: z.string().uuid(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  rating: z.string().uuid().nullable().optional(), // Added rating field
  approved_by: z.string().uuid().nullable().optional(),
  approved_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  instructor_check_due_date: z.string().date().nullable().optional(),
  instrument_check_due_date: z.string().date().nullable().optional(),
  is_actively_instructing: z.boolean().default(false),
  class_1_medical_due_date: z.string().date().nullable().optional(),
  notes: z.string().nullable().optional(),
  employment_type: z.enum(["full_time", "part_time", "casual", "contractor"]).nullable().optional(),
  status: z.enum(["active", "inactive", "deactivated", "suspended"]).optional(),
  // Endorsement columns
  night_removal: z.boolean().default(false),
  aerobatics_removal: z.boolean().default(false),
  multi_removal: z.boolean().default(false),
  tawa_removal: z.boolean().default(false),
  ifr_removal: z.boolean().default(false),
});

// Helper function to filter sensitive instructor data for restricted users
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filterInstructorData(instructor: any) {
  if (!instructor) return instructor;
  
  return {
    id: instructor.id,
    user_id: instructor.user_id,
    first_name: instructor.first_name,
    last_name: instructor.last_name,
    is_actively_instructing: instructor.is_actively_instructing,
    status: instructor.status,
    // Endorsements for scheduling purposes
    night_removal: instructor.night_removal,
    aerobatics_removal: instructor.aerobatics_removal,
    multi_removal: instructor.multi_removal,
    tawa_removal: instructor.tawa_removal,
    ifr_removal: instructor.ifr_removal,
    // Include joined user data if present
    users: instructor.users ? {
      id: instructor.users.id,
      first_name: instructor.users.first_name,
      last_name: instructor.users.last_name,
      email: instructor.users.email
    } : null,
    // Include instructor category if present
    instructor_category: instructor.instructor_category,
    // Exclude sensitive fields: notes, medical dates, employment details, etc.
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization check
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  const isPrivilegedUser = userRole && ['instructor', 'admin', 'owner'].includes(userRole);
  const isRestrictedUser = userRole && ['member', 'student'].includes(userRole);

  // Members and students can only see basic instructor info for scheduling
  if (!isPrivilegedUser && !isRestrictedUser) {
    return NextResponse.json({ 
      error: 'Forbidden: Instructor data access requires authentication' 
    }, { status: 403 });
  }
  
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');
  const instructorId = searchParams.get('id');
  const searchQuery = searchParams.get('q');
  const activeOnly = searchParams.get('active_only');

  // Join with users table and licences table
  let query = supabase
    .from('instructors')
    .select(`
      *,
      users!instructors_user_id_fkey (
        id,
        first_name,
        last_name,
        email
      ),
      instructor_category:instructor_categories!instructors_rating_fkey (
        id,
        name,
        description,
        country
      )
    `);
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  if (instructorId) {
    query = query.eq('id', instructorId);
  }
  
  if (searchQuery) {
    // Search by instructor name using both the instructor table columns and joined users table
    query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,users.first_name.ilike.%${searchQuery}%,users.last_name.ilike.%${searchQuery}%`);
  }

  // Filter for only actively instructing instructors if requested
  if (activeOnly === 'true') {
    query = query.eq('is_actively_instructing', true);
  }

  if (userId || instructorId) {
    // Return a single instructor for this user or id
    const { data, error } = await query.single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    
    // Filter sensitive data for restricted users
    const responseData = isRestrictedUser ? filterInstructorData(data) : data;
    return NextResponse.json({ instructor: responseData }, { status: 200 });
  } else {
    // Return all instructors
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    // Filter sensitive data for restricted users
    const responseData = isRestrictedUser 
      ? (data || []).map(filterInstructorData)
      : data;
    return NextResponse.json({ instructors: responseData }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization - instructor creation requires admin/owner role
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Instructor creation requires admin or owner role' 
    }, { status: 403 });
  }
  
  const body = await req.json();
  const parse = InstructorSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase.from('instructors').insert([parse.data]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ instructor: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization - instructor updates require admin/owner role
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Instructor updates require admin or owner role' 
    }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...update } = body;
  if (!id) return NextResponse.json({ error: 'Missing instructor id' }, { status: 400 });
  const parse = InstructorSchema.partial().safeParse(update);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const { data, error } = await supabase.from('instructors').update(parse.data).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
  return NextResponse.json({ instructor: data }, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role authorization - instructor deletion requires admin/owner role
  const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
    user_id: user.id
  });

  if (roleError) {
    console.error('Error fetching user role:', roleError);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }

  if (!userRole || !['admin', 'owner'].includes(userRole)) {
    return NextResponse.json({ 
      error: 'Forbidden: Instructor deletion requires admin or owner role' 
    }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing instructor id' }, { status: 400 });
  const { error } = await supabase.from('instructors').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 200 });
} 