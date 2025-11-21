import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '../pages/api/auth/[...nextauth]';

export async function requireAuth(req: NextRequest, allowedRoles: string[] = []) {
  const session = await getServerSession(authOptions);
  if (!session || (allowedRoles.length && !allowedRoles.includes(session.user.role))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}
