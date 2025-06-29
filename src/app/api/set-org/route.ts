import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { orgId } = await request.json();

  if (!orgId) {
    return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('current_org_id', orgId, {
    httpOnly: false, // allow client-side access
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
} 