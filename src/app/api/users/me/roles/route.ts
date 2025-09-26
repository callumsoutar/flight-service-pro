import { createClient } from '@/lib/SupabaseServerClient';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the existing get_user_role function to get the user's primary role
    const { data: userRole, error } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (error) {
      console.error('Error fetching user role:', error);
      return NextResponse.json({ error: 'Failed to fetch user role' }, { status: 500 });
    }

    console.log('API Debug - User role fetched:', { userRole, userId: user.id });

    return NextResponse.json({
      user_id: user.id,
      role: userRole || 'member' // Default to member if no role found
    });

  } catch (error) {
    console.error('Error in GET /api/users/me/roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}