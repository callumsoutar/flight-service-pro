import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/SupabaseServerClient';
import { SettingCategory } from '@/types/settings';

interface RouteParams {
  category: SettingCategory;
  key: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const supabase = await createClient();
    const { category, key } = await params;

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
    const query = supabase
      .from('settings')
      .select('*')
      .eq('category', category)
      .eq('setting_key', key)
      .single();

    const { data: setting, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
      }
      console.error('Setting fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch setting' }, { status: 500 });
    }

    // Check if user can access this setting
    if (!setting.is_public && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ setting });
  } catch (error) {
    console.error('Setting API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const supabase = await createClient();
    const { category, key } = await params;
    
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
    const { setting_value } = body;

    if (setting_value === undefined) {
      return NextResponse.json({ error: 'Setting value is required' }, { status: 400 });
    }

    // Update setting
    const { data: setting, error } = await supabase
      .from('settings')
      .update({
        setting_value,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('category', category)
      .eq('setting_key', key)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
      }
      console.error('Setting update error:', error);
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
    }

    return NextResponse.json({ setting });
  } catch (error) {
    console.error('Setting PUT API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const supabase = await createClient();
    const { category, key } = await params;
    
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

    // Check if setting is required
    const { data: existingSetting } = await supabase
      .from('settings')
      .select('is_required')
      .eq('category', category)
      .eq('setting_key', key)
      .single();

    if (existingSetting?.is_required) {
      return NextResponse.json({ error: 'Cannot delete required setting' }, { status: 400 });
    }

    // Delete setting
    const { error } = await supabase
      .from('settings')
      .delete()
      .eq('category', category)
      .eq('setting_key', key);

    if (error) {
      console.error('Setting delete error:', error);
      return NextResponse.json({ error: 'Failed to delete setting' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Setting DELETE API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
