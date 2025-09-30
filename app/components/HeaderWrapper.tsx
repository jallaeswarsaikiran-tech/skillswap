'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import GlobalHeader from '@/app/components/GlobalHeader';

export default function HeaderWrapper() {
  const pathname = usePathname();

  // Hide header on the home page only
  if (pathname === '/') return null;

  return <GlobalHeader />;
}
