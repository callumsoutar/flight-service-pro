"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/SupabaseBrowserClient';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function AcceptInvitePageContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Handle both query parameters and hash fragments
  const token = searchParams.get('token') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.substring(1)).get('access_token') : null);
  const type = searchParams.get('type') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.substring(1)).get('type') : null);
  
  // Check for error parameters
  const urlError = searchParams.get('error') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.substring(1)).get('error') : null);
  const errorCode = searchParams.get('error_code') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.substring(1)).get('error_code') : null);
  const errorDescription = searchParams.get('error_description') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.substring(1)).get('error_description') : null);

  const verifyInvitation = useCallback(async () => {
    if (!token) return;

    try {
      const supabase = createClient();

      // Check if we have an access token (from hash fragment)
      if (token.startsWith('eyJ')) {
        // This is a JWT access token, we need to set the session
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          console.log('Setting session with tokens...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          console.log('Session set result:', { data: !!data.user, error });

          if (error || !data.user) {
            console.error('Session setup failed:', error);
            setError('Invalid or expired invitation link.');
            setIsVerifying(false);
            return;
          }

          setUserEmail(data.user.email || '');
          setIsVerifying(false);
          return;
        } else {
          setError('Invalid invitation link format.');
          setIsVerifying(false);
          return;
        }
      }

      // Otherwise, verify as OTP token (invite or recovery)
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as 'invite' | 'recovery'
      });

      if (error) {
        setError('Invalid or expired invitation link.');
        setIsVerifying(false);
        return;
      }

      if (data.user) {
        setUserEmail(data.user.email || '');
        setIsVerifying(false);
      }
    } catch {
      setError('Failed to verify invitation.');
      setIsVerifying(false);
    }
  }, [token, type]);

  useEffect(() => {
    console.log('Invitation page loaded with:', {
      token: token?.substring(0, 20) + '...',
      type,
      urlError,
      errorCode,
      errorDescription,
      hash: typeof window !== 'undefined' ? window.location.hash : 'N/A',
      fullUrl: typeof window !== 'undefined' ? window.location.href : 'N/A'
    });

    // Handle error cases first
    if (urlError) {
      if (errorCode === 'otp_expired') {
        setError('This invitation link has expired. Please request a new invitation from your administrator.');
      } else {
        setError(`Invitation error: ${errorDescription || urlError}`);
      }
      setIsVerifying(false);
      return;
    }

    if (token && (type === 'invite' || type === 'signup' || type === 'recovery')) {
      // Verify the invitation token and get user info
      verifyInvitation();
    } else {
      setError('Invalid invitation link.');
      setIsVerifying(false);
    }
  }, [token, type, urlError, errorCode, errorDescription, verifyInvitation]);

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set up account. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-700 via-violet-500 to-blue-400">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 md:p-10 flex flex-col items-center border border-gray-200">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="h-12 w-12 text-violet-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2 text-gray-900">Verifying Invitation</h2>
          <p className="text-gray-600 text-center">
            Please wait while we verify your invitation...
          </p>
        </div>
      </div>
    );
  }

  if (!token || (type !== 'invite' && type !== 'recovery')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-700 via-violet-500 to-blue-400">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 md:p-10 flex flex-col items-center border border-gray-200">
          <div className="flex items-center justify-center mb-4">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2 text-gray-900">Invalid Invitation</h2>
          <p className="text-gray-600 text-center mb-6">
            {error || 'This invitation link is invalid or has expired.'}
          </p>
          {errorCode === 'otp_expired' && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Invitation links expire after 1 hour for security reasons.
              </p>
              <button
                onClick={() => window.location.href = '/login'}
                className="px-4 py-2 bg-violet-700 text-white rounded-lg hover:bg-violet-800 transition"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-700 via-violet-500 to-blue-400">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 md:p-10 flex flex-col items-center border border-gray-200">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2 text-gray-900">
            {type === 'recovery' ? 'Password Set Successfully!' : 'Account Setup Complete!'}
          </h2>
          <p className="text-gray-600 text-center">
            {type === 'recovery' 
              ? 'Your password has been set successfully. Redirecting to dashboard...'
              : 'Your account has been set up successfully. Redirecting to dashboard...'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-700 via-violet-500 to-blue-400">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 md:p-10 flex flex-col items-center border border-gray-200">
        {/* Branding */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-700 to-blue-400 flex items-center justify-center">
            <span className="text-white text-lg font-bold">A</span>
          </div>
          <span className="text-xl font-bold text-violet-700 tracking-tight">Aero Safety</span>
        </div>
        
        {/* Heading */}
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1 w-full text-left">
          {type === 'recovery' ? 'Set Your Password' : 'Set Up Your Account'}
        </h1>
        <p className="text-gray-700 mb-6 w-full text-left">
          {userEmail 
            ? `Welcome! ${type === 'recovery' ? 'Set up your password for' : 'You\'ve been invited to join Aero Safety. Set up your password for'} ${userEmail}` 
            : `Welcome! ${type === 'recovery' ? 'Set up your password below.' : 'You\'ve been invited to join Aero Safety. Set up your password below.'}`
          }
        </p>
        
        {/* Form */}
        <form onSubmit={handleAcceptInvitation} className="w-full space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-900" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 transition text-gray-900 bg-white placeholder-gray-400 ${error && !password ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter your password"
              required
              minLength={6}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-900" htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 transition text-gray-900 bg-white placeholder-gray-400 ${error && !confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Confirm your password"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <XCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-violet-700 text-white font-semibold rounded-lg shadow-md hover:bg-violet-800 transition focus:ring-2 focus:ring-violet-400 focus:outline-none"
            disabled={loading || !userEmail}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting up account...
              </div>
            ) : (
              type === 'recovery' ? 'Set Password' : 'Complete Setup & Join Platform'
            )}
          </button>
        </form>
        
        <p className="text-center text-sm text-gray-900 mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-violet-700 hover:underline font-semibold">Sign In</a>
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-700 via-violet-500 to-blue-400">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 md:p-10 flex flex-col items-center border border-gray-200">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="h-12 w-12 text-violet-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2 text-gray-900">Loading...</h2>
          <p className="text-gray-600 text-center">
            Please wait while we load your invitation...
          </p>
        </div>
      </div>
    }>
      <AcceptInvitePageContent />
    </Suspense>
  );
}
