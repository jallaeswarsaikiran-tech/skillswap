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
    const { title, description, category, type, duration, price, liveLink, notes, demoLink } = data;
    const { examLink, teacherCertificateFileId, teacherCertificateFileUrl } = data as {
      examLink?: string;
      teacherCertificateFileId?: string;
      teacherCertificateFileUrl?: string;
    };

    if (!title || !description || !category || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const skillData = {
      title,
      description,
      category,
      type, // 'teaching' or 'learning'
      duration: duration || 60,
      price: typeof price === 'number' ? price : 0,
      live_link: liveLink || '',
      notes: notes || '',
      demo_link: demoLink || '',
      exam_link: examLink || '',
      teacher_certificate_file_id: teacherCertificateFileId || '',
      teacher_certificate_file_url: teacherCertificateFileUrl || '',
      user_id: user.id,
      user_name: user.user_metadata?.display_name || 'Anonymous',
      user_email: user.email,
      status: 'active',
      rating_count: 0,
      rating_sum: 0,
    };

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
    const { skillId, examLink, teacherCertificateFileId, teacherCertificateFileUrl } = data as {
      skillId?: string;
      examLink?: string;
      teacherCertificateFileId?: string;
      teacherCertificateFileUrl?: string;
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
    if (typeof examLink === 'string') updatePayload.exam_link = examLink;
    if (typeof teacherCertificateFileId === 'string') updatePayload.teacher_certificate_file_id = teacherCertificateFileId;
    if (typeof teacherCertificateFileUrl === 'string') updatePayload.teacher_certificate_file_url = teacherCertificateFileUrl;

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