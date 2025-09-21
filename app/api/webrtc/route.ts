import { NextResponse } from 'next/server';
import { db } from 'cosmic-database';
import { getServerSession } from 'cosmic-authentication';

interface SDP {
  type: 'offer' | 'answer';
  sdp: string;
}

export async function GET(request: Request) {
  try {
    const user = await getServerSession();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    // Verify participant
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    const session = sessionDoc.data() as { participants?: string[] } | undefined;
    if (!session?.participants?.includes(user.uid)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const webrtcDoc = await db.collection('webrtcRooms').doc(sessionId).get();
    if (!webrtcDoc.exists) {
      return NextResponse.json({ room: null });
    }

    return NextResponse.json({ id: webrtcDoc.id, ...webrtcDoc.data() });
  } catch (error) {
    console.error('GET /api/webrtc error:', error);
    return NextResponse.json({ error: 'Failed to get room' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getServerSession();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await request.json();
    const { action, sessionId } = body as { action?: string; sessionId?: string };

    if (!action || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields: action, sessionId' }, { status: 400 });
    }

    // Verify participant
    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    const session = sessionDoc.data() as { participants?: string[] } | undefined;
    if (!session?.participants?.includes(user.uid)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const roomRef = db.collection('webrtcRooms').doc(sessionId);
    const roomDoc = await roomRef.get();

    if (action === 'create-offer') {
      const { offer } = body as { offer?: SDP };
      if (!offer?.sdp || offer.type !== 'offer') {
        return NextResponse.json({ error: 'Invalid offer' }, { status: 400 });
      }

      const payload = {
        sessionId,
        status: 'open',
        offeredBy: user.uid,
        offer,
        offerCandidates: [],
        answerCandidates: [],
        createdAt: db.FieldValue.serverTimestamp(),
        updatedAt: db.FieldValue.serverTimestamp(),
      };

      if (roomDoc.exists) {
        await roomRef.update({
          ...payload,
          // Reset answer if recreating offer
          answer: db.FieldValue.delete(),
          answeredBy: db.FieldValue.delete(),
          updatedAt: db.FieldValue.serverTimestamp(),
        });
      } else {
        await roomRef.set(payload);
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'create-answer') {
      const { answer } = body as { answer?: SDP };
      if (!answer?.sdp || answer.type !== 'answer') {
        return NextResponse.json({ error: 'Invalid answer' }, { status: 400 });
      }

      if (!roomDoc.exists) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      await roomRef.update({
        status: 'answered',
        answeredBy: user.uid,
        answer,
        updatedAt: db.FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'add-candidate') {
      const { role, candidate } = body as { role?: 'offer' | 'answer'; candidate?: unknown };
      if (!role || !candidate) {
        return NextResponse.json({ error: 'Missing candidate or role' }, { status: 400 });
      }

      const field = role === 'offer' ? 'offerCandidates' : 'answerCandidates';
      await roomRef.update({
        [field]: db.FieldValue.arrayUnion(candidate),
        updatedAt: db.FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'end') {
      if (roomDoc.exists) {
        await roomRef.update({ status: 'ended', updatedAt: db.FieldValue.serverTimestamp() });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/webrtc error:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}
