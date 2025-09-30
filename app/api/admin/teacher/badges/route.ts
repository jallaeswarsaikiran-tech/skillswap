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

// GET: list badges. Optional ?userId= filters to one user
export async function GET(request: Request) {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.ok) return NextResponse.json({ error: adminCheck.msg }, { status: adminCheck.status });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const supabase = getSupabaseServer();
    let query = supabase.from('teacher_badges').select('id, user_id, subject, valid, issued_at').order('issued_at', { ascending: false }).limit(200);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to load badges' }, { status: 500 });
    return NextResponse.json({ badges: data || [] });
  } catch (e) {
    console.error('Admin badges GET error', e);
    return NextResponse.json({ error: 'Failed to load badges' }, { status: 500 });
  }
}

// POST: issue a badge { userId, subject }
export async function POST(request: Request) {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.ok) return NextResponse.json({ error: adminCheck.msg }, { status: adminCheck.status });

    const body = await request.json();
    const { userId, subject } = body as { userId?: string; subject?: string };
    if (!userId || !subject) return NextResponse.json({ error: 'userId and subject required' }, { status: 400 });

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('teacher_badges')
      .upsert({ user_id: userId, subject, valid: true }, { onConflict: 'user_id,subject' });
    if (error) return NextResponse.json({ error: 'Failed to issue badge' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin badges POST error', e);
    return NextResponse.json({ error: 'Failed to issue badge' }, { status: 500 });
  }
}

// PATCH: revoke a badge { userId, subject, valid?: boolean }
export async function PATCH(request: Request) {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.ok) return NextResponse.json({ error: adminCheck.msg }, { status: adminCheck.status });

    const body = await request.json();
    const { userId, subject, valid } = body as { userId?: string; subject?: string; valid?: boolean };
    if (!userId || !subject) return NextResponse.json({ error: 'userId and subject required' }, { status: 400 });

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('teacher_badges')
      .update({ valid: typeof valid === 'boolean' ? valid : false, revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('subject', subject);
    if (error) return NextResponse.json({ error: 'Failed to update badge' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin badges PATCH error', e);
    return NextResponse.json({ error: 'Failed to update badge' }, { status: 500 });
  }
}
