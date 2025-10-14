import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { SettingCategory } from '@/types/settings';

interface RouteParams {
  category: string;
}

const validCategories: SettingCategory[] = [
  'general', 'system', 'invoicing', 'notifications',
  'bookings', 'training', 'maintenance', 'security', 'memberships'
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const supabase = await createClient();
    const { category } = await params;

    // Validate category
    if (!validCategories.includes(category as SettingCategory)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // STEP 1: Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // STEP 2: Authorization - Role check using standardized pattern
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    const isAdmin = userRole && ['admin', 'owner'].includes(userRole);

    // Build query
    let query = supabase
      .from('settings')
      .select('*')
      .eq('category', category)
      .order('setting_key', { ascending: true });

    // Filter by visibility if not admin
    if (!isAdmin) {
      query = query.eq('is_public', true);
    }

    const { data: settings, error } = await query;

    if (error) {
      console.error('Settings fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    return NextResponse.json({ settings: settings || [] });
  } catch (error) {
    console.error('Settings category API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
