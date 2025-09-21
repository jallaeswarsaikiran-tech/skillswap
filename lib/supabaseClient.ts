import { createBrowserClient } from '@supabase/ssr';

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anonKey) {
    throw new Error('Supabase client not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const cookieUtils = {
    // Modern API required by @supabase/ssr
    getAll(): { name: string; value: string }[] {
      if (typeof document === 'undefined') return [];
      const pairs = document.cookie ? document.cookie.split('; ') : [];
      return pairs
        .map((p) => {
          const idx = p.indexOf('=');
          const name = idx >= 0 ? p.slice(0, idx) : p;
          const value = idx >= 0 ? p.slice(idx + 1) : '';
          return { name, value: decodeURIComponent(value) };
        })
        .filter((c) => c.name);
    },
    setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]) {
      if (typeof document === 'undefined') return;
      for (const c of cookies) {
        const opts = c.options || {};
        const parts = [
          `${c.name}=${encodeURIComponent(c.value)}`,
          opts['path'] ? `path=${opts['path']}` : 'path=/',
          opts['domain'] ? `domain=${opts['domain']}` : undefined,
          opts['maxAge'] ? `max-age=${opts['maxAge'] as number}` : undefined,
          opts['expires'] ? `expires=${(opts['expires'] as Date).toUTCString()}` : undefined,
          opts['secure'] ? 'Secure' : undefined,
          opts['sameSite'] ? `SameSite=${opts['sameSite'] as string}` : 'SameSite=Lax',
        ].filter(Boolean);
        document.cookie = parts.join('; ');
      }
    },
    // Back-compat API also supported
    get(name: string): string {
      if (typeof document === 'undefined') return '';
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : '';
    },
    set(name: string, value: string, options?: Record<string, unknown>) {
      this.setAll([{ name, value, options }]);
    },
    remove(name: string, options?: Record<string, unknown>) {
      this.setAll([{ name, value: '', options: { ...(options || {}), expires: new Date(0) } }]);
    },
  } as const;

  return createBrowserClient(url, anonKey, {
    cookies: cookieUtils,
  });
}


