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

    const run = async () => {
      const result = await probeSessionEndpoint(expectedEndpoint);
      if (result.ok && result.isJson) return;

      console.error(
        '[auth self-check] No healthy Auth session endpoint detected. ' +
        `Expected a JSON response from "${expectedEndpoint}".`,
        { result },
      );
    };

    void run();
  }, [basePath]);

  return null;
}
