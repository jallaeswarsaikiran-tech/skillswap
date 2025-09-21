import { NextResponse } from 'next/server';
import { db } from 'cosmic-database';
import { getServerSession } from 'cosmic-authentication';

const COLLECTION = 'siteSettings';
const DOC_ID = 'global';

export async function GET() {
  try {
    const doc = await db.collection(COLLECTION).doc(DOC_ID).get();
    const data = doc.exists ? doc.data() : {};
    return NextResponse.json({ settings: data || {} });
  } catch (e) {
    console.error('GET /api/site-settings error', e);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getServerSession();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { heroImageUrl } = body as { heroImageUrl?: string };

    const update: Record<string, unknown> = { updatedAt: db.FieldValue.serverTimestamp() };
    if (typeof heroImageUrl === 'string') update.heroImageUrl = heroImageUrl;

    await db.collection(COLLECTION).doc(DOC_ID).set(update, { merge: true });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('PUT /api/site-settings error', e);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
