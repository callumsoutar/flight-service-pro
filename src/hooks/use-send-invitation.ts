import { useState } from 'react';

interface SendInvitationOptions {
  redirectTo?: string;
}

export function useSendInvitation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendInvitation = async (userId: string, options: SendInvitationOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirectTo: options.redirectTo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendInvitation,
    loading,
    error,
    clearError: () => setError(null),
  };
}
