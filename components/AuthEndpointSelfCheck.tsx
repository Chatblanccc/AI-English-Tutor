'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    __AURAE_AUTH_SELF_CHECK_DONE__?: boolean;
  }
}

type ProbeResult = {
  endpoint: string;
  status: number | null;
  ok: boolean;
  isJson: boolean;
  contentType: string;
};

async function probeSessionEndpoint(endpoint: string): Promise<ProbeResult> {
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
    const contentType = response.headers.get('content-type') ?? '';
    return {
      endpoint,
      status: response.status,
      ok: response.ok,
      isJson: contentType.includes('application/json'),
      contentType,
    };
  } catch {
    return {
      endpoint,
      status: null,
      ok: false,
      isJson: false,
      contentType: '',
    };
  }
}

export function AuthEndpointSelfCheck({ basePath }: { basePath: string }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined') return;
    if (window.__AURAE_AUTH_SELF_CHECK_DONE__) return;
    window.__AURAE_AUTH_SELF_CHECK_DONE__ = true;

    const normalizedBasePath = basePath.startsWith('/') ? basePath : `/${basePath}`;
    const expectedEndpoint = `${normalizedBasePath}/session`;
    const candidates = [expectedEndpoint, '/api/auth/session', '/auth/session']
      .filter((value, index, arr) => arr.indexOf(value) === index);

    const run = async () => {
      const results = await Promise.all(candidates.map(probeSessionEndpoint));
      const expected = results.find(r => r.endpoint === expectedEndpoint);
      const hasHealthyExpected = !!expected && expected.ok && expected.isJson;
      if (hasHealthyExpected) return;

      const healthyAlternative = results.find(
        r => r.endpoint !== expectedEndpoint && r.ok && r.isJson,
      );

      if (healthyAlternative) {
        console.error(
          `[auth self-check] Session endpoint mismatch: SessionProvider basePath="${normalizedBasePath}" ` +
          `is probing "${expectedEndpoint}" but "${healthyAlternative.endpoint}" is the healthy JSON endpoint. ` +
          'Update SessionProvider basePath or your auth route path to keep them aligned.',
          { results },
        );
        return;
      }

      console.error(
        '[auth self-check] No healthy Auth session endpoint detected. ' +
        'Expected a JSON response from one of the session endpoints.',
        { results },
      );
    };

    void run();
  }, [basePath]);

  return null;
}
