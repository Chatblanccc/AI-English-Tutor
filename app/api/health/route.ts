import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
// No auth required.
// Public mode only checks env presence; deep third-party probe requires a shared token.
let moonshotDirectDispatcher: unknown | null = null;

async function getMoonshotDirectDispatcher(): Promise<unknown> {
  if (moonshotDirectDispatcher) return moonshotDirectDispatcher;
  const undici = await (0, eval)('import("undici")');
  moonshotDirectDispatcher = new undici.Agent();
  return moonshotDirectDispatcher;
}

type HealthSnapshot = { ok: boolean; services: { ai: boolean; tts: boolean }; at: number };

// Separate caches for public checks and authenticated deep checks.
let cachedPublic: HealthSnapshot | null = null;
let cachedDeep: HealthSnapshot | null = null;
const CACHE_TTL_MS = 10_000;
const DEEP_CHECK_HEADER = 'x-health-check-token';

function canRunDeepCheck(req: Request): boolean {
  const expected = process.env.HEALTHCHECK_TOKEN;
  if (!expected) return false;
  const provided = req.headers.get(DEEP_CHECK_HEADER);
  return !!provided && provided === expected;
}

export async function GET(req: Request) {
  const now = Date.now();
  const deepCheck = canRunDeepCheck(req);
  const cache = deepCheck ? cachedDeep : cachedPublic;

  if (cache && now - cache.at < CACHE_TTL_MS) {
    return NextResponse.json(
      { ok: cache.ok, services: cache.services },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const kimiKey = process.env.KIMI_API_KEY;
  const fishKey = process.env.FISH_AUDIO_API_KEY;

  // Public checks are configuration-only. Deep external probe is opt-in via secret header.
  let aiOk = Boolean(kimiKey);
  if (deepCheck && kimiKey) {
    try {
      const dispatcher = await getMoonshotDirectDispatcher();
      const res = await fetch(
        'https://api.moonshot.cn/v1/models',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${kimiKey}` },
          signal: AbortSignal.timeout(6000),
          // Keep Moonshot probe independent from global proxy settings.
          dispatcher,
        } as RequestInit & { dispatcher: unknown },
      );
      aiOk = res.ok;
    } catch {
      aiOk = false;
    }
  }

  // Fish Audio TTS: just verify key is configured (no free lightweight ping endpoint)
  const ttsOk = Boolean(fishKey && fishKey !== 'your_fish_audio_api_key_here');

  const allOk = aiOk && ttsOk;
  const snapshot = { ok: allOk, services: { ai: aiOk, tts: ttsOk }, at: now };
  if (deepCheck) {
    cachedDeep = snapshot;
  } else {
    cachedPublic = snapshot;
  }

  return NextResponse.json(
    { ok: allOk, services: { ai: aiOk, tts: ttsOk } },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
