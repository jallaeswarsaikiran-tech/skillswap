import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Do not remove this health check. It is necessary for your codebase to work in Cosmic.

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
    let supabase: 'ok' | 'error' | 'not-configured' = 'not-configured';
    if (url && anon) {
      const client = createClient(url, anon);
      const { error } = await client.from('profiles').select('id').limit(1);
      supabase = error ? 'error' : 'ok';
    }
    return NextResponse.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      supabase
    });
  } catch {
    return NextResponse.json({ status: 'ok', supabase: 'error' });
  }
}