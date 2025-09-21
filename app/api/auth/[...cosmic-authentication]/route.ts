import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    { error: 'Auth route is disabled (not implemented).' },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'Auth route is disabled (not implemented).' },
    { status: 501 }
  );
}