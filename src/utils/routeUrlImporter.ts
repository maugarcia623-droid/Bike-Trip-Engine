import { GpxParseResult, parseGpxFileContent } from './gpxParser';
import { parseFitFileBuffer, parseTcxFileContent } from './routeFileParser';
import { isSupabaseConfigured, supabase } from '../services/supabase';
import { getOrCreateIntegrationConnectionKey } from '../services/stravaIntegration';

export type RouteUrlProvider = 'komoot' | 'bikemap' | 'ridewithgps' | 'strava' | 'direct-file' | 'unknown';

export interface RouteUrlImportOutcome {
  ok: boolean;
  provider: RouteUrlProvider;
  routeId?: string;
  parsed?: GpxParseResult;
  fileName?: string;
  guidanceEn?: string;
  guidanceFr?: string;
}

export interface RouteProxyPayload {
  ok?: boolean;
  provider?: RouteUrlProvider;
  routeId?: string;
  format?: 'gpx' | 'tcx' | 'fit';
  fileName?: string;
  content?: string;
  contentBase64?: string;
  reason?: string;
}

export type RouteProxyInvoker = (
  url: string
) => Promise<{ data: RouteProxyPayload | null; error: unknown }>;

export function detectRouteUrlProvider(rawUrl: string): {
  provider: RouteUrlProvider;
  url: URL | null;
  routeId?: string;
} {
  const trimmed = rawUrl.trim();
  const matchHttp = trimmed.match(/https?:\/\/[^\s]+/i);
  const candidate = matchHttp ? matchHttp[0] : trimmed;

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(candidate);
  } catch {
    return { provider: 'unknown', url: null };
  }

  const host = parsedUrl.hostname.toLowerCase();
  const path = parsedUrl.pathname;

  if (/\.(gpx|tcx|fit)$/i.test(path)) {
    return { provider: 'direct-file', url: parsedUrl };
  }
  if (host.includes('komoot.')) {
    const m = path.match(/\/tour\/(\d+)/i);
    return { provider: 'komoot', url: parsedUrl, routeId: m?.[1] };
  }
  if (host.includes('bikemap.')) {
    const m = path.match(/\/r\/(\d+)/i);
    return { provider: 'bikemap', url: parsedUrl, routeId: m?.[1] };
  }
  if (host.includes('ridewithgps.')) {
    const m = path.match(/\/routes\/(\d+)/i);
    return { provider: 'ridewithgps', url: parsedUrl, routeId: m?.[1] };
  }
  if (host.includes('strava.')) {
    const m = path.match(/\/routes\/(\d+)/i);
    return { provider: 'strava', url: parsedUrl, routeId: m?.[1] };
  }

  return { provider: 'unknown', url: parsedUrl };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function convertTrackPointsToGpx(
  points: Array<{ lat: number; lon: number; ele?: number }>,
  name = 'Cadence Route'
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
    <name>${escapeXml(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function parseProxyRoutePayload(
  payload: RouteProxyPayload | null | undefined,
  fallbackProvider: RouteUrlProvider,
  fallbackRouteId?: string
): RouteUrlImportOutcome | null {
  if (!payload || !payload.ok) return null;

  const provider = payload.provider || fallbackProvider;
  const routeId = payload.routeId ?? fallbackRouteId;
  const format = payload.format;

  if (format === 'fit' && payload.contentBase64) {
    const fileName = payload.fileName || `${provider}-${routeId || 'route'}.fit`;
    const buf = base64ToArrayBuffer(payload.contentBase64);
    return {
      ok: true,
      provider,
      routeId,
      fileName,
      parsed: parseFitFileBuffer(buf, fileName),
    };
  }

  if (format === 'tcx' && payload.content) {
    const fileName = payload.fileName || `${provider}-${routeId || 'route'}.tcx`;
    return {
      ok: true,
      provider,
      routeId,
      fileName,
      parsed: parseTcxFileContent(payload.content, fileName),
    };
  }

  if (payload.content && (format === 'gpx' || /<gpx\b/i.test(payload.content))) {
    const fileName = payload.fileName || `${provider}-${routeId || 'route'}.gpx`;
    return {
      ok: true,
      provider,
      routeId,
      fileName,
      parsed: parseGpxFileContent(payload.content, fileName),
    };
  }

  return null;
}

async function defaultProxyInvoker(
  url: string
): Promise<{ data: RouteProxyPayload | null; error: unknown }> {
  const connectionKey = getOrCreateIntegrationConnectionKey();
  const { data, error } = await supabase.functions.invoke<RouteProxyPayload>('route-proxy', {
    body: { url, connectionKey },
  });
  return { data: data ?? null, error };
}

/**
 * Attempts to import a route from a pasted URL (direct .gpx/.tcx/.fit URL or
 * Komoot / Bikemap / RideWithGPS / Strava share link). Uses the Supabase
 * `route-proxy` Edge Function first to bypass browser CORS restrictions, then
 * falls back to direct fetching or clear provider guidance when private/auth-locked.
 */
export async function importRouteFromUrl(
  rawInput: string,
  options?: { proxyInvoker?: RouteProxyInvoker }
): Promise<RouteUrlImportOutcome> {
  const { provider, url, routeId } = detectRouteUrlProvider(rawInput);

  if (!url) {
    return {
      ok: false,
      provider: 'unknown',
      guidanceEn: 'Paste a valid https:// route link from Komoot, Bikemap, Ride with GPS, or a direct .gpx/.tcx/.fit URL.',
      guidanceFr: 'Collez un lien https:// valide depuis Komoot, Bikemap, Ride with GPS ou un fichier .gpx/.tcx/.fit.',
    };
  }

  const invoker = options?.proxyInvoker ?? (isSupabaseConfigured ? defaultProxyInvoker : null);
  if (invoker) {
    try {
      const { data, error } = await invoker(url.toString());
      if (!error && data?.ok) {
        const outcome = parseProxyRoutePayload(data, provider, routeId);
        if (outcome) return outcome;
      }
    } catch {
      // Cloud helper unavailable or returned non-importable route; fall through
    }
  }

  const candidateEndpoints: string[] = [];
  if (provider === 'direct-file' || provider === 'unknown') {
    candidateEndpoints.push(url.toString());
  } else if (provider === 'ridewithgps' && routeId) {
    candidateEndpoints.push(`https://ridewithgps.com/routes/${routeId}.gpx?sub_format=track`);
  } else if (provider === 'komoot' && routeId) {
    candidateEndpoints.push(`https://www.komoot.com/api/v007/tours/${routeId}.gpx`);
  } else if (provider === 'bikemap' && routeId) {
    candidateEndpoints.push(`https://www.bikemap.net/en/r/${routeId}/gpx/`);
  }

  for (const endpoint of candidateEndpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(endpoint, { signal: controller.signal });
      if (!res.ok) continue;
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 16) continue;

      const bytes = new Uint8Array(buf);
      if (
        bytes.length >= 12 &&
        String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === '.FIT'
      ) {
        const name = `${provider}-${routeId || 'route'}.fit`;
        return {
          ok: true,
          provider,
          routeId,
          fileName: name,
          parsed: parseFitFileBuffer(buf, name),
        };
      }

      const text = new TextDecoder('utf-8').decode(buf);
      if (/<gpx\b/i.test(text) || contentType.includes('gpx')) {
        const name = `${provider}-${routeId || 'route'}.gpx`;
        return {
          ok: true,
          provider,
          routeId,
          fileName: name,
          parsed: parseGpxFileContent(text, name),
        };
      }
      if (/<TrainingCenterDatabase\b/i.test(text) || contentType.includes('tcx')) {
        const name = `${provider}-${routeId || 'route'}.tcx`;
        return {
          ok: true,
          provider,
          routeId,
          fileName: name,
          parsed: parseTcxFileContent(text, name),
        };
      }
    } catch {
      // CORS or network block — fall through to provider-specific guidance
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const labelMap: Record<RouteUrlProvider, string> = {
    komoot: 'Komoot',
    bikemap: 'Bikemap',
    ridewithgps: 'Ride with GPS',
    strava: 'Strava',
    'direct-file': 'URL',
    unknown: 'Link',
  };
  const label = labelMap[provider];

  if (provider === 'strava') {
    return {
      ok: false,
      provider,
      routeId,
      guidanceEn: 'Strava routes require account connection or manual export. In Strava, tap Export GPX / FIT and drop or share the file here.',
      guidanceFr: 'Les parcours Strava nécessitent une connexion au compte ou un export manuel. Dans Strava, exportez le fichier .GPX ou .FIT puis déposez-le ici.',
    };
  }

  return {
    ok: false,
    provider,
    routeId,
    guidanceEn: `${label} could not be fetched automatically (route may be private or require sign-in). In ${label}, tap Export GPX / FIT and drop or share the file here.`,
    guidanceFr: `${label} n'a pas pu être importé automatiquement (parcours privé ou protégé). Dans ${label}, exportez le fichier .GPX ou .FIT puis déposez-le ou partagez-le ici.`,
  };
}
