import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Certificates API is disabled (not implemented).' },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'Certificates API is disabled (not implemented).' },
    { status: 501 }
  );
}