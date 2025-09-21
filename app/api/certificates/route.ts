import { NextResponse } from 'next/server';
import { db } from 'cosmic-database';
import { getServerSession } from 'cosmic-authentication';

export async function GET(request: Request) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const certificateId = searchParams.get('id');

    if (certificateId) {
      // Get specific certificate
      const doc = await db.collection('certificates').doc(certificateId).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
      }

      const certificate = doc.data();
      if (certificate?.userId !== user.uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      return NextResponse.json({ certificate: { id: doc.id, ...certificate } });
    } else {
      // Get user's certificates (avoid composite indexes)
      const snapshot = await db
        .collection('certificates')
        .where('userId', '==', user.uid)
        .limit(50)
        .get();

      const certificates = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort in memory by completedAt/issuedAt desc
      const sorted = [...certificates].sort((a, b) => {
        const getTime = (val: unknown): number => {
          // @ts-expect-error Timestamp compat if provided by DB
          if (val?.toMillis) return val.toMillis();
          const d = new Date((val as string) || 0);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        const aTime = getTime((a as { completedAt?: unknown; issuedAt?: unknown }).completedAt || (a as { issuedAt?: unknown }).issuedAt);
        const bTime = getTime((b as { completedAt?: unknown; issuedAt?: unknown }).completedAt || (b as { issuedAt?: unknown }).issuedAt);
        return bTime - aTime;
      });

      return NextResponse.json({ certificates: sorted });
    }
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let data: unknown;
    try {
      data = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (typeof data !== 'object' || data === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { sessionId, skillTitle, teacherId, teacherName, grade, completionNotes, fileId } = data as {
      sessionId?: string;
      skillTitle?: string;
      teacherId?: string;
      teacherName?: string;
      grade?: string;
      completionNotes?: string;
      fileId?: string;
    };

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing required field: sessionId' }, { status: 400 });
    }

    // Verify the session exists and user is the teacher (certificates are issued by teachers only)
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionDoc.data() as { learnerId?: string; learnerName?: string; status?: string; skillTitle?: string; teacherId?: string; teacherName?: string } | undefined;

    if (session?.teacherId !== user.uid) {
      return NextResponse.json({ error: 'Only the teacher can issue a certificate for this session' }, { status: 403 });
    }

    if (session?.status !== 'completed') {
      return NextResponse.json({ error: 'Certificates can only be issued after the session is completed' }, { status: 400 });
    }

    // Check if certificate already exists for this session + learner (avoid multi-field where)
    const existingSnapshot = await db
      .collection('certificates')
      .where('sessionId', '==', sessionId)
      .limit(10)
      .get();

    const alreadyExists = existingSnapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .some((c: { userId?: string }) => c.userId === session?.learnerId);

    if (alreadyExists) {
      return NextResponse.json({ error: 'Certificate already exists for this session' }, { status: 400 });
    }

    const learnerId = session?.learnerId as string;
    const learnerName = (session?.learnerName as string) || 'Learner';

    const certificateData = {
      userId: learnerId, // issue to learner only
      userName: learnerName,
      skillTitle: skillTitle || session?.skillTitle,
      teacherId: teacherId || session?.teacherId,
      teacherName: teacherName || session?.teacherName,
      sessionId,
      grade: grade || 'Pass',
      completionNotes: completionNotes || '',
      fileId: fileId || null,
      certificateNumber: `SKILL-${Date.now()}-${(learnerId || '').slice(-6).toUpperCase()}`,
      issuedAt: db.FieldValue.serverTimestamp(),
      verificationId: `${sessionId}-${learnerId}`,
      createdAt: db.FieldValue.serverTimestamp(),
      updatedAt: db.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('certificates').add(certificateData);

    // Update learner's certificates array
    await db.collection('users').doc(learnerId).update({
      certificates: db.FieldValue.arrayUnion(docRef.id),
      updatedAt: db.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      certificateId: docRef.id,
      certificate: { id: docRef.id, ...certificateData },
    });
  } catch (error) {
    console.error('Error creating certificate:', error);
    return NextResponse.json({ error: 'Failed to create certificate' }, { status: 500 });
  }
}