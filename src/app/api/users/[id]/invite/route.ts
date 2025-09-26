import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/SupabaseServerClient";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user has permission to invite users (admin or owner role required)
  const { data: hasPermission } = await supabase
    .rpc('check_user_role_simple', {
      user_id: user.id,
      allowed_roles: ['admin', 'owner']
    });

  if (!hasPermission) {
    return NextResponse.json({ error: "Insufficient permissions to invite users" }, { status: 403 });
  }

  // Use service client for admin operations
  const serviceSupabase = createServiceClient();
  
  await req.json();
  const { id: userId } = await params;

  // Get user details
  const { data: userData, error: userError } = await serviceSupabase
    .from("users")
    .select("email, first_name, last_name")
    .eq("id", userId)
    .single();

  if (userError || !userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // First, try to send invitation (this will work for new users)
    console.log(`Attempting to send invitation to: ${userData.email}`);
    const { data: inviteData, error: inviteError } = await serviceSupabase.auth.admin.inviteUserByEmail(
      userData.email,
      {
        data: {
          first_name: userData.first_name,
          last_name: userData.last_name,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/invite/accept`
      }
    );

    if (inviteError) {
      // If invitation fails because user already exists, try password reset instead
      if (inviteError.message.includes('already been registered') || inviteError.code === 'email_exists') {
        console.log(`User already exists, sending password reset instead: ${userData.email}`);
        const { data: resetData, error: resetError } = await serviceSupabase.auth.admin.generateLink({
          type: 'recovery',
          email: userData.email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/invite/accept`
          }
        });

        if (resetError) {
          console.error('Password reset error:', resetError);
          return NextResponse.json({ 
            error: `Failed to send invitation: ${resetError.message}` 
          }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true,
          message: `Invitation resent to ${userData.email}. They will receive an email to set up their account and password.`,
          user: resetData.user
        });
      } else {
        // Some other error occurred
        console.error('Invitation error:', inviteError);
        return NextResponse.json({ 
          error: `Failed to send invitation: ${inviteError.message}` 
        }, { status: 500 });
      }
    }

    // Invitation was successful
    return NextResponse.json({ 
      success: true,
      message: `Invitation sent to ${userData.email}. They will receive an invitation email to set up their account and password.`,
      user: inviteData.user
    });

  } catch (error) {
    console.error('Unexpected error sending invitation:', error);
    return NextResponse.json({ 
      error: "An unexpected error occurred while sending the invitation" 
    }, { status: 500 });
  }
}
