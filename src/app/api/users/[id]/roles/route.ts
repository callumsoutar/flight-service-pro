import { createClient } from '@/lib/SupabaseServerClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user can manage roles (admin/owner only)
    const { data: currentUserRole } = await supabase.rpc('get_user_role', { user_id: user.id });
    if (!currentUserRole || !['admin', 'owner'].includes(currentUserRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get user's current roles
    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select(`
        id,
        granted_at,
        granted_by,
        is_active,
        roles!user_roles_role_id_fkey(
          id,
          name,
          description
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching user roles:', error);
      return NextResponse.json({ error: 'Failed to fetch user roles' }, { status: 500 });
    }

    return NextResponse.json({ 
      user_id: userId,
      roles: userRoles || []
    });

  } catch (error) {
    console.error('Error in GET /api/users/[id]/roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const body = await request.json();
    const { role_name } = body;

    if (!role_name) {
      return NextResponse.json({ error: 'role_name is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user can manage roles (admin/owner only)
    const { data: currentUserRole } = await supabase.rpc('get_user_role', { user_id: user.id });
    if (!currentUserRole || !['admin', 'owner'].includes(currentUserRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get the role ID for the requested role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('name', role_name)
      .eq('is_active', true)
      .single();

    if (roleError || !role) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    // Check if user already has this role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('role_id', role.id)
      .single();

    if (existingRole) {
      if (existingRole.is_active) {
        return NextResponse.json({ error: 'User already has this role' }, { status: 409 });
      }
      
      // Reactivate existing role
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ 
          is_active: true,
          granted_by: user.id,
          granted_at: new Date().toISOString()
        })
        .eq('id', existingRole.id);

      if (updateError) {
        console.error('Error reactivating user role:', updateError);
        return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 });
      }
    } else {
      // Create new role assignment
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: role.id,
          granted_by: user.id,
          is_active: true
        });

      if (insertError) {
        console.error('Error creating user role:', insertError);
        return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      message: 'Role assigned successfully',
      role_name: role.name 
    });

  } catch (error) {
    console.error('Error in POST /api/users/[id]/roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('role_id');

    if (!roleId) {
      return NextResponse.json({ error: 'role_id parameter is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user can manage roles (admin/owner only)
    const { data: currentUserRole } = await supabase.rpc('get_user_role', { user_id: user.id });
    if (!currentUserRole || !['admin', 'owner'].includes(currentUserRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Deactivate the user role (soft delete)
    const { error } = await supabase
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .eq('is_active', true);

    if (error) {
      console.error('Error removing user role:', error);
      return NextResponse.json({ error: 'Failed to remove role' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Role removed successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/users/[id]/roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
