'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

interface UiLoaderContextType {
  show: (label: string) => void;
  hide: () => void;
  visible: boolean;
  label: string;
}

const UiLoaderContext = createContext<UiLoaderContextType | undefined>(undefined);

export function UiLoaderProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState('Loading');

  const show = (l: string) => {
    setLabel(l);
    setVisible(true);
  };
  const hide = () => setVisible(false);

  // Auto-hide on route change
  useEffect(() => {
    if (!visible) return;
    // Small delay for nicer transition
    const t = setTimeout(() => setVisible(false), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const value = useMemo(() => ({ show, hide, visible, label }), [visible, label]);

  return (
    <UiLoaderContext.Provider value={value}>
      {children}
      {visible && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
                <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20"></div>
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">Please wait…</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <div className="h-3 w-3/4 rounded bg-gray-200 overflow-hidden">
                <div className="h-full w-1/2 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-gray-300 to-transparent" style={{ backgroundSize: '200% 100%' }} />
              </div>
              <div className="h-3 w-1/2 rounded bg-gray-200 overflow-hidden">
                <div className="h-full w-2/3 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-gray-300 to-transparent" style={{ backgroundSize: '200% 100%' }} />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[0,1,2].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-gray-100 overflow-hidden">
                    <div className="h-full w-1/2 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-gray-300 to-transparent" style={{ backgroundSize: '200% 100%' }} />
                  </div>
                ))}
              </div>
            </div>
            <style jsx global>{`
              @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
          </div>
        </div>
      )}
    </UiLoaderContext.Provider>
  );
}

export function useUiLoader() {
  const ctx = useContext(UiLoaderContext);
  if (!ctx) throw new Error('useUiLoader must be used within UiLoaderProvider');
  return ctx;
}
