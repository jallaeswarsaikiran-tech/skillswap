import { NextResponse } from 'next/server';
import { getServerSession } from 'cosmic-authentication';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const user = await getServerSession();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    // Guard against very large uploads to prevent 413 from upstream
    const MAX_BYTES = 8 * 1024 * 1024; // 8MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large. Please upload an image under 8MB.' }, { status: 413 });
    }

    const apiKey = process.env.COSMIC_FILES_SECRET as string | undefined;
    const userId = process.env.USER_ID as string | undefined;
    const projectId = process.env.NEXT_PUBLIC_CLIENT_ID as string | undefined;

    if (!apiKey || !userId || !projectId) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const uploadForm = new FormData();
    uploadForm.append('userId', userId);
    uploadForm.append('projectId', projectId);
    uploadForm.append('creatorId', user.uid);
    uploadForm.append('file', file, file.name);

    const resp = await fetch('https://files.cosmic.new/files/upload', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: uploadForm,
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: 'Upload failed', details: text }, { status: 500 });
    }

    const json = await resp.json() as { fileId: string; fileName: string };
    const fileUrl = `https://files.cosmic.new/files/${encodeURIComponent(userId)}/${encodeURIComponent(projectId)}?fileId=${encodeURIComponent(json.fileId)}`;

    return NextResponse.json({ success: true, ...json, fileUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}