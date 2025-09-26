import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { SettingsResponse, SettingCategory } from '@/types/settings';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as SettingCategory | null;
    const publicOnly = searchParams.get('public') === 'true';

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role authorization check using standardized pattern
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
      .order('category', { ascending: true })
      .order('setting_key', { ascending: true });

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    // Filter by visibility
    if (publicOnly || !isAdmin) {
      query = query.eq('is_public', true);
    }

    const { data: settings, error } = await query;

    if (error) {
      console.error('Settings fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    const response: SettingsResponse = {
      settings: settings || [],
      total: settings?.length || 0
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role authorization check using standardized pattern
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }

    const isAdmin = userRole && ['admin', 'owner'].includes(userRole);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { category, setting_key, setting_value, data_type, description, is_public, is_required, validation_schema } = body;

    // Validate required fields
    if (!category || !setting_key || setting_value === undefined || !data_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert new setting
    const { data: setting, error } = await supabase
      .from('settings')
      .insert({
        category,
        setting_key,
        setting_value,
        data_type,
        description,
        is_public: is_public ?? false,
        is_required: is_required ?? false,
        validation_schema,
        created_by: user.id,
        updated_by: user.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Setting already exists' }, { status: 409 });
      }
      console.error('Setting creation error:', error);
      return NextResponse.json({ error: 'Failed to create setting' }, { status: 500 });
    }

    return NextResponse.json({ setting }, { status: 201 });
  } catch (error) {
    console.error('Settings POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
