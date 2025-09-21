import { NextResponse } from 'next/server';
import { db } from 'cosmic-database';
import { getServerSession } from 'cosmic-authentication';

export async function GET(request: Request) {
  try {
    const user = await getServerSession();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const session = sessionDoc.data() as { participants?: string[]; recordings?: unknown[] } | undefined;
    if (!session?.participants?.includes(user.uid)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    return NextResponse.json({ recordings: session.recordings || [] });
  } catch (e) {
    console.error('GET /api/recordings error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getServerSession();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { sessionId, fileId, fileUrl, fileName } = body as { sessionId?: string; fileId?: string; fileUrl?: string; fileName?: string };
    if (!sessionId || !fileId || !fileUrl) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const sessionRef = db.collection('sessions').doc(sessionId);
    const doc = await sessionRef.get();
    if (!doc.exists) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const data = doc.data() as { participants?: string[] } | undefined;
    if (!data?.participants?.includes(user.uid)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const rec = {
      fileId,
      fileUrl,
      fileName: fileName || 'recording.webm',
      recordedBy: user.uid,
      recordedAt: db.FieldValue.serverTimestamp(),
    };

    await sessionRef.update({
      recordings: db.FieldValue.arrayUnion(rec),
      updatedAt: db.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, recording: rec });
  } catch (e) {
    console.error('POST /api/recordings error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
