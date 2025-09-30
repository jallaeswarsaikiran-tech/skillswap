import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

// Simple admin elevation using a shared code (for demo). In production, replace with proper IAM or RLS policies.
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { code } = body as { code?: string };
    const expected = process.env.ADMIN_ACCESS_CODE || '';
    if (!code || !expected || code !== expected) {
      return NextResponse.json({ error: 'Invalid admin code' }, { status: 403 });
    }

    const { error: updErr } = await supabase
      .from('users')
      .update({ is_admin: true, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (updErr) return NextResponse.json({ error: 'Failed to set admin' }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin login error:', e);
    return NextResponse.json({ error: 'Failed to set admin' }, { status: 500 });
  }
}
