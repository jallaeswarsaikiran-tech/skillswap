import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json(
    { error: 'Teacher access API is disabled (not implemented).' },
    { status: 501 }
  );
}