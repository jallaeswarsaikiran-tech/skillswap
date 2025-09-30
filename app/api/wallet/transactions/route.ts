import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 });

    return NextResponse.json({ transactions: data || [] });
  } catch (e) {
    console.error('Wallet GET error', e);
    return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 });
  }
}
