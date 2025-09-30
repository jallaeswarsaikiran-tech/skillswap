import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const type = searchParams.get('type'); // 'teaching' or 'learning'

    const supabase = getSupabaseServer();
    let query = supabase.from('skills').select('*');

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data: skills, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching skills:', error);
      return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
    }

    let filteredSkills = skills || [];

    // Additional filtering in memory for search
    if (search && search.trim() !== '') {
      const searchTerm = search.toLowerCase();
      filteredSkills = filteredSkills.filter(
        (skill) =>
          skill.title?.toLowerCase().includes(searchTerm) ||
          skill.description?.toLowerCase().includes(searchTerm) ||
          skill.category?.toLowerCase().includes(searchTerm)
      );
    }

    return NextResponse.json({ skills: filteredSkills });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const data = await request.json();
    const { title, description, category, type, price } = data as { title: string; description: string; category: string; type: 'teaching' | 'learning'; price: number };
    const { difficulty_level, duration_hours, max_students, exam_required } = data as {
      difficulty_level?: string;
      duration_hours?: number;
      max_students?: number;
      exam_required?: boolean;
    };

    if (!title || !description || !category || !type || typeof price !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // If posting a teaching skill, enforce premium plan, teacher status, and badge for subject/category
    if (type === 'teaching') {
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('plan_type, is_teacher')
        .eq('id', user.id)
        .single();
      if (userErr || !userRow) {
        return NextResponse.json({ error: 'Unable to verify user' }, { status: 500 });
      }
      if (userRow.plan_type !== 'premium') {
        return NextResponse.json({ error: 'Premium plan required to post teaching skills' }, { status: 403 });
      }
      if (!userRow.is_teacher) {
        return NextResponse.json({ error: 'Teacher access required. Submit verification first.' }, { status: 403 });
      }
      // Check subject badge using category as subject proxy
      const { data: badgesRes, error: badgeErr } = await supabase
        .from('teacher_badges')
        .select('id')
        .eq('user_id', user.id)
        .eq('subject', category)
        .eq('valid', true)
        .limit(1);
      if (badgeErr || !badgesRes || badgesRes.length === 0) {
        return NextResponse.json({ error: 'No valid teacher badge for this subject/category' }, { status: 403 });
      }
    }

    const skillData = {
      user_id: user.id,
      title,
      description,
      category,
      type, // 'teaching' or 'learning'
      price,
      difficulty_level: difficulty_level || 'beginner',
      duration_hours: typeof duration_hours === 'number' ? duration_hours : 1,
      max_students: typeof max_students === 'number' ? max_students : 10,
      current_students: 0,
      rating: 0,
      total_reviews: 0,
      exam_required: !!exam_required,
    } as const;

    const { data: newSkill, error: insertError } = await supabase
      .from('skills')
      .insert(skillData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating skill:', insertError);
      return NextResponse.json({ error: 'Failed to create skill' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: newSkill.id,
      skill: newSkill,
    });
  } catch (error) {
    console.error('Error creating skill:', error);
    return NextResponse.json({ error: 'Failed to create skill' }, { status: 500 });
  }
}

// PUT to allow owner to update examLink and teacher certificate
export async function PUT(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const data = await request.json();
    const { skillId } = data as { skillId?: string };
    const { difficulty_level, duration_hours, max_students, exam_required, price, description } = data as {
      difficulty_level?: string; duration_hours?: number; max_students?: number; exam_required?: boolean; price?: number; description?: string;
    };

    if (!skillId) {
      return NextResponse.json({ error: 'Missing skillId' }, { status: 400 });
    }

    // Check if skill exists and user owns it
    const { data: skill, error: fetchError } = await supabase
      .from('skills')
      .select('user_id')
      .eq('id', skillId)
      .single();

    if (fetchError || !skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    if (skill.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof difficulty_level === 'string') updatePayload.difficulty_level = difficulty_level;
    if (typeof duration_hours === 'number') updatePayload.duration_hours = duration_hours;
    if (typeof max_students === 'number') updatePayload.max_students = max_students;
    if (typeof exam_required === 'boolean') updatePayload.exam_required = exam_required;
    if (typeof price === 'number') updatePayload.price = price;
    if (typeof description === 'string') updatePayload.description = description;

    const { error: updateError } = await supabase
      .from('skills')
      .update(updatePayload)
      .eq('id', skillId);

    if (updateError) {
      console.error('Error updating skill:', updateError);
      return NextResponse.json({ error: 'Failed to update skill' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating skill:', error);
    return NextResponse.json({ error: 'Failed to update skill' }, { status: 500 });
  }
}