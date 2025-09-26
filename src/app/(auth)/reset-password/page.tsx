"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  const verifyResetToken = useCallback(async () => {
    if (!token) return;

    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery'
      });

      if (error) {
        setError('Invalid or expired reset link.');
        return;
      }

      if (data.user) {
        setUserEmail(data.user.email || '');
      }
    } catch {
      setError('Failed to verify reset link.');
    }
  }, [token]);

  useEffect(() => {
    if (token && type === 'recovery') {
      // Verify the reset token and get user info
      verifyResetToken();
    }
  }, [token, type, verifyResetToken]);

  const handleResetPassword = async (e: React.FormEvent) => {
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
      const supabase = await createClient();
      
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      toast.success('Password set successfully! You can now sign in with your email and password.');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set password. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!token || type !== 'recovery') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-700 via-violet-500 to-blue-400">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 md:p-10 flex flex-col items-center border border-gray-200">
          <div className="flex items-center justify-center mb-4">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2 text-gray-900">Invalid Reset Link</h2>
          <p className="text-gray-600 text-center">
            This password reset link is invalid or has expired.
          </p>
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
          <h2 className="text-xl font-semibold text-center mb-2 text-gray-900">Password Set Successfully!</h2>
          <p className="text-gray-600 text-center">
            Your password has been set. Redirecting to dashboard...
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
          {userEmail ? 'Set Your Password' : 'Reset Password'}
        </h1>
        <p className="text-gray-700 mb-6 w-full text-left">
          {userEmail 
            ? `Set up your password for ${userEmail}` 
            : 'Setting up your password...'
          }
        </p>
        
        {/* Form */}
        <form onSubmit={handleResetPassword} className="w-full space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-900" htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 transition text-gray-900 bg-white placeholder-gray-400 ${error && !password ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter your new password"
              required
              minLength={6}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-900" htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 transition text-gray-900 bg-white placeholder-gray-400 ${error && !confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Confirm your new password"
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
                Setting password...
              </div>
            ) : (
              'Set Password'
            )}
          </button>
        </form>
        
        <p className="text-center text-sm text-gray-900 mt-6">
          Remember your password?{' '}
          <a href="/login" className="text-violet-700 hover:underline font-semibold">Sign In</a>
        </p>
      </div>
    </div>
  );
}
