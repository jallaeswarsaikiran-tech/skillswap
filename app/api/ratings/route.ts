import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { sessionId, skillId, rating = 5, review = '' } = body as { sessionId?: string; skillId?: string; rating?: number; review?: string };
    if (!sessionId || !skillId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // Verify session exists and user is learner
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('learner_id, status, teacher_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.learner_id !== user.id || session.status !== 'completed') {
      return NextResponse.json({ error: 'Only learners of completed sessions can rate' }, { status: 403 });
    }

    // Prevent duplicate rating by same user for same session
    const { data: existingRatings } = await supabase
      .from('ratings')
      .select('user_id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .limit(1);

    if (existingRatings && existingRatings.length > 0) {
      return NextResponse.json({ error: 'You already rated this session' }, { status: 400 });
    }

    const ratingValue = Math.max(1, Math.min(5, rating || 5));
    const ratingDoc = {
      session_id: sessionId,
      skill_id: skillId,
      user_id: user.id,
      rating: ratingValue,
      review: review || '',
    };

    const { error: insertError } = await supabase
      .from('ratings')
      .insert(ratingDoc);

    if (insertError) {
      console.error('Error inserting rating:', insertError);
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
    }

    // Update skill aggregates
    const { error: skillUpdateError } = await supabase
      .from('skills')
      .update({
        rating_count: supabase.raw('rating_count + 1'),
        rating_sum: supabase.raw('rating_sum + ?', [ratingValue]),
        updated_at: new Date().toISOString(),
      })
      .eq('id', skillId);

    if (skillUpdateError) {
      console.error('Error updating skill rating:', skillUpdateError);
    }

    // Goodwill credit: if learner gives 1 star, credit 100 to teacher
    if (ratingValue === 1 && session.teacher_id) {
      try {
        await supabase
          .from('profiles')
          .update({
            credits: supabase.raw('credits + 100'),
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.teacher_id);
      } catch (e) {
        // Non-blocking: ignore errors in goodwill crediting
        console.error('Error crediting teacher:', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('POST /api/ratings error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
