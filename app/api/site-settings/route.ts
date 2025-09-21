import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    { error: 'Site settings API is disabled (not implemented).' },
    { status: 501 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Site settings API is disabled (not implemented).' },
    { status: 501 }
  );
}
