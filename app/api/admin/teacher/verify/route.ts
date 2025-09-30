import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

// NOTE: In a production app, protect this route with RLS or an admin check.
// Here we perform a simple check against users.is_admin (add this flag if you want).
async function assertAdmin() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, msg: 'Authentication required' };
  const { data: row } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  const isAdmin = !!row?.is_admin;
  if (!isAdmin) return { ok: false, status: 403, msg: 'Admin only' };
  return { ok: true };
}

// GET: list pending verifications
export async function GET() {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.ok) return NextResponse.json({ error: adminCheck.msg }, { status: adminCheck.status });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('teacher_verifications')
      .select('id, user_id, certificate_file_url, notes, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: 'Failed to fetch verifications' }, { status: 500 });

    return NextResponse.json({ verifications: data || [] });
  } catch (e) {
    console.error('Admin verify GET error', e);
    return NextResponse.json({ error: 'Failed to fetch verifications' }, { status: 500 });
  }
}

// PATCH: approve/deny a teacher verification
export async function PATCH(request: Request) {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.ok) return NextResponse.json({ error: adminCheck.msg }, { status: adminCheck.status });

    const supabase = getSupabaseServer();
    const body = await request.json();
    const { id, status, reviewedBy, subject } = body as { id?: string; status?: 'approved' | 'denied'; reviewedBy?: string; subject?: string };
    if (!id || (status !== 'approved' && status !== 'denied')) {
      return NextResponse.json({ error: 'id and valid status required' }, { status: 400 });
    }

    const { data: row, error: fetchErr } = await supabase
      .from('teacher_verifications')
      .select('id,user_id,status')
      .eq('id', id)
      .single();
    if (fetchErr || !row) return NextResponse.json({ error: 'Verification not found' }, { status: 404 });

    const { error: updErr } = await supabase
      .from('teacher_verifications')
      .update({ status, reviewed_by: reviewedBy || null, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (updErr) return NextResponse.json({ error: 'Failed to update verification' }, { status: 500 });

    if (status === 'approved') {
      const { error: userErr } = await supabase
        .from('users')
        .update({ is_teacher: true, updated_at: new Date().toISOString() })
        .eq('id', row.user_id);
      if (userErr) return NextResponse.json({ error: 'Failed to grant teacher role' }, { status: 500 });

      // Optionally issue a subject-specific badge
      const badgeSubject = (subject || '').trim();
      if (badgeSubject) {
        const { error: badgeErr } = await supabase
          .from('teacher_badges')
          .upsert({ user_id: row.user_id, subject: badgeSubject, valid: true }, { onConflict: 'user_id,subject' });
        if (badgeErr) return NextResponse.json({ error: 'Approved but failed to issue badge' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin verify PATCH error', e);
    return NextResponse.json({ error: 'Failed to update verification' }, { status: 500 });
  }
}
