import { createServiceClient } from '@/lib/SupabaseServerClient';

/**
 * Admin utility functions for user management
 * These functions require service role privileges
 */

export interface UpdatePasswordResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
  };
  error?: string;
}

/**
 * Update a user's password using Supabase Admin API
 * Also automatically confirms the user's email if not already confirmed
 * @param userId - The user's UUID
 * @param newPassword - The new password
 * @param autoConfirmEmail - Whether to automatically confirm the email (default: true)
 * @returns Promise<UpdatePasswordResult>
 */
export async function updateUserPassword(
  userId: string, 
  newPassword: string,
  autoConfirmEmail: boolean = true
): Promise<UpdatePasswordResult> {
  try {
    // Validate input
    if (!userId || !newPassword) {
      return {
        success: false,
        error: 'User ID and new password are required'
      };
    }

    // Validate password strength (basic validation)
    if (newPassword.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters long'
      };
    }

    // Create service client with admin privileges
    const supabase = createServiceClient();

    // Update user password and confirm email using Admin API
    // Setting email_confirm to true bypasses the email verification requirement
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
      ...(autoConfirmEmail && { email_confirm: true })
    });

    if (error) {
      console.error('Error updating user password:', error);
      return {
        success: false,
        error: `Failed to update password: ${error.message}`
      };
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || ''
      }
    };

  } catch (error) {
    console.error('Unexpected error updating password:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

/**
 * Confirm a user's email without requiring them to click a verification link
 * This is useful for manually verifying users or migrating from other systems
 * @param userId - The user's UUID
 * @returns Promise<UpdatePasswordResult>
 */
export async function confirmUserEmail(userId: string): Promise<UpdatePasswordResult> {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required'
      };
    }

    const supabase = createServiceClient();

    // Confirm the user's email using Admin API
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true
    });

    if (error) {
      console.error('Error confirming user email:', error);
      return {
        success: false,
        error: `Failed to confirm email: ${error.message}`
      };
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || ''
      }
    };

  } catch (error) {
    console.error('Unexpected error confirming email:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

/**
 * Get user information by ID
 * @param userId - The user's UUID
 * @returns Promise with user data or error
 */
export async function getUserById(userId: string) {
  try {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      user: data.user
    };
  } catch (error) {
    console.error('Error getting user:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}
