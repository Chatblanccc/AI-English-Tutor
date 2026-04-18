/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Sets up a global HTTP proxy dispatcher so that Node.js built-in fetch
 * (undici) respects HTTPS_PROXY / HTTP_PROXY in development.
 */
export async function register() {
  const redactProxyUrl = (url: string): string => {
    try {
      const parsed = new URL(url);
      if (parsed.username) parsed.username = '***';
      if (parsed.password) parsed.password = '***';
      return parsed.toString();
    } catch {
      return '[invalid-proxy-url]';
    }
  };

  const proxyUrl =
    process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;

  const isNodeRuntime = process.env.NEXT_RUNTIME === 'nodejs' || typeof process.release?.name === 'string';

  if (isNodeRuntime && proxyUrl && typeof globalThis.fetch !== 'undefined') {
    try {
      const { ProxyAgent, setGlobalDispatcher } = await import('undici');
      setGlobalDispatcher(new ProxyAgent(proxyUrl));
      console.log(`[proxy] Global fetch proxy set → ${redactProxyUrl(proxyUrl)}`);
    } catch (e) {
      console.warn('[proxy] Failed to set global proxy dispatcher:', e);
    }
  }

  // Bootstrap DB schema on cold start so request handlers don't pay the penalty.
  if (process.env.DATABASE_URL) {
    try {
      const { ensureSchema } = await import('@/lib/db');
      await ensureSchema();
      console.log('[instrumentation] DB schema ready');
    } catch (e) {
      console.warn('[instrumentation] DB schema bootstrap failed (non-fatal):', e);
    }
  }
}
