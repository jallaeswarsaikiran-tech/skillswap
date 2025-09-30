import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) {
    throw new Error('Supabase server client not configured');
  }

  return createServerClient(url, anonKey, {
    cookies: {
      async get(name: string) {
        const jar = await cookies();
        return jar.get(name)?.value ?? '';
      },
      async set(name: string, value: string, options: Record<string, unknown>) {
        const jar = await cookies();
        jar.set({ name, value, ...options });
      },
      async remove(name: string, options: Record<string, unknown>) {
        const jar = await cookies();
        jar.set({ name, value: '', ...options });
      },
    },
  });
}


