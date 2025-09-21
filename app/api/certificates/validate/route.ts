import { NextResponse } from 'next/server';

export async function POST() {
  // Certificate validation has been removed. Always return success.
  return NextResponse.json({ success: true, valid: true });
}