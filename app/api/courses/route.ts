import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

// GET: list courses with optional filters OR fetch single by id
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const subject = searchParams.get('subject');
    const teacherId = searchParams.get('teacherId');
    const search = searchParams.get('search');
    const status = searchParams.get('status') || 'published';

    if (id) {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      return NextResponse.json({ course: data });
    }

    let query = supabase.from('courses').select('*');

    if (subject) query = query.eq('subject', subject);
    if (teacherId) query = query.eq('teacher_id', teacherId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });

    let rows = data || [];
    if (search && search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((r) => r.title?.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s));
    }

    return NextResponse.json({ courses: rows });
  } catch (e) {
    console.error('Courses GET error', e);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

// POST: create a new course (teacher + badge required; premium plan)
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { subject, title, description, price_credits } = body as {
      subject?: string; title?: string; description?: string; price_credits?: number;
    };

    if (!subject || !title || typeof price_credits !== 'number' || price_credits < 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check user status & badges
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('plan_type, is_teacher')
      .eq('id', user.id)
      .single();
    if (userErr || !userRow) return NextResponse.json({ error: 'Unable to verify user' }, { status: 500 });
    if (userRow.plan_type !== 'premium') return NextResponse.json({ error: 'Premium plan required' }, { status: 403 });
    if (!userRow.is_teacher) return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });

    const { data: badge } = await supabase
      .from('teacher_badges')
      .select('id')
      .eq('user_id', user.id)
      .eq('subject', subject)
      .eq('valid', true)
      .maybeSingle();
    if (!badge) return NextResponse.json({ error: 'No valid teacher badge for this subject' }, { status: 403 });

    const { data: row, error: insErr } = await supabase
      .from('courses')
      .insert({ teacher_id: user.id, subject, title, description: description || '', price_credits, status: 'draft' })
      .select()
      .single();
    if (insErr) return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });

    return NextResponse.json({ success: true, course: row });
  } catch (e) {
    console.error('Courses POST error', e);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
