'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabaseAuthProvider';
import { motion } from 'framer-motion';
import { useUiLoader } from '@/app/components/UiLoaderProvider';

type UserInfo = {
  display_name?: string;
  avatar_url?: string | null;
};

export default function GlobalHeader() {
  const { isAuthenticated, signOut } = useAuth();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { show } = useUiLoader();

  useEffect(() => {
    if (!isAuthenticated) {
      setUser(null);
      return;
    }
    const load = async () => {
      try {
        const resp = await fetch('/api/users', { credentials: 'same-origin' });
        if (!resp.ok) {
          setUser(null);
          return;
        }
        const json = await resp.json();
        setUser(json?.user || null);
      } catch {
        setUser(null);
      }
    };
    void load();
  }, [isAuthenticated]);

  // Listen for profile updates from anywhere in the app to reflect name/avatar in real time
  useEffect(() => {
    const onProfileUpdate = (e: Event) => {
      // @ts-ignore custom event detail
      const detail = (e as CustomEvent)?.detail?.user || {};
      setUser((prev) => ({
        display_name: typeof detail.display_name === 'string' ? detail.display_name : (prev?.display_name ?? undefined),
        avatar_url: typeof detail.avatar_url !== 'undefined' ? detail.avatar_url : (prev?.avatar_url ?? null),
      }));
    };
    window.addEventListener('profile:update', onProfileUpdate as EventListener);
    return () => window.removeEventListener('profile:update', onProfileUpdate as EventListener);
  }, []);

  // Soft real-time: refetch user on window focus and at gentle intervals
  useEffect(() => {
    let interval: any;
    const refetch = async () => {
      if (!isAuthenticated) return;
      try {
        const resp = await fetch('/api/users', { credentials: 'same-origin' });
        if (resp.ok) {
          const json = await resp.json();
          setUser(json?.user || null);
        }
      } catch {}
    };
    const onFocus = () => { void refetch(); };
    window.addEventListener('focus', onFocus);
    // Poll every 10s to catch profile updates done elsewhere, only when authenticated
    if (isAuthenticated) {
      interval = setInterval(refetch, 10000);
    }
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Add subtle shadow/background change on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hide the global header unless the user is authenticated
  if (!isAuthenticated) {
    return null;
  }

  const name = user?.display_name || 'there';
  const avatar = user?.avatar_url || null;

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`sticky top-0 z-40 border-b border-gray-200 backdrop-blur ${scrolled ? 'bg-white/90 shadow-sm' : 'bg-white/70'}`}
    >
      {/* Animated top accent bar */}
      <motion.div
        className="h-[2px] w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ transformOrigin: 'left' }}
      />
      <div className="max-w-6xl mx-auto px-6 py-3">
        <nav className="flex justify-between items-center">
          {/* Logo mark as requested */}
          <Link href="/" className="flex items-center space-x-3 group">
            <motion.div
              whileHover={{ rotate: -4 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
              aria-label="Skill Swap Home"
            >
              <motion.div
                className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-inner"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {/* Up arrow */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up w-4 h-4 text-white absolute top-2 left-3"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>
                {/* Down arrow */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-down w-4 h-4 text-orange-400 absolute bottom-2 right-3"><path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path></svg>
              </motion.div>
            </motion.div>
            <motion.span
              className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.35 }}
            >
              Skill Swap
            </motion.span>
          </Link>

          {/* White space actions */}
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link href="/skills/create" onClick={() => show('Opening: Post Skill')} className="px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition">
                Post Skill
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link href="/skills" onClick={() => show('Opening: Browse Skills')} className="px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 transition">
                Browse Skills
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link href="/dashboard" onClick={() => show('Opening: Dashboard')} className="px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 transition">
                Dashboard
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <button
                onClick={async () => {
                  try { await signOut(); } catch {}
                  try { window.dispatchEvent(new CustomEvent('profile:update', { detail: { user: { display_name: 'there' } } })); } catch {}
                }}
                className="px-3 py-2 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-800 transition"
              >
                Sign Out
              </button>
            </motion.div>
            <Link href="/profile" onClick={() => show('Opening: Profile')} className="flex items-center gap-2 group">
              <motion.span className="text-sm text-gray-700 hidden sm:inline" whileHover={{ x: 1 }}>
                Hi {name}
              </motion.span>
              <motion.div
                className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden border-2 border-blue-200"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">U</div>
                )}
              </motion.div>
            </Link>
          </div>
        </nav>
      </div>
    </motion.header>
  );
}

