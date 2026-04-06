import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listConversations, createConversation, ensureSchema, migrateAllUuidUsers } from '@/lib/db';
import type { Conversation } from '@/types';

type S = { user?: { id?: string } | null } | null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
let migrationDone = false;

export async function GET() {
  const session = await auth() as S;
  const userId = session?.user?.id;

  if (!userId) {
    console.log('[GET /api/conversations] no userId in session');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try { await ensureSchema(); } catch (e) {
    console.error('[GET /api/conversations] ensureSchema (non-fatal):', String(e));
  }

  // One-time migration: if userId is NOT a UUID (it's a stable provider ID),
  // migrate any leftover UUID-format user_ids to this stable ID.
  if (!migrationDone && !UUID_RE.test(userId)) {
    migrationDone = true;
    try {
      await migrateAllUuidUsers(userId);
    } catch (e) {
      console.error('[GET /api/conversations] migration error (non-fatal):', String(e));
      migrationDone = false;
    }
  }

  try {
    const convs = await listConversations(userId);
    console.log('[GET /api/conversations]', userId.slice(0, 12), '→', convs.length, 'conversations');
    return NextResponse.json(convs);
  } catch (e) {
    console.error('[GET /api/conversations] listConversations error:', String(e));
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth() as S;
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try { await ensureSchema(); } catch (e) {
    console.error('[POST /api/conversations] ensureSchema (non-fatal):', String(e));
  }

  try {
    const body: Conversation = await req.json();
    await createConversation(userId, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/conversations] error:', String(e));
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
