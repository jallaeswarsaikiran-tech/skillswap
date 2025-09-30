import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

// GET: returns today's usage and whether more usage is allowed
export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    // Load plan
    const { data: urow, error: uerr } = await supabase
      .from('users')
      .select('plan_type')
      .eq('id', user.id)
      .single();
    if (uerr) return NextResponse.json({ error: 'Failed to load plan' }, { status: 500 });

    const isPremium = (urow?.plan_type || 'free') === 'premium';
    const limit = isPremium ? null : 60; // minutes per day on free plan

    // Load today's usage
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const { data: usageRow } = await supabase
      .from('user_daily_usage')
      .select('minutes_used')
      .eq('user_id', user.id)
      .eq('usage_date', dateStr)
      .maybeSingle();

    const minutes_used = usageRow?.minutes_used || 0;
    const allowed = isPremium || minutes_used < (limit ?? Infinity);

    return NextResponse.json({ minutes_used, limit, allowed });
  } catch (e) {
    console.error('Usage GET error', e);
    return NextResponse.json({ error: 'Failed to load usage' }, { status: 500 });
  }
}

// POST: increment today's usage by `add` minutes (server-side trust; in production, compute based on session end)
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { add } = body as { add?: number };
    const addMin = typeof add === 'number' && add > 0 ? Math.floor(add) : 0;
    if (addMin <= 0) return NextResponse.json({ error: 'Invalid add minutes' }, { status: 400 });

    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    // Upsert row and increment minutes_used
    const { data: existing } = await supabase
      .from('user_daily_usage')
      .select('id, minutes_used')
      .eq('user_id', user.id)
      .eq('usage_date', dateStr)
      .maybeSingle();

    if (existing) {
      const { error: updErr } = await supabase
        .from('user_daily_usage')
        .update({ minutes_used: (existing.minutes_used || 0) + addMin, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (updErr) return NextResponse.json({ error: 'Failed to update usage' }, { status: 500 });
    } else {
      const { error: insErr } = await supabase
        .from('user_daily_usage')
        .insert({ user_id: user.id, usage_date: dateStr, minutes_used: addMin })
        .select()
        .single();
      if (insErr) return NextResponse.json({ error: 'Failed to create usage row' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Usage POST error', e);
    return NextResponse.json({ error: 'Failed to update usage' }, { status: 500 });
  }
}
