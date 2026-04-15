import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ensureSchema, getUserProgress } from '@/lib/db';
import { getRankProgress } from '@/lib/rank';

type S = { user?: { id?: string } | null } | null;

export async function GET() {
  const session = (await auth()) as S;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureSchema();
    const row = await getUserProgress(userId);
    const progress = getRankProgress(row.xp, row.streakDays);
    return NextResponse.json(progress);
  } catch (e) {
    console.error('[GET /api/progress] error:', String(e));
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
