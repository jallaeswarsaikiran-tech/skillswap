import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get enhanced user row
    const { data: enhancedUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      // Soft fallback: return default user shape if table/select fails
      console.warn('Users fetch error, returning defaults:', userError);
      return NextResponse.json({
        user: {
          id: user.id,
          display_name: user.user_metadata?.display_name || 'Anonymous User',
          email: user.email,
          avatar_url: null,
          credits: 50,
          total_earnings: 0,
          skills_learned: 0,
          skills_taught: 0,
          total_sessions: 0,
          is_teacher: false,
          teacher_score: 0,
        }
      });
    }

    // If user doesn't exist in users table, create initial row
    if (!enhancedUser) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          display_name: user.user_metadata?.display_name || 'Anonymous User',
          avatar_url: null,
          credits: 50,
          total_earnings: 0,
          skills_learned: 0,
          skills_taught: 0,
          total_sessions: 0,
          is_teacher: false,
          teacher_score: 0,
          plan_type: 'free',
          is_admin: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user row:', insertError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      return NextResponse.json({ user: { id: user.id, ...newUser } });
    }

    return NextResponse.json({ user: { id: user.id, ...enhancedUser } });
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
    const { action, amount } = data as { action: 'spend' | 'earn'; amount: number };

    // Get current credits from users table
    const { data: usersRow, error: usersError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (usersError) {
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    let currentCredits = usersRow?.credits ?? 50;

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
      .from('users')
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

    const body = await request.json();
    // Accept both camelCase and snake_case for convenience
    const {
      avatarUrl,
      avatar_url,
      displayName,
      display_name,
      bio,
      pending_verification,
      certificate_url,
    } = body as {
      avatarUrl?: string;
      avatar_url?: string;
      displayName?: string;
      display_name?: string;
      bio?: string;
      pending_verification?: boolean;
      certificate_url?: string;
    };

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof avatarUrl === 'string') updatePayload.avatar_url = avatarUrl;
    if (typeof avatar_url === 'string') updatePayload.avatar_url = avatar_url;
    if (typeof displayName === 'string') updatePayload.display_name = displayName;
    if (typeof display_name === 'string') updatePayload.display_name = display_name;
    if (typeof bio === 'string') updatePayload.bio = bio;
    if (typeof pending_verification === 'boolean') updatePayload.pending_verification = pending_verification;
    if (typeof certificate_url === 'string') updatePayload.certificate_url = certificate_url;

    if (Object.keys(updatePayload).length <= 1) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile (first attempt):', updateError);
      // Fallback: retry with minimal safe payload to avoid column errors in environments
      const minimalPayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof avatarUrl === 'string') minimalPayload.avatar_url = avatarUrl;
      if (typeof avatar_url === 'string') minimalPayload.avatar_url = avatar_url;
      if (typeof displayName === 'string') minimalPayload.display_name = displayName;
      if (typeof display_name === 'string') minimalPayload.display_name = display_name;

      const { error: retryError } = await supabase
        .from('users')
        .update(minimalPayload)
        .eq('id', user.id);

      if (retryError) {
        console.error('Error updating profile (retry attempt):', retryError);
        return NextResponse.json({ error: 'Failed to update profile', details: retryError.message || String(retryError) }, { status: 500 });
      }
      // fetch updated user
      const { data: updatedUserRetry } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      return NextResponse.json({ success: true, warning: 'Updated with minimal payload due to schema mismatch', user: updatedUserRetry ?? null });
    }

    // fetch updated user
    const { data: updatedUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!updatedUser) {
      // If no row existed, create it with an upsert using available fields
      const upsertPayload: Record<string, unknown> = {
        id: user.id,
        email: user.email,
        updated_at: new Date().toISOString(),
      };
      if (typeof avatarUrl === 'string') upsertPayload.avatar_url = avatarUrl;
      if (typeof avatar_url === 'string') upsertPayload.avatar_url = avatar_url;
      if (typeof displayName === 'string') upsertPayload.display_name = displayName;
      if (typeof display_name === 'string') upsertPayload.display_name = display_name;
      // Avoid including optional fields like bio/certificate to prevent schema mismatch during fallback upsert

      const { data: upserted, error: upsertErr } = await supabase
        .from('users')
        .upsert(upsertPayload, { onConflict: 'id' })
        .select('*')
        .single();
      if (upsertErr) {
        console.error('Error upserting user profile:', upsertErr);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }
      return NextResponse.json({ success: true, user: upserted });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}