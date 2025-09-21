import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    // If user doesn't exist in profiles table, create initial profile
    if (!profile) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          display_name: user.user_metadata?.display_name || 'Anonymous User',
          email: user.email,
          credits: 30,
          skills_learned: 0,
          skills_taught: 0,
          total_sessions: 0
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
      }

      return NextResponse.json({ user: { id: user.id, ...newProfile } });
    }

    return NextResponse.json({ user: { id: user.id, ...profile } });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const data = await request.json();
    const { action, amount } = data;

    // Get current credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    let currentCredits = profile?.credits || 30;

    if (action === 'spend') {
      if (currentCredits < amount) {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 });
      }
      currentCredits -= amount;
    } else if (action === 'earn') {
      currentCredits += amount;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: currentCredits, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating credits:', updateError);
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
    }

    return NextResponse.json({ success: true, credits: currentCredits });
  } catch (error) {
    console.error('Error updating user credits:', error);
    return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
  }
}

// PATCH to update basic profile fields like photoURL and displayName
export async function PATCH(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const data = await request.json();
    const { photoURL, displayName } = data as { photoURL?: string; displayName?: string };

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof photoURL === 'string') updatePayload.photo_url = photoURL;
    if (typeof displayName === 'string') updatePayload.display_name = displayName;

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}