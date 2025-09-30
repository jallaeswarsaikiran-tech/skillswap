import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get sessions where user is either teacher or learner
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .or(`teacher_id.eq.${user.id},learner_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let data: unknown;
    try {
      data = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (typeof data !== 'object' || data === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { skillId, teacherId, learnerMessage, scheduledFor, duration } = data as {
      skillId?: string;
      teacherId?: string;
      learnerMessage?: string;
      scheduledFor?: string | number | Date | null;
      duration?: number | null;
    };

    if (!skillId || !teacherId) {
      return NextResponse.json({ error: 'Missing required fields: skillId, teacherId' }, { status: 400 });
    }

    // Get skill details
    const { data: skill, error: skillError } = await supabase
      .from('skills')
      .select('*')
      .eq('id', skillId)
      .single();

    if (skillError || !skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    // No credit checks; sessions are free to request and accept

    // Parse scheduled date if provided
    let scheduledDate: Date | null = null;
    if (scheduledFor) {
      const parsed = new Date(scheduledFor as unknown as string);
      if (!isNaN(parsed.getTime())) {
        scheduledDate = parsed;
      }
    }

    // Determine duration in minutes based on skill.duration_hours or default 60
    const durationMinutes = typeof (skill as any).duration_hours === 'number' && (skill as any).duration_hours > 0
      ? Math.round((skill as any).duration_hours * 60)
      : (typeof duration === 'number' && duration > 0 ? duration : 60);

    const sessionData = {
      skill_id: skillId,
      skill_title: skill.title || '',
      teacher_id: teacherId,
      learner_id: user.id,
      learner_message: learnerMessage || '',
      status: 'pending', // pending, accepted, declined, completed, cancelled
      scheduled_for: scheduledDate?.toISOString() || null,
      price: 0,
      duration: durationMinutes,
    };

    const { data: newSession, error: insertError } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating session:', insertError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sessionId: newSession.id,
      session: newSession,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    let data: unknown;
    try {
      data = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (typeof data !== 'object' || data === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { sessionId, action, completionData, scheduledFor, duration } = data as {
      sessionId?: string;
      action?: 'accept' | 'decline' | 'complete' | 'schedule';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      completionData?: any;
      scheduledFor?: string | number | Date | null;
      duration?: number | null;
    };

    if (!sessionId || !action) {
      return NextResponse.json({ error: 'Missing required fields: sessionId, action' }, { status: 400 });
    }

    // Load session
    const { data: sess, error: sErr } = await supabase
      .from('sessions')
      .select('id, teacher_id, learner_id')
      .eq('id', sessionId)
      .single();
    if (sErr || !sess) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Verify participant
    const isTeacher = sess.teacher_id === user.id;
    const isLearner = sess.learner_id === user.id;
    if (!isTeacher && !isLearner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (action === 'accept') {
      if (!isTeacher) return NextResponse.json({ error: 'Only teacher can accept' }, { status: 403 });
      updates.status = 'accepted';
      updates.accepted_at = new Date().toISOString();
    } else if (action === 'decline') {
      if (!isTeacher) return NextResponse.json({ error: 'Only teacher can decline' }, { status: 403 });
      updates.status = 'declined';
      updates.declined_at = new Date().toISOString();
    } else if (action === 'complete') {
      if (!isTeacher) return NextResponse.json({ error: 'Only teacher can complete' }, { status: 403 });
      updates.status = 'completed';
      updates.completed_at = new Date().toISOString();
      // Stats can be updated asynchronously in a cron/job; for now we keep it simple
    } else if (action === 'schedule') {
      // Either participant can schedule/reschedule
      let scheduledDate: Date | null = null;
      if (scheduledFor) {
        const parsed = new Date(scheduledFor as unknown as string);
        if (!isNaN(parsed.getTime())) scheduledDate = parsed;
      }
      if (scheduledDate) updates.scheduled_for = scheduledDate.toISOString();
      if (typeof duration === 'number' && duration > 0) updates.duration = duration;
      updates.status = 'scheduled';
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { error: uErr } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId);
    if (uErr) return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}