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

    const sessionData = {
      skill_id: skillId,
      skill_title: skill.title || '',
      teacher_id: teacherId,
      learner_id: user.id,
      teacher_name: skill.user_name || '',
      learner_name: user.user_metadata?.display_name || 'Anonymous',
      learner_message: learnerMessage || '',
      status: 'pending', // pending, accepted, declined, completed, cancelled
      scheduled_for: scheduledDate?.toISOString() || null,
      participants: [teacherId, user.id],
      price: 0, // free chatting and accepting requests
      duration: typeof duration === 'number' && duration > 0 ? duration : (skill.duration || 60),
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
    const user = await getServerSession();
    if (!user) {
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

    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionDoc.data() as {
      teacherId?: string;
      learnerId?: string;
      participants?: string[];
      price?: number;
      skillTitle?: string;
      teacherName?: string;
    } | undefined;

    // Verify user is participant
    if (!session?.participants?.includes(user.uid)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (action === 'accept' && session?.teacherId === user.uid) {
      await sessionRef.update({
        status: 'accepted',
        acceptedAt: db.FieldValue.serverTimestamp(),
        updatedAt: db.FieldValue.serverTimestamp(),
      });

      // No credit deductions
    } else if (action === 'decline' && session?.teacherId === user.uid) {
      await sessionRef.update({
        status: 'declined',
        declinedAt: db.FieldValue.serverTimestamp(),
        updatedAt: db.FieldValue.serverTimestamp(),
      });
    } else if (action === 'complete' && session?.teacherId === user.uid) {
      await sessionRef.update({
        status: 'completed',
        completedAt: db.FieldValue.serverTimestamp(),
        completionData: completionData || {},
        updatedAt: db.FieldValue.serverTimestamp(),
      });

      // Update simple stats without credits movement
      await db.collection('users').doc(session.teacherId as string).update({
        skillsTaught: db.FieldValue.increment(1),
        totalSessions: db.FieldValue.increment(1),
        updatedAt: db.FieldValue.serverTimestamp(),
      });
      await db.collection('users').doc(session.learnerId as string).update({
        skillsLearned: db.FieldValue.increment(1),
        totalSessions: db.FieldValue.increment(1),
        updatedAt: db.FieldValue.serverTimestamp(),
      });

      // Create certificate if completion data provided
      if ((completionData as { certificateEligible?: boolean } | undefined)?.certificateEligible) {
        await db.collection('certificates').add({
          userId: session.learnerId,
          skillTitle: session.skillTitle,
          teacherId: session.teacherId,
          teacherName: session.teacherName,
          sessionId,
          completedAt: db.FieldValue.serverTimestamp(),
          certificateData: completionData,
          createdAt: db.FieldValue.serverTimestamp(),
          updatedAt: db.FieldValue.serverTimestamp(),
        });
      }
    } else if (action === 'schedule') {
      // Either participant can schedule/reschedule
      let scheduledDate: Date | null = null;
      if (scheduledFor) {
        const parsed = new Date(scheduledFor as unknown as string);
        if (!isNaN(parsed.getTime())) scheduledDate = parsed;
      }
      const durationValue = typeof duration === 'number' && duration > 0 ? duration : undefined;

      const updatePayload: Record<string, unknown> = {
        updatedAt: db.FieldValue.serverTimestamp(),
      };
      if (scheduledDate) updatePayload.scheduledFor = scheduledDate;
      if (durationValue) updatePayload.duration = durationValue;

      await sessionRef.update(updatePayload);
    } else {
      return NextResponse.json({ error: 'Invalid action or unauthorized' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}