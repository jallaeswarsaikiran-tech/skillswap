import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

// POST: enroll current user into a published course – deduct credits and create ledger row
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { courseId } = body as { courseId?: string };
    if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 });

    // Load course
    const { data: course, error: cErr } = await supabase
      .from('courses')
      .select('id, teacher_id, price_credits, status')
      .eq('id', courseId)
      .single();
    if (cErr || !course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (course.status !== 'published') return NextResponse.json({ error: 'Course not published' }, { status: 400 });

    // Load learner
    const { data: me, error: uErr } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();
    if (uErr || !me) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const price = course.price_credits || 0;
    if (price > 0 && (me.credits ?? 0) < price) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }

    // Create enrollment or return if exists
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('course_id', courseId)
      .eq('learner_id', user.id)
      .maybeSingle();
    if (existing) return NextResponse.json({ success: true, enrollment: existing });

    // Deduct credits and insert wallet transaction in parallel-ish (but ensure success)
    if (price > 0) {
      const { error: updErr } = await supabase
        .from('users')
        .update({ credits: (me.credits || 0) - price, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (updErr) return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 });

      const { error: ledErr } = await supabase
        .from('wallet_transactions')
        .insert({ user_id: user.id, type: 'enroll_spend', amount: price, ref_type: 'course', ref_id: courseId });
      if (ledErr) return NextResponse.json({ error: 'Failed to write ledger' }, { status: 500 });
    }

    const { data: enroll, error: eErr } = await supabase
      .from('enrollments')
      .insert({ course_id: courseId, learner_id: user.id, status: 'active' })
      .select()
      .single();
    if (eErr) return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });

    return NextResponse.json({ success: true, enrollment: enroll });
  } catch (e) {
    console.error('Enroll POST error', e);
    return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
  }
}

// PATCH: mark enrollment completed (teacher-only) and credit teacher's earnings
export async function PATCH(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { enrollmentId } = body as { enrollmentId?: string };
    if (!enrollmentId) return NextResponse.json({ error: 'enrollmentId required' }, { status: 400 });

    // Load enrollment + course
    const { data: enr, error: enErr } = await supabase
      .from('enrollments')
      .select('id, status, course_id, learner_id, courses!inner(id, teacher_id, price_credits)')
      .eq('id', enrollmentId)
      .single();
    if (enErr || !enr) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

    const course = (enr as any).courses as { id: string; teacher_id: string; price_credits: number };
    if (course.teacher_id !== user.id) return NextResponse.json({ error: 'Only the course teacher can complete' }, { status: 403 });
    if (enr.status === 'completed') return NextResponse.json({ success: true });

    // Mark completed
    const { error: updErr } = await supabase
      .from('enrollments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', enrollmentId);
    if (updErr) return NextResponse.json({ error: 'Failed to complete' }, { status: 500 });

    const earn = course.price_credits || 0;
    if (earn > 0) {
      // Credit teacher and ledger
      // Load teacher
      const { data: teacherRow, error: tErr } = await supabase
        .from('users')
        .select('credits')
        .eq('id', course.teacher_id)
        .single();
      if (!tErr && teacherRow) {
        await supabase
          .from('users')
          .update({ credits: (teacherRow.credits || 0) + earn, updated_at: new Date().toISOString() })
          .eq('id', course.teacher_id);
        await supabase
          .from('wallet_transactions')
          .insert({ user_id: course.teacher_id, type: 'teacher_earn', amount: earn, ref_type: 'course', ref_id: course.id });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Enroll PATCH error', e);
    return NextResponse.json({ error: 'Failed to complete enrollment' }, { status: 500 });
  }
}
