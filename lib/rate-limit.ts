import 'server-only';

type Bucket = {
  tokens: number;
  lastRefill: number;
};

// In-memory rate-limit store. Note: not shared across Vercel serverless instances.
// For production scale, migrate to Redis (e.g. Upstash).
const ipBuckets = new Map<string, Bucket>();
const userBuckets = new Map<string, Bucket>();

function getBucket(store: Map<string, Bucket>, key: string, capacity: number, windowMs: number): Bucket {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing) {
    const bucket: Bucket = { tokens: capacity - 1, lastRefill: now };
    store.set(key, bucket);
    return bucket;
  }
  const elapsed = now - existing.lastRefill;
  const refillRate = capacity / windowMs; // tokens per ms
  const tokensToAdd = elapsed * refillRate;
  existing.tokens = Math.min(capacity, existing.tokens + tokensToAdd);
  existing.lastRefill = now;

  if (existing.tokens < 1) {
    return existing;
  }
  existing.tokens -= 1;
  return existing;
}

export function checkRateLimit(
  key: string,
  options: { capacity: number; windowMs: number; type?: 'ip' | 'user' } = { capacity: 10, windowMs: 60_000 },
): { allowed: boolean; retryAfterMs: number } {
  const store = options.type === 'user' ? userBuckets : ipBuckets;
  const bucket = getBucket(store, key, options.capacity, options.windowMs);
  const allowed = bucket.tokens >= 0;
  if (!allowed) {
    const refillRate = options.capacity / options.windowMs;
    const retryAfterMs = Math.ceil((1 - bucket.tokens) / refillRate);
    return { allowed: false, retryAfterMs };
  }
  return { allowed: true, retryAfterMs: 0 };
}

/** Simple per-user sliding-window counter for chat round-trips. */
export function checkChatRateLimit(
  userId: string,
  ip: string,
): { allowed: boolean; retryAfterMs: number; reason?: string } {
  // User-level: 20 requests per minute
  const userLimit = checkRateLimit(userId, { capacity: 20, windowMs: 60_000, type: 'user' });
  if (!userLimit.allowed) {
    return { allowed: false, retryAfterMs: userLimit.retryAfterMs, reason: 'user_rate_limit' };
  }
  // IP-level: 40 requests per minute (catches unauthenticated/scripted abuse)
  const ipLimit = checkRateLimit(ip, { capacity: 40, windowMs: 60_000, type: 'ip' });
  if (!ipLimit.allowed) {
    return { allowed: false, retryAfterMs: ipLimit.retryAfterMs, reason: 'ip_rate_limit' };
  }
  return { allowed: true, retryAfterMs: 0 };
}
