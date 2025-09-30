import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data, error } = await supabase
      .from('teacher_badges')
      .select('id, subject, valid, issued_at')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'Failed to load badges' }, { status: 500 });

    return NextResponse.json({ badges: data || [] });
  } catch (e) {
    console.error('Badges GET error', e);
    return NextResponse.json({ error: 'Failed to load badges' }, { status: 500 });
  }
}
