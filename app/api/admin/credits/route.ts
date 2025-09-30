import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

async function assertAdmin() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, msg: 'Authentication required' } as const;
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).single();
  const isAdmin = !!row?.is_admin;
  if (!isAdmin) return { ok: false, status: 403, msg: 'Admin only' } as const;
  return { ok: true } as const;
}

// PATCH: adjust credits for a user { userId, action: 'set'|'add'|'subtract', amount }
export async function PATCH(request: Request) {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.ok) return NextResponse.json({ error: adminCheck.msg }, { status: adminCheck.status });

    const body = await request.json();
    const { userId, action, amount } = body as { userId?: string; action?: 'set'|'add'|'subtract'; amount?: number };
    if (!userId || typeof amount !== 'number' || !['set','add','subtract'].includes(action || '')) {
      return NextResponse.json({ error: 'userId, amount, and valid action required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data: row, error: fetchErr } = await supabase.from('users').select('credits').eq('id', userId).single();
    if (fetchErr || !row) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let credits = row.credits ?? 0;
    if (action === 'set') credits = amount;
    else if (action === 'add') credits += amount;
    else if (action === 'subtract') credits -= amount;
    if (credits < 0) credits = 0;

    const { error: updErr } = await supabase.from('users').update({ credits, updated_at: new Date().toISOString() }).eq('id', userId);
    if (updErr) return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });

    return NextResponse.json({ success: true, credits });
  } catch (e) {
    console.error('Admin credits PATCH error', e);
    return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
  }
}
