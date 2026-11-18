import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSafePublicUrl,
  isAllowedRedirectOrigin,
  isPrivateOrReservedIp,
  parseStrictFitBase64,
  safeFetchWithManualRedirects,
  signOAuthState,
  verifyOAuthState,
} from '../../../supabase/functions/_shared/security';

describe('supabase/functions/_shared/security.ts', () => {
  it('enforces explicit ALLOWED_REDIRECT_ORIGINS and rejects arbitrary https origins', () => {
    assert.equal(isAllowedRedirectOrigin('http://localhost:5173'), 'http://localhost:5173');
    assert.equal(isAllowedRedirectOrigin('https://cadence.app'), 'https://cadence.app');
    assert.equal(
      isAllowedRedirectOrigin('https://preview.cadence.app', 'https://preview.cadence.app'),
      'https://preview.cadence.app'
    );

    assert.equal(isAllowedRedirectOrigin('https://evil.example'), null);
    assert.equal(isAllowedRedirectOrigin('https://cadence.app.attacker.com'), null);
    assert.equal(isAllowedRedirectOrigin('javascript:alert(1)'), null);
  });

  it('signs and verifies HMAC-SHA256 OAuth state with nonce, TTL, and ownership checks', async () => {
    const secret = 'test-hmac-secret-for-unit-tests';
    const connectionKey = '11111111-1111-4111-8111-111111111111';
    const userId = '22222222-2222-4222-8222-222222222222';

    const signed = await signOAuthState(
      {
        provider: 'strava',
        connectionKey,
        redirectOrigin: 'https://cadence.app',
        userId,
        iat: 1_700_000_000_000,
      },
      secret
    );
    assert.ok(signed && signed.includes('.'));

    const verified = await verifyOAuthState(signed!, {
      explicitSecret: secret,
      nowMs: 1_700_000_060_000,
    });
    assert.ok(verified);
    assert.equal(verified?.connectionKey, connectionKey);
    assert.equal(verified?.userId, userId);
    assert.equal(verified?.redirectOrigin, 'https://cadence.app');

    // Unsigned state is rejected
    const unsigned = signed!.split('.')[0];
    assert.equal(await verifyOAuthState(unsigned, { explicitSecret: secret }), null);

    // Tampered payload is rejected
    const [p, s] = signed!.split('.');
    const tampered = `${p.slice(0, -2)}AA.${s}`;
    assert.equal(await verifyOAuthState(tampered, { explicitSecret: secret }), null);

    // Wrong secret is rejected
    assert.equal(await verifyOAuthState(signed!, { explicitSecret: 'wrong-secret' }), null);

    // Expired state (> 15 min) is rejected
    assert.equal(
      await verifyOAuthState(signed!, {
        explicitSecret: secret,
        nowMs: 1_700_000_000_000 + 20 * 60 * 1000,
      }),
      null
    );
  });

  it('blocks private/metadata IPs, nip.io rebinding, and unsafe redirects (SSRF defense)', async () => {
    assert.equal(isPrivateOrReservedIp('127.0.0.1'), true);
    assert.equal(isPrivateOrReservedIp('169.254.169.254'), true);
    assert.equal(isPrivateOrReservedIp('10.24.1.5'), true);
    assert.equal(isPrivateOrReservedIp('172.16.0.1'), true);
    assert.equal(isPrivateOrReservedIp('192.168.1.10'), true);
    assert.equal(isPrivateOrReservedIp('::1'), true);
    assert.equal(isPrivateOrReservedIp('::ffff:127.0.0.1'), true);
    assert.equal(isPrivateOrReservedIp('fe80::1'), true);
    assert.equal(isPrivateOrReservedIp('104.18.2.10'), false);

    assert.equal(await assertSafePublicUrl('https://127.0.0.1/route.gpx'), null);
    assert.equal(await assertSafePublicUrl('https://127.0.0.1.nip.io/route.gpx'), null);
    assert.equal(await assertSafePublicUrl('http://example.com/route.gpx'), null);
    assert.equal(
      await assertSafePublicUrl('https://rebind.example.com/route.gpx', {
        resolveDns: async () => ['169.254.169.254'],
      }),
      null
    );

    // Blocks 302 redirect targeting internal metadata IP
    const ssrfBlocked = await safeFetchWithManualRedirects('https://files.example.com/a.gpx', {
      resolveDns: async () => ['93.184.216.34'],
      fetchImpl: (async () =>
        new Response(null, {
          status: 302,
          headers: { location: 'http://169.254.169.254/latest/meta-data/' },
        })) as typeof fetch,
    });
    assert.equal(ssrfBlocked, null);

    // Follows safe HTTPS redirect (e.g. strava.app.link -> strava.com/routes/123)
    const allowedRedirect = await safeFetchWithManualRedirects('https://strava.app.link/xyz', {
      resolveDns: async () => ['151.101.1.1'],
      fetchImpl: (async (input: RequestInfo | URL) => {
        const u = String(input);
        if (u.includes('strava.app.link')) {
          return new Response(null, {
            status: 302,
            headers: { location: 'https://www.strava.com/routes/987654321' },
          });
        }
        return new Response('<html>ok route payload here</html>', { status: 200 });
      }) as typeof fetch,
    });
    assert.ok(allowedRedirect);
    assert.equal(allowedRedirect?.finalUrl.toString(), 'https://www.strava.com/routes/987654321');
  });

  it('validates Base64 payloads and .FIT magic header strictly for push-course', () => {
    const invalidB64 = parseStrictFitBase64('not!valid!base64===');
    assert.equal(invalidB64.ok, false);

    const nonFit = parseStrictFitBase64(btoa('hello world 1234567890'));
    assert.equal(nonFit.ok, false);

    // Minimal 16-byte valid .FIT header signature (magic '.FIT' at offset 8..11)
    const fitBytes = new Uint8Array(16);
    fitBytes[0] = 14;
    fitBytes[8] = '.'.charCodeAt(0);
    fitBytes[9] = 'F'.charCodeAt(0);
    fitBytes[10] = 'I'.charCodeAt(0);
    fitBytes[11] = 'T'.charCodeAt(0);
    let binary = '';
    for (const b of fitBytes) binary += String.fromCharCode(b);
    const validFit = parseStrictFitBase64(btoa(binary));
    assert.equal(validFit.ok, true);
  });
});
