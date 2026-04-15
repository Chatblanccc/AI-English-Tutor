import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  ensureSchema,
  getDailyPlan,
  listConversationPracticeMessagesSince,
  listUserPracticeMessagesSince,
} from '@/lib/db';
import type { MissionProgressInfo } from '@/types';

type S = { user?: { id?: string } | null } | null;

function dateKeyUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function estimateActivePracticeMs(messages: Array<{ timestamp: number; content: string }>): number {
  if (messages.length === 0) return 0;
  let total = 0;

  for (let i = 0; i < messages.length; i += 1) {
    const current = messages[i];
    const text = current.content.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    const speechUnits = Math.max(words, Math.ceil(chars / 4));
    const speechMs = Math.min(30_000, Math.max(4_000, speechUnits * 700));
    total += speechMs;

    if (i < messages.length - 1) {
      const next = messages[i + 1];
      const delta = next.timestamp - current.timestamp;
      // Ignore long idle gaps; only count engaged interaction gaps.
      if (delta > 0 && delta <= 90_000) {
        total += Math.min(delta, 30_000);
      }
    }
  }

  return total;
}

const SAFE_ID_RE = /^[a-zA-Z0-9_-]+$/;

export async function GET(req: NextRequest) {
  const session = (await auth()) as S;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureSchema();
    const key = dateKeyUtc();
    const startOfDayMs = Date.parse(`${key}T00:00:00.000Z`);
    const conversationId = req.nextUrl.searchParams.get('conversationId')?.trim() ?? '';
    const validConversationId = conversationId && SAFE_ID_RE.test(conversationId) ? conversationId : null;

    const plan = await getDailyPlan(userId, key) as null | { suggestedDurationMin?: number };
    const suggestedDurationMin = Number(plan?.suggestedDurationMin ?? 15);
    const targetMs = Math.max(60_000, suggestedDurationMin * 60_000);

    const messages = validConversationId
      ? await listConversationPracticeMessagesSince(userId, validConversationId, startOfDayMs)
      : await listUserPracticeMessagesSince(userId, startOfDayMs);
    const practicedMs = estimateActivePracticeMs(messages);
    const progressPercent = Math.min(100, Math.round((practicedMs / targetMs) * 100));

    const payload: MissionProgressInfo = {
      dateKey: key,
      practicedMs,
      targetMs,
      progressPercent,
      messageCount: messages.length,
    };

    return NextResponse.json(payload);
  } catch (e) {
    console.error('[GET /api/mission-progress] error:', String(e));
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
