import { NextResponse } from 'next/server';
import { db } from 'cosmic-database';
import { getServerSession } from 'cosmic-authentication';

export async function POST(request: Request) {
  try {
    const user = await getServerSession();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { skillId } = await request.json() as { skillId?: string };
    if (!skillId) return NextResponse.json({ error: 'skillId required' }, { status: 400 });

    // Grant assistant teacher access on the skill (validation removed per requirements)
    const skillRef = db.collection('skills').doc(skillId);
    await skillRef.update({
      assistantTeachers: db.FieldValue.arrayUnion(user.uid),
      updatedAt: db.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('POST /api/skills/teacher-access error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}