'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '../../lib/SupabaseBrowserClient';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  remember: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
  };

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
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1 w-full text-left">Sign in to your account</h1>
        <p className="text-gray-700 mb-6 w-full text-left">Welcome back! Please enter your details below.</p>
        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-900" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 transition text-gray-900 bg-white placeholder-gray-400 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter your email"
            />
            {errors.email && <p className="text-red-600 text-xs mt-1 font-medium">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-900" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 transition text-gray-900 bg-white placeholder-gray-400 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter your password"
            />
            {errors.password && <p className="text-red-600 text-xs mt-1 font-medium">{errors.password.message}</p>}
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-900">
              <input type="checkbox" {...register('remember')} className="accent-violet-600" />
              Remember me
            </label>
            <a href="#" className="text-violet-700 hover:underline font-semibold">Forgot Password?</a>
          </div>
          {error && <p className="text-red-600 text-xs text-center font-medium">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-violet-700 text-white font-semibold rounded-lg shadow-md hover:bg-violet-800 transition focus:ring-2 focus:ring-violet-400 focus:outline-none"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-900 mt-6">
          Don&apos;t have an account?{' '}
          <a href="#" className="text-violet-700 hover:underline font-semibold">Sign Up</a>
        </p>
      </div>
    </div>
  );
} 