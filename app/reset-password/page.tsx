'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [isRecovery, setIsRecovery] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Detect recovery session (when user comes from email link)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });
    // Also try once on mount, sometimes state is already set
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setIsRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const canSubmit = isRecovery && password.length >= 6 && password === confirm && !busy;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setInfo('Your password has been updated. Redirecting to sign in...');
      setTimeout(() => router.replace('/login'), 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-slate-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group" aria-label="Skill Swap Home">
              <motion.div whileHover={{ rotate: -4 }} whileTap={{ scale: 0.95 }} className="relative">
                <motion.div
                  className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-inner"
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up w-4 h-4 text-white absolute top-1.5 left-2.5"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-down w-4 h-4 text-orange-400 absolute bottom-1.5 right-2.5"><path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path></svg>
                </motion.div>
              </motion.div>
              <motion.span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.35 }}>Skill Swap</motion.span>
            </Link>
            <div className="text-sm text-gray-600">
              <Link href="/login" className="hover:text-gray-900">Back to Login</Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto px-4 sm:px-6 md:px-8 py-10">
          <div className="max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="bg-white/70 backdrop-blur rounded-xl border border-gray-200 shadow-sm p-6"
            >
              <h1 className="text-2xl font-semibold text-slate-900">Reset your password</h1>
              <p className="mt-2 text-sm text-slate-600">If you arrived here from the email link, enter a new password below.</p>

              {!isRecovery && (
                <div className="mt-4 p-3 rounded bg-yellow-50 text-sm text-yellow-800">
                  We are waiting for a recovery session. If you did not open this page from a password reset email, please request a new link.
                </div>
              )}

              <form onSubmit={handleUpdate} className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm text-slate-700">New Password</label>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700">Confirm Password</label>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                  {confirm && confirm !== password && (
                    <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
                  )}
                </div>

                {error && <div className="text-sm text-red-600">{error}</div>}
                {info && <div className="text-sm text-green-700">{info}</div>}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full rounded-md px-3 py-2 text-white text-sm font-medium transition ${canSubmit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}
                >
                  {busy ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
