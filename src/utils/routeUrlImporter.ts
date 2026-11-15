import { GpxParseResult, parseGpxFileContent } from './gpxParser';
import { parseFitFileBuffer, parseTcxFileContent } from './routeFileParser';

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

/**
 * Attempts to import a route from a pasted URL (direct .gpx/.tcx/.fit URL or
 * Komoot / Bikemap / RideWithGPS / Strava share link). When browser CORS or
 * private route auth blocks direct fetching, returns structured guidance so
 * the user can export GPX/FIT from that app and drop or share it into Cadence.
 */
export async function importRouteFromUrl(rawInput: string): Promise<RouteUrlImportOutcome> {
  const { provider, url, routeId } = detectRouteUrlProvider(rawInput);

  if (!url) {
    return {
      ok: false,
      provider: 'unknown',
      guidanceEn: 'Paste a valid https:// route link from Komoot, Bikemap, Ride with GPS, or a direct .gpx/.tcx/.fit URL.',
      guidanceFr: 'Collez un lien https:// valide depuis Komoot, Bikemap, Ride with GPS ou un fichier .gpx/.tcx/.fit.',
    };
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
    try {
      const res = await fetch(endpoint);
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

  return {
    ok: false,
    provider,
    routeId,
    guidanceEn: `${label} blocks direct browser download on shared links (CORS/auth). In ${label}, tap Export GPX / FIT and drop or share the file here.`,
    guidanceFr: `${label} bloque le téléchargement direct dans le navigateur (CORS/compte). Dans ${label}, exportez le fichier .GPX ou .FIT puis déposez-le ou partagez-le ici.`,
  };
}
