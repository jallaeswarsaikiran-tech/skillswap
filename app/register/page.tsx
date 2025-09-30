'use client';

import React, { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // After sign up, sign in to create user row via /api/users
      if (data?.user) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
      }
      router.replace('/onboarding');
    } catch (e: any) {
      setError(e?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const signUpWithProvider = async (provider: 'google' | 'github') => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/onboarding` : undefined } });
      if (error) throw error;
    } catch (e: any) {
      setError(e?.message || 'Failed to start OAuth');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-md">
        <h1 className="text-xl font-semibold mb-4">Create account</h1>
        {error && <div className="mb-3 p-2 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 border rounded" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-3 py-2 border rounded" required />
          <button disabled={loading} className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{loading ? 'Creating...' : 'Register'}</button>
        </form>
        <div className="my-4 h-px bg-gray-200" />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => signUpWithProvider('google')} className="px-3 py-2 border rounded">Google</button>
          <button onClick={() => signUpWithProvider('github')} className="px-3 py-2 border rounded">GitHub</button>
        </div>
        <p className="text-sm text-gray-600 mt-4">Already have an account? <a href="/login" className="text-blue-600 underline">Sign in</a></p>
      </div>
    </div>
  );
}
