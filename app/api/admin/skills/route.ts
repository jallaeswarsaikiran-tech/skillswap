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

// GET: list skills for admin with optional filters: ?search=&userId=&limit=
export async function GET(request: Request) {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.ok) return NextResponse.json({ error: adminCheck.msg }, { status: adminCheck.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const userId = searchParams.get('userId') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);

    const supabase = getSupabaseServer();
    let query = supabase.from('skills').select('*').order('created_at', { ascending: false }).limit(limit);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to load skills' }, { status: 500 });

    let skills = data || [];
    if (search) {
      skills = skills.filter((s: any) =>
        s.title?.toLowerCase().includes(search) ||
        s.description?.toLowerCase().includes(search) ||
        s.category?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ skills });
  } catch (e) {
    console.error('Admin skills GET error', e);
    return NextResponse.json({ error: 'Failed to load skills' }, { status: 500 });
  }
}

// PATCH: update a skill regardless of owner. Body: { skillId, ...fields }
export async function PATCH(request: Request) {
  try {
    const adminCheck = await assertAdmin();
    if (!adminCheck.ok) return NextResponse.json({ error: adminCheck.msg }, { status: adminCheck.status });

    const body = await request.json();
    const { skillId, ...fields } = body as { skillId?: string; [k: string]: any };
    if (!skillId) return NextResponse.json({ error: 'skillId required' }, { status: 400 });

    const allowed: Record<string, boolean> = {
      title: true,
      description: true,
      category: true,
      type: true,
      price: true,
      difficulty_level: true,
      duration_hours: true,
      max_students: true,
      exam_required: true,
      exam_link: true,
    };
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(fields)) {
      if (allowed[k]) updatePayload[k] = v;
    }
    if (Object.keys(updatePayload).length <= 1) return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });

    const supabase = getSupabaseServer();
    const { error } = await supabase.from('skills').update(updatePayload).eq('id', skillId);
    if (error) return NextResponse.json({ error: 'Failed to update skill' }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin skills PATCH error', e);
    return NextResponse.json({ error: 'Failed to update skill' }, { status: 500 });
  }
}
