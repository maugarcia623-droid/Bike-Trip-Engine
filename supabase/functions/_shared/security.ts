// Shared security helpers for Cadence Supabase Edge Functions (OAuth, Auth, SSRF, Base64).

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const DEFAULT_REDIRECT_ORIGINS = [
  'https://cadence.app',
  'https://www.cadence.app',
  'https://ridecadence.cc',
  'https://www.ridecadence.cc',
];

const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;
const MAX_REDIRECT_HOPS = 5;

function getEnv(name: string): string {
  try {
    // deno-lint-ignore no-explicit-any
    const denoEnv = (globalThis as any)?.Deno?.env;
    if (denoEnv && typeof denoEnv.get === 'function') {
      return String(denoEnv.get(name) || '');
    }
  } catch {
    // Ignore when running outside Deno (e.g., Node unit tests)
  }
  return '';
}

export function getAllowedRedirectOrigins(extraConfigured?: string): string[] {
  const configuredRaw =
    extraConfigured ??
    [getEnv('ALLOWED_REDIRECT_ORIGINS'), getEnv('SITE_URL'), getEnv('PUBLIC_SITE_URL')]
      .filter(Boolean)
      .join(',');

  const out = new Set<string>(DEFAULT_REDIRECT_ORIGINS);
  for (const entry of configuredRaw.split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        out.add(parsed.origin);
      }
    } catch {
      // Ignore malformed origin entries
    }
  }
  return Array.from(out);
}

const ALLOWED_CALLBACK_PATHS = new Set<string>(['/', '/oauth/callback']);

/**
 * Validates an OAuth redirect target strictly against ALLOWED_REDIRECT_ORIGINS
 * (plus http://localhost:* and http://127.0.0.1:* for local development),
 * permitting only root `/` or exact `/oauth/callback` paths, plus the exact
 * iOS ASWebAuthenticationSession custom scheme `cadence://oauth-callback`.
 * Never accepts arbitrary https:// domains, paths, or custom schemes.
 */
export function isAllowedRedirectOrigin(
  raw: string,
  extraConfigured?: string
): string | null {
  try {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const parsed = new URL(trimmed);

    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      return null;
    }

    if (parsed.protocol === 'cadence:') {
      if (
        !parsed.port &&
        parsed.hostname === 'oauth-callback' &&
        (parsed.pathname === '' || parsed.pathname === '/')
      ) {
        return 'cadence://oauth-callback';
      }
      return null;
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }

    const isLocalhost =
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');

    if (!isLocalhost) {
      const allowed = getAllowedRedirectOrigins(extraConfigured);
      if (!allowed.includes(parsed.origin)) {
        return null;
      }
    }

    if (!ALLOWED_CALLBACK_PATHS.has(parsed.pathname)) {
      return null;
    }

    return parsed.pathname === '/'
      ? parsed.origin
      : `${parsed.origin}${parsed.pathname}`;
  } catch {
    return null;
  }
}

/**
 * Appends OAuth query parameters cleanly to a validated redirect target:
 * - Origin-only web targets (`https://cadence.app`) -> `https://cadence.app/?...`
 * - Path targets (`https://ridecadence.cc/oauth/callback`) -> `https://ridecadence.cc/oauth/callback?...`
 * - Custom-scheme targets (`cadence://oauth-callback`) -> `cadence://oauth-callback?...`
 * Uses encodeURIComponent (%20 for spaces) so both Web URLSearchParams and iOS Swift URLComponents decode identically.
 */
export function buildOAuthRedirectUrl(
  target: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(target.trim());
  const baseWithoutHash = url.toString().split('#')[0];
  const qs = Object.entries(params)
    .filter(
      (entry): entry is [string, string | number | boolean] =>
        entry[1] !== undefined
    )
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
    )
    .join('&');
  if (!qs) return baseWithoutHash;
  return `${baseWithoutHash}${url.search ? '&' : '?'}${qs}`;
}

export function getFallbackRedirectOrigin(extraConfigured?: string): string {
  const configuredFirst = [
    getEnv('SITE_URL'),
    getEnv('PUBLIC_SITE_URL'),
    getEnv('ALLOWED_REDIRECT_ORIGINS').split(',')[0],
  ]
    .map((s) => (s || '').trim())
    .find(Boolean);

  if (configuredFirst) {
    const valid = isAllowedRedirectOrigin(configuredFirst, extraConfigured);
    if (valid) return valid;
  }
  return 'http://localhost:5173';
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(raw: string): Uint8Array | null {
  if (!raw || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((raw.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function deriveHmacKey(explicitSecret?: string): Promise<CryptoKey | null> {
  const secret =
    explicitSecret ||
    getEnv('OAUTH_STATE_SECRET') ||
    getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) return null;

  const keyMaterial = new TextEncoder().encode(`cadence-oauth-state-v1:${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', keyMaterial);
  return crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export interface SignedStateEnvelope {
  nonce: string;
  iat: number;
  connectionKey: string;
  redirectOrigin: string;
  userId?: string;
  provider?: string;
}

export async function signOAuthState(
  payload: Omit<SignedStateEnvelope, 'nonce' | 'iat'> & { nonce?: string; iat?: number },
  explicitSecret?: string
): Promise<string | null> {
  const key = await deriveHmacKey(explicitSecret);
  if (!key) return null;

  const envelope: SignedStateEnvelope = {
    ...payload,
    nonce: payload.nonce || crypto.randomUUID(),
    iat: payload.iat ?? Date.now(),
  };

  const payloadBytes = new TextEncoder().encode(JSON.stringify(envelope));
  const payloadB64 = toBase64Url(payloadBytes);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  const sigB64 = toBase64Url(new Uint8Array(sigBuf));
  return `${payloadB64}.${sigB64}`;
}

export async function verifyOAuthState(
  rawState: string,
  options?: {
    explicitSecret?: string;
    allowedOrigins?: string;
    nowMs?: number;
    ttlMs?: number;
  }
): Promise<SignedStateEnvelope | null> {
  if (!rawState || typeof rawState !== 'string') return null;
  const parts = rawState.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;
  const sigBytes = fromBase64Url(sigB64);
  const payloadBytes = fromBase64Url(payloadB64);
  if (!sigBytes || !payloadBytes) return null;

  const key = await deriveHmacKey(options?.explicitSecret);
  if (!key) return null;

  const sigValid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    new TextEncoder().encode(payloadB64)
  );
  if (!sigValid) return null;

  try {
    const parsed = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<SignedStateEnvelope>;
    if (!parsed?.nonce || !UUID_REGEX.test(String(parsed.nonce))) return null;
    if (typeof parsed.iat !== 'number' || !Number.isFinite(parsed.iat)) return null;

    const now = options?.nowMs ?? Date.now();
    const ttl = options?.ttlMs ?? OAUTH_STATE_TTL_MS;
    if (parsed.iat > now + 60_000 || now - parsed.iat > ttl) return null;

    if (!parsed.connectionKey || !UUID_REGEX.test(parsed.connectionKey)) return null;
    if (parsed.userId !== undefined && !UUID_REGEX.test(parsed.userId)) return null;

    const safeOrigin = isAllowedRedirectOrigin(
      String(parsed.redirectOrigin || ''),
      options?.allowedOrigins
    );
    if (!safeOrigin) return null;

    return {
      nonce: parsed.nonce,
      iat: parsed.iat,
      connectionKey: parsed.connectionKey,
      redirectOrigin: safeOrigin,
      userId: parsed.userId,
      provider: typeof parsed.provider === 'string' ? parsed.provider : undefined,
    };
  } catch {
    return null;
  }
}

export interface RequestAuthResult {
  userId: string | null;
  invalidToken: boolean;
}

function decodeJwtRoleAndSub(token: string): { role?: string; sub?: string } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const bytes = fromBase64Url(parts[1]);
  if (!bytes) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as { role?: string; sub?: string };
  } catch {
    return null;
  }
}

/**
 * Verifies a Supabase user JWT when sent in `Authorization: Bearer <token>`.
 * Anonymous requests (missing header or project `anon` JWT without `sub`) resolve
 * cleanly to `{ userId: null, invalidToken: false }`. Invalid/forged user JWTs
 * resolve to `{ userId: null, invalidToken: true }` so callers can return 401.
 */
export async function resolveRequestUser(
  req: Request,
  // deno-lint-ignore no-explicit-any
  admin: any
): Promise<RequestAuthResult> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return { userId: null, invalidToken: false };

  const token = match[1].trim();
  const anonKey = getEnv('SUPABASE_ANON_KEY');
  if (!token || (anonKey && token === anonKey)) {
    return { userId: null, invalidToken: false };
  }

  const claims = decodeJwtRoleAndSub(token);
  if (claims && claims.role === 'anon' && !claims.sub) {
    return { userId: null, invalidToken: false };
  }

  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user?.id) {
      return { userId: null, invalidToken: true };
    }
    return { userId: String(data.user.id), invalidToken: false };
  } catch {
    return { userId: null, invalidToken: true };
  }
}

export interface IntegrationQueryOwner {
  userId: string | null;
  connectionKey: string;
}

/**
 * Looks up an integration row enforcing ownership:
 * - Signed-in users (`userId` present): prefer rows matching `user_id = userId`,
 *   or an unclaimed (`user_id IS NULL`) row matching `connectionKey`.
 *   Never returns a row owned by a different `user_id`.
 * - Anonymous visitors (`userId === null`): ONLY matches rows where `user_id IS NULL`.
 */
export async function findOwnedIntegrationRow(
  // deno-lint-ignore no-explicit-any
  admin: any,
  owner: IntegrationQueryOwner,
  provider: string | string[],
  selectColumns: string
  // deno-lint-ignore no-explicit-any
): Promise<any[]> {
  const isMulti = Array.isArray(provider);
  const hasValidKey = UUID_REGEX.test(owner.connectionKey);

  if (owner.userId) {
    let q = admin.from('user_integrations').select(selectColumns).eq('user_id', owner.userId);
    q = isMulti ? q.in('provider', provider) : q.eq('provider', provider);
    const { data: userRows } = await q;
    if (Array.isArray(userRows) && userRows.length > 0) {
      return userRows;
    }

    if (hasValidKey) {
      let qAnon = admin
        .from('user_integrations')
        .select(selectColumns)
        .eq('connection_key', owner.connectionKey)
        .is('user_id', null);
      qAnon = isMulti ? qAnon.in('provider', provider) : qAnon.eq('provider', provider);
      const { data: unclaimedRows } = await qAnon;
      if (Array.isArray(unclaimedRows) && unclaimedRows.length > 0) {
        // Auto-claim anonymous rows when accessed by an authenticated session with matching connectionKey
        let claimQ = admin
          .from('user_integrations')
          .update({ user_id: owner.userId, updated_at: new Date().toISOString() })
          .eq('connection_key', owner.connectionKey)
          .is('user_id', null);
        claimQ = isMulti ? claimQ.in('provider', provider) : claimQ.eq('provider', provider);
        await claimQ;
        return unclaimedRows;
      }
    }
    return [];
  }

  if (!hasValidKey) return [];
  let q = admin
    .from('user_integrations')
    .select(selectColumns)
    .eq('connection_key', owner.connectionKey)
    .is('user_id', null);
  q = isMulti ? q.in('provider', provider) : q.eq('provider', provider);
  const { data } = await q;
  return Array.isArray(data) ? data : [];
}

export async function deleteOwnedIntegrationRow(
  // deno-lint-ignore no-explicit-any
  admin: any,
  owner: IntegrationQueryOwner,
  provider: string
): Promise<void> {
  const hasValidKey = UUID_REGEX.test(owner.connectionKey);
  if (owner.userId) {
    await admin
      .from('user_integrations')
      .delete()
      .eq('user_id', owner.userId)
      .eq('provider', provider);
    if (hasValidKey) {
      await admin
        .from('user_integrations')
        .delete()
        .eq('connection_key', owner.connectionKey)
        .is('user_id', null)
        .eq('provider', provider);
    }
    return;
  }

  if (!hasValidKey) return;
  await admin
    .from('user_integrations')
    .delete()
    .eq('connection_key', owner.connectionKey)
    .is('user_id', null)
    .eq('provider', provider);
}

// --- SSRF Defense Helpers ---

function parseIpv4Octets(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums: number[] = [];
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n < 0 || n > 255) return null;
    nums.push(n);
  }
  return nums;
}

function isPrivateIpv4Octets(o: number[]): boolean {
  const [a, b, c] = o;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 TEST-NET-1
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmark
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 TEST-NET-3
  if (a >= 224) return true; // Multicast & reserved 224.0.0.0+
  return false;
}

export function isPrivateOrReservedIp(rawIp: string): boolean {
  const clean = rawIp.trim().replace(/^\[|\]$/g, '').split('%')[0].toLowerCase();
  if (!clean) return true;

  const v4 = parseIpv4Octets(clean);
  if (v4) {
    return isPrivateIpv4Octets(v4);
  }

  // IPv6 checks
  if (!clean.includes(':')) return true;
  if (clean === '::' || clean === '::1') return true;

  // Embedded IPv4 inside IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (clean.startsWith('::ffff:')) {
    const rest = clean.slice('::ffff:'.length);
    const mappedV4 = parseIpv4Octets(rest);
    if (mappedV4) return isPrivateIpv4Octets(mappedV4);
    const hexMatch = rest.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hexMatch) {
      const hi = parseInt(hexMatch[1], 16);
      const lo = parseInt(hexMatch[2], 16);
      return isPrivateIpv4Octets([(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff]);
    }
    return true;
  }

  const firstHextetStr = clean.split(':')[0];
  const firstHextet = firstHextetStr ? parseInt(firstHextetStr, 16) : 0;
  if (Number.isNaN(firstHextet)) return true;

  // fc00::/7 Unique Local, fe80::/10 Link-Local, ff00::/8 Multicast, 2001:db8::/32 Doc
  if ((firstHextet & 0xfe00) === 0xfc00) return true;
  if ((firstHextet & 0xffc0) === 0xfe80) return true;
  if ((firstHextet & 0xff00) === 0xff00) return true;
  if (clean.startsWith('2001:db8:')) return true;
  if (clean.startsWith('::') && clean !== '::') return true;

  return false;
}

export function isUnsafeHostname(rawHost: string): boolean {
  const host = rawHost.trim().toLowerCase().replace(/\.+$/, '');
  if (!host || !host.includes('.')) return true; // Block bare internal names like "metadata", "redis"
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.arpa') ||
    host.endsWith('.nip.io') ||
    host.endsWith('.sslip.io') ||
    host.endsWith('.xip.io') ||
    host.endsWith('.localtest.me') ||
    host.endsWith('.lvh.me')
  ) {
    return true;
  }
  const bare = host.replace(/^\[|\]$/g, '');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(bare) || bare.includes(':')) {
    return true; // Disallow raw IP literals
  }
  return false;
}

export async function assertSafePublicUrl(
  rawUrl: string,
  options?: {
    resolveDns?: (hostname: string, recordType: 'A' | 'AAAA') => Promise<string[]>;
  }
): Promise<URL | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password) return null;
  if (isUnsafeHostname(parsed.hostname)) return null;

  // Resolve DNS in Deno runtime (or injected test resolver) to defeat DNS rebinding / .nip.io tricks
  // deno-lint-ignore no-explicit-any
  const denoResolve = (globalThis as any)?.Deno?.resolveDns as
    | ((hostname: string, recordType: 'A' | 'AAAA') => Promise<string[]>)
    | undefined;
  const resolver = options?.resolveDns ?? denoResolve;

  if (resolver) {
    const resolvedIps: string[] = [];
    for (const rtype of ['A', 'AAAA'] as const) {
      try {
        const records = await resolver(parsed.hostname, rtype);
        if (Array.isArray(records)) {
          resolvedIps.push(...records);
        }
      } catch {
        // Ignore missing AAAA when A succeeds, etc.
      }
    }
    if (resolvedIps.some((ip) => isPrivateOrReservedIp(ip))) {
      return null;
    }
  }

  return parsed;
}

export interface SafeFetchResult {
  finalUrl: URL;
  status: number;
  contentType: string;
  bytes: Uint8Array;
}

export async function safeFetchWithManualRedirects(
  initialUrl: string,
  options: {
    accept?: string;
    authorization?: string;
    timeoutMs?: number;
    maxBytes?: number;
    maxHops?: number;
    fetchImpl?: typeof fetch;
    resolveDns?: (hostname: string, recordType: 'A' | 'AAAA') => Promise<string[]>;
    validateHopUrl?: (url: URL) => boolean;
  } = {}
): Promise<SafeFetchResult | null> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
  const maxHops = options.maxHops ?? MAX_REDIRECT_HOPS;
  const doFetch = options.fetchImpl ?? fetch;

  let currentUrl = await assertSafePublicUrl(initialUrl, { resolveDns: options.resolveDns });
  if (!currentUrl) return null;
  if (options.validateHopUrl && !options.validateHopUrl(currentUrl)) return null;

  const initialHost = currentUrl.hostname.toLowerCase();

  for (let hop = 0; hop <= maxHops; hop++) {
    const headers: Record<string, string> = {
      'User-Agent': 'CadenceRouteProxy/1.0 (+https://cadence.app)',
      Accept: options.accept || '*/*',
    };
    if (options.authorization && currentUrl.hostname.toLowerCase() === initialHost) {
      headers.Authorization = options.authorization;
    }

    const res = await doFetch(currentUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers,
    });

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc || hop === maxHops) return null;
      let nextRaw: string;
      try {
        nextRaw = new URL(loc, currentUrl).toString();
      } catch {
        return null;
      }
      const nextSafe = await assertSafePublicUrl(nextRaw, { resolveDns: options.resolveDns });
      if (!nextSafe) return null;
      if (options.validateHopUrl && !options.validateHopUrl(nextSafe)) return null;
      currentUrl = nextSafe;
      continue;
    }

    if (!res.ok) return null;

    const declaredLen = Number(res.headers.get('content-length') || '0');
    if (Number.isFinite(declaredLen) && declaredLen > maxBytes) {
      return null;
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength < 16 || buf.byteLength > maxBytes) {
      return null;
    }

    return {
      finalUrl: currentUrl,
      status: res.status,
      contentType: (res.headers.get('content-type') || '').toLowerCase(),
      bytes: new Uint8Array(buf),
    };
  }

  return null;
}

// --- Base64 Validation for FIT Payloads ---

export const MAX_FIT_BASE64_CHARS = 8 * 1024 * 1024; // ~6 MiB max FIT payload
export const MAX_FIT_BYTES = 5 * 1024 * 1024;

export function parseStrictFitBase64(
  raw: unknown
): { ok: true; bytes: Uint8Array } | { ok: false; reason: string } {
  if (typeof raw !== 'string') {
    return { ok: false, reason: 'missing_course_payload' };
  }
  const normalized = raw.replace(/\s+/g, '');
  if (!normalized) {
    return { ok: false, reason: 'missing_course_payload' };
  }
  if (normalized.length > MAX_FIT_BASE64_CHARS) {
    return { ok: false, reason: 'payload_too_large' };
  }
  if (normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    return { ok: false, reason: 'invalid_base64_payload' };
  }

  let binary: string;
  try {
    binary = atob(normalized);
  } catch {
    return { ok: false, reason: 'invalid_base64_payload' };
  }

  if (binary.length < 16 || binary.length > MAX_FIT_BYTES) {
    return { ok: false, reason: binary.length > MAX_FIT_BYTES ? 'payload_too_large' : 'invalid_fit_payload' };
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const magic = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (magic !== '.FIT') {
    return { ok: false, reason: 'invalid_fit_payload' };
  }

  return { ok: true, bytes };
}
