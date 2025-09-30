import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

// GET: fetch current user's plan status
export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data: row, error } = await supabase
      .from('users')
      .select('plan_type, credits, is_teacher, is_admin')
      .eq('id', user.id)
      .single();
    if (error) return NextResponse.json({ error: 'Failed to load plan' }, { status: 500 });

    return NextResponse.json({ plan: row?.plan_type || 'free', credits: row?.credits ?? 0, is_teacher: !!row?.is_teacher, is_admin: !!row?.is_admin });
  } catch (e) {
    console.error('Plan GET error', e);
    return NextResponse.json({ error: 'Failed to load plan' }, { status: 500 });
  }
}

// POST: upgrade/downgrade plan (demo; in production tie to payment provider webhook)
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { plan } = body as { plan?: 'free' | 'premium' };
    if (plan !== 'free' && plan !== 'premium') return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

    const updates: Record<string, unknown> = { plan_type: plan, updated_at: new Date().toISOString() };
    if (plan === 'premium') {
      // optionally grant credits on upgrade
      updates.credits = 200; // welcome credits
    }

    const { error: updErr } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);
    if (updErr) return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });

    return NextResponse.json({ success: true, plan });
  } catch (e) {
    console.error('Plan POST error', e);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}
