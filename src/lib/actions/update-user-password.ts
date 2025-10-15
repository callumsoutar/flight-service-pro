'use server';

import { updateUserPassword } from '@/lib/admin/auth-utils';

/**
 * Server action to update a user's password
 * This can be called from React components or API routes
 */
export async function updateUserPasswordAction(
  userId: string, 
  newPassword: string
) {
  const result = await updateUserPassword(userId, newPassword);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update password');
  }
  
  return result;
}
