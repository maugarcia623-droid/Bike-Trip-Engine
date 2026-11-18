import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type RouteProvider = 'komoot' | 'bikemap' | 'ridewithgps' | 'strava' | 'direct-file' | 'unknown';
type RouteFormat = 'gpx' | 'tcx' | 'fit';

interface ProxySuccessPayload {
  ok: true;
  provider: RouteProvider;
  routeId?: string;
  format: RouteFormat;
  fileName: string;
  content?: string;
  contentBase64?: string;
}

interface ProxyErrorPayload {
  ok: false;
  provider: RouteProvider;
  routeId?: string;
  reason: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UPSTREAM_TIMEOUT_MS = 8000;
const MAX_UPSTREAM_BYTES = 10 * 1024 * 1024; // 10 MB cap

const ALLOWED_PROVIDER_DOMAINS = [
  'komoot.com',
  'komoot.de',
  'komoot.fr',
  'api.komoot.de',
  'ridewithgps.com',
  'bikemap.net',
  'strava.com',
  'strava.app.link',
];

function jsonResponse(body: ProxySuccessPayload | ProxyErrorPayload, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

function isIpLiteral(hostname: string): boolean {
  const clean = hostname.replace(/^\[|\]$/g, '');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) return true;
  if (clean.includes(':')) return true;
  return false;
}

function isAllowedRouteUrl(rawUrl: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    return null;
  }
  if (isIpLiteral(host)) {
    return null;
  }

  const matchesKnownDomain = ALLOWED_PROVIDER_DOMAINS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`)
  );
  if (matchesKnownDomain) {
    return parsed;
  }

  if (/\.(gpx|tcx|fit)$/i.test(parsed.pathname)) {
    return parsed;
  }

  return null;
}

function detectProvider(url: URL): { provider: RouteProvider; routeId?: string } {
  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  if (/\.(gpx|tcx|fit)$/i.test(path)) {
    return { provider: 'direct-file' };
  }
  if (host.includes('komoot.')) {
    const m = path.match(/\/tour\/(\d+)/i);
    return { provider: 'komoot', routeId: m?.[1] };
  }
  if (host.includes('bikemap.')) {
    const m = path.match(/\/r\/(\d+)/i);
    return { provider: 'bikemap', routeId: m?.[1] };
  }
  if (host.includes('ridewithgps.')) {
    const m = path.match(/\/routes\/(\d+)/i);
    return { provider: 'ridewithgps', routeId: m?.[1] };
  }
  if (host.includes('strava.')) {
    const m = path.match(/\/routes\/(\d+)/i);
    return { provider: 'strava', routeId: m?.[1] };
  }
  return { provider: 'unknown' };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function pointsToGpx(
  points: Array<{ lat: number; lon: number; ele?: number }>,
  trackName = 'Cadence Route'
): string {
  const trkpts = points
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .map((p) => {
      const eleTag = Number.isFinite(p.ele) ? `<ele>${Number(p.ele).toFixed(1)}</ele>` : '';
      return `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">${eleTag}</trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Cadence Route Proxy" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(trackName)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function fetchUpstream(
  url: string,
  accept = '*/*'
): Promise<{ status: number; contentType: string; bytes: Uint8Array } | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        'User-Agent': 'CadenceRouteProxy/1.0 (+https://cadence.app)',
        Accept: accept,
      },
    });
    if (!res.ok) return null;

    const declaredLen = Number(res.headers.get('content-length') || '0');
    if (Number.isFinite(declaredLen) && declaredLen > MAX_UPSTREAM_BYTES) {
      return null;
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength < 16 || buf.byteLength > MAX_UPSTREAM_BYTES) {
      return null;
    }

    return {
      status: res.status,
      contentType: (res.headers.get('content-type') || '').toLowerCase(),
      bytes: new Uint8Array(buf),
    };
  } catch {
    return null;
  }
}

function inspectRawPayload(
  bytes: Uint8Array,
  contentType: string,
  provider: RouteProvider,
  routeId?: string
): ProxySuccessPayload | null {
  if (
    bytes.length >= 12 &&
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === '.FIT'
  ) {
    return {
      ok: true,
      provider,
      routeId,
      format: 'fit',
      fileName: `${provider}-${routeId || 'route'}.fit`,
      contentBase64: uint8ToBase64(bytes),
    };
  }

  const text = new TextDecoder('utf-8').decode(bytes);
  if (/<gpx\b/i.test(text) || contentType.includes('gpx+xml')) {
    return {
      ok: true,
      provider,
      routeId,
      format: 'gpx',
      fileName: `${provider}-${routeId || 'route'}.gpx`,
      content: text,
    };
  }
  if (/<TrainingCenterDatabase\b/i.test(text) || contentType.includes('tcx')) {
    return {
      ok: true,
      provider,
      routeId,
      format: 'tcx',
      fileName: `${provider}-${routeId || 'route'}.tcx`,
      content: text,
    };
  }
  return null;
}

async function tryRideWithGps(routeId: string): Promise<ProxySuccessPayload | null> {
  const gpxRes = await fetchUpstream(
    `https://ridewithgps.com/routes/${routeId}.gpx?sub_format=track`,
    'application/gpx+xml, application/xml, text/xml'
  );
  if (gpxRes) {
    const parsed = inspectRawPayload(gpxRes.bytes, gpxRes.contentType, 'ridewithgps', routeId);
    if (parsed) return parsed;
  }

  const jsonRes = await fetchUpstream(
    `https://ridewithgps.com/routes/${routeId}.json`,
    'application/json'
  );
  if (!jsonRes) return null;

  try {
    const data = JSON.parse(new TextDecoder('utf-8').decode(jsonRes.bytes));
    const rawPoints = data?.track_points || data?.route?.track_points;
    if (!Array.isArray(rawPoints) || rawPoints.length < 2) return null;

    const points = rawPoints
      .map((pt: { y?: number; lat?: number; x?: number; lng?: number; e?: number; alt?: number }) => ({
        lat: Number(pt.y ?? pt.lat),
        lon: Number(pt.x ?? pt.lng),
        ele: pt.e !== undefined ? Number(pt.e) : pt.alt !== undefined ? Number(pt.alt) : undefined,
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

    if (points.length < 2) return null;
    const name = String(data?.name || data?.route?.name || `RideWithGPS ${routeId}`);
    return {
      ok: true,
      provider: 'ridewithgps',
      routeId,
      format: 'gpx',
      fileName: `ridewithgps-${routeId}.gpx`,
      content: pointsToGpx(points, name),
    };
  } catch {
    return null;
  }
}

function extractKomootTourFromHtml(html: string): {
  name?: string;
  points: Array<{ lat: number; lon: number; ele?: number }>;
} | null {
  // Match raw or JSON-escaped "coordinates":{"items":[...]}
  const match =
    html.match(/"coordinates"\s*:\s*\{\s*"items"\s*:\s*(\[[^\]]+\])/i) ||
    html.match(/\\"coordinates\\"\s*:\s*\{\s*\\"items\\"\s*:\s*(\[[^\]]+\])/i);
  if (!match?.[1]) return null;

  try {
    const rawArrayStr = match[1].includes('\\"') ? match[1].replace(/\\"/g, '"') : match[1];
    const items = JSON.parse(rawArrayStr);
    if (!Array.isArray(items) || items.length < 2) return null;

    const points = items
      .map((it: { lat?: number; lng?: number; lon?: number; alt?: number }) => ({
        lat: Number(it.lat),
        lon: Number(it.lng ?? it.lon),
        ele: it.alt !== undefined ? Number(it.alt) : undefined,
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

    if (points.length < 2) return null;

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const name = titleMatch?.[1]?.replace(/\s*\|\s*Komoot.*$/i, '').trim();
    return { name, points };
  } catch {
    return null;
  }
}

async function tryKomoot(routeId: string, originalUrl: URL): Promise<ProxySuccessPayload | null> {
  const gpxRes = await fetchUpstream(
    `https://www.komoot.com/api/v007/tours/${routeId}.gpx`,
    'application/gpx+xml, application/xml'
  );
  if (gpxRes) {
    const parsed = inspectRawPayload(gpxRes.bytes, gpxRes.contentType, 'komoot', routeId);
    if (parsed) return parsed;
  }

  const pageUrl = originalUrl.searchParams.has('share_token')
    ? originalUrl.toString()
    : `https://www.komoot.com/tour/${routeId}`;
  const htmlRes = await fetchUpstream(pageUrl, 'text/html');
  if (!htmlRes) return null;

  const html = new TextDecoder('utf-8').decode(htmlRes.bytes);
  const extracted = extractKomootTourFromHtml(html);
  if (!extracted) return null;

  return {
    ok: true,
    provider: 'komoot',
    routeId,
    format: 'gpx',
    fileName: `komoot-${routeId}.gpx`,
    content: pointsToGpx(extracted.points, extracted.name || `Komoot ${routeId}`),
  };
}

async function tryBikemap(routeId: string): Promise<ProxySuccessPayload | null> {
  const gpxRes = await fetchUpstream(
    `https://www.bikemap.net/en/r/${routeId}/gpx/`,
    'application/gpx+xml, application/xml, text/xml'
  );
  if (!gpxRes) return null;
  return inspectRawPayload(gpxRes.bytes, gpxRes.contentType, 'bikemap', routeId);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function fetchUpstreamWithAuth(
  url: string,
  accessToken: string
): Promise<{ contentType: string; bytes: Uint8Array } | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        'User-Agent': 'CadenceRouteProxy/1.0 (+https://cadence.app)',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 16 || buf.byteLength > MAX_UPSTREAM_BYTES) return null;
    return {
      contentType: (res.headers.get('content-type') || '').toLowerCase(),
      bytes: new Uint8Array(buf),
    };
  } catch {
    return null;
  }
}

async function tryStravaRoute(
  routeId: string,
  connectionKey: string
): Promise<{ payload?: ProxySuccessPayload; reason?: string }> {
  if (!UUID_REGEX.test(connectionKey)) {
    return { reason: 'strava_not_connected' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const stravaClientId = Deno.env.get('STRAVA_CLIENT_ID') || '';
  const stravaClientSecret = Deno.env.get('STRAVA_CLIENT_SECRET') || '';
  if (!supabaseUrl || !serviceRoleKey) {
    return { reason: 'missing_supabase_config' };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: row } = await admin
    .from('user_integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('connection_key', connectionKey)
    .eq('provider', 'strava')
    .maybeSingle();

  if (!row?.access_token) {
    return { reason: 'strava_not_connected' };
  }

  let accessToken = String(row.access_token);
  const expiresAtMs = new Date(row.expires_at).getTime();

  // Refresh Strava OAuth token if expiring within 5 minutes
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now() + 300_000) {
    if (!stravaClientId || !stravaClientSecret) {
      return { reason: 'missing_strava_secrets' };
    }
    try {
      const refreshRes = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        body: JSON.stringify({
          client_id: stravaClientId,
          client_secret: stravaClientSecret,
          grant_type: 'refresh_token',
          refresh_token: row.refresh_token,
        }),
      });
      if (!refreshRes.ok) {
        return { reason: 'strava_token_refresh_failed' };
      }
      const refreshed = await refreshRes.json();
      if (!refreshed?.access_token) {
        return { reason: 'strava_token_refresh_failed' };
      }
      accessToken = String(refreshed.access_token);
      await admin
        .from('user_integrations')
        .update({
          access_token: accessToken,
          refresh_token: String(refreshed.refresh_token || row.refresh_token),
          expires_at: new Date(Number(refreshed.expires_at || 0) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('connection_key', connectionKey)
        .eq('provider', 'strava');
    } catch {
      return { reason: 'strava_token_refresh_failed' };
    }
  }

  const gpxRes = await fetchUpstreamWithAuth(
    `https://www.strava.com/api/v3/routes/${routeId}/export_gpx`,
    accessToken
  );
  if (gpxRes) {
    const parsed = inspectRawPayload(gpxRes.bytes, gpxRes.contentType, 'strava', routeId);
    if (parsed) return { payload: parsed };
  }

  const tcxRes = await fetchUpstreamWithAuth(
    `https://www.strava.com/api/v3/routes/${routeId}/export_tcx`,
    accessToken
  );
  if (tcxRes) {
    const parsed = inspectRawPayload(tcxRes.bytes, tcxRes.contentType, 'strava', routeId);
    if (parsed) return { payload: parsed };
  }

  return { reason: 'strava_route_unavailable' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { ok: false, provider: 'unknown', reason: 'Method not allowed; use POST.' },
      405
    );
  }

  let body: { url?: string; connectionKey?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, provider: 'unknown', reason: 'Invalid JSON body.' }, 400);
  }

  const rawUrl = typeof body?.url === 'string' ? body.url.trim() : '';
  const connectionKey = typeof body?.connectionKey === 'string' ? body.connectionKey.trim() : '';
  const safeUrl = isAllowedRouteUrl(rawUrl);
  if (!safeUrl) {
    return jsonResponse({
      ok: false,
      provider: 'unknown',
      reason: 'URL rejected by allowlist (must be public https:// link from supported hosts or direct .gpx/.tcx/.fit).',
    });
  }

  const { provider, routeId } = detectProvider(safeUrl);

  if (provider === 'strava' && routeId) {
    const stravaResult = await tryStravaRoute(routeId, connectionKey);
    if (stravaResult.payload) {
      return jsonResponse(stravaResult.payload);
    }
    return jsonResponse({
      ok: false,
      provider: 'strava',
      routeId,
      reason: stravaResult.reason || 'strava_not_connected',
    });
  }

  if (provider === 'strava') {
    return jsonResponse({
      ok: false,
      provider: 'strava',
      routeId,
      reason: 'Strava URL must contain a /routes/<id> path.',
    });
  }

  if (provider === 'ridewithgps' && routeId) {
    const result = await tryRideWithGps(routeId);
    if (result) return jsonResponse(result);
  } else if (provider === 'komoot' && routeId) {
    const result = await tryKomoot(routeId, safeUrl);
    if (result) return jsonResponse(result);
  } else if (provider === 'bikemap' && routeId) {
    const result = await tryBikemap(routeId);
    if (result) return jsonResponse(result);
  }

  // Fallback / direct file fetch
  const directRes = await fetchUpstream(safeUrl.toString());
  if (directRes) {
    const parsed = inspectRawPayload(directRes.bytes, directRes.contentType, provider, routeId);
    if (parsed) return jsonResponse(parsed);
  }

  return jsonResponse({
    ok: false,
    provider,
    routeId,
    reason: 'Upstream route is private, expired, or did not return a valid GPX/TCX/FIT payload.',
  });
});
