import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

// GET: fetch current user's latest teacher verification status
export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data, error } = await supabase
      .from('teacher_verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Fetch verification error:', error);
      return NextResponse.json({ error: 'Failed to fetch verification' }, { status: 500 });
    }

    return NextResponse.json({ verification: data || null });
  } catch (e) {
    console.error('Verification GET error', e);
    return NextResponse.json({ error: 'Failed to fetch verification' }, { status: 500 });
  }
}

// POST: submit a new teacher verification request
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { certificateFileUrl, notes } = body as { certificateFileUrl?: string; notes?: string };
    if (!certificateFileUrl) return NextResponse.json({ error: 'certificateFileUrl is required' }, { status: 400 });

    // If a pending request exists, return it
    const { data: existing } = await supabase
      .from('teacher_verifications')
      .select('id,status,created_at')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();
    if (existing) return NextResponse.json({ success: true, verification: existing });

    const { data: created, error: insertError } = await supabase
      .from('teacher_verifications')
      .insert({ user_id: user.id, certificate_file_url: certificateFileUrl, notes: notes || '', status: 'pending' })
      .select()
      .single();

    if (insertError) {
      console.error('Create verification error:', insertError);
      return NextResponse.json({ error: 'Failed to submit verification' }, { status: 500 });
    }

    return NextResponse.json({ success: true, verification: created });
  } catch (e) {
    console.error('Verification POST error', e);
    return NextResponse.json({ error: 'Failed to submit verification' }, { status: 500 });
  }
}
