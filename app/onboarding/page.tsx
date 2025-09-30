'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    // Optional: set a hint for the dashboard to open profile tab in future
    try { localStorage.setItem('openProfileOnLoad', '1'); } catch {}
    router.replace('/dashboard');
  }, [router]);

  return null;
}
