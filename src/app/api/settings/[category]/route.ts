import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { SettingCategory } from '@/types/settings';

interface RouteParams {
  category: SettingCategory;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const supabase = await createClient();
    const { category } = await params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin for private settings
    const { data: userRole } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles (name)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roles = userRole?.roles as any;
    const roleName = Array.isArray(roles) ? roles[0]?.name : roles?.name;
    const isAdmin = roleName === 'admin' || roleName === 'owner';

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
