import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/SupabaseServerClient';

export async function POST(request: NextRequest) {
  try {
    const { userId, newPassword } = await request.json();

    // Validate input
    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'User ID and new password are required' },
        { status: 400 }
      );
    }

    // Validate password strength (basic validation)
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Create service client with admin privileges
    const supabase = createServiceClient();

    // Update user password using Admin API
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) {
      console.error('Error updating user password:', error);
      return NextResponse.json(
        { error: 'Failed to update password', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      user: {
        id: data.user.id,
        email: data.user.email
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
