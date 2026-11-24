declare const process: { env: Record<string, string | undefined> };

const SHORT_CODE_REGEX = /^[a-z0-9]{6,16}$/i;

const BOT_UA_REGEX =
  /facebookexternalhit|facebot|twitterbot|whatsapp|slackbot|discordbot|telegrambot|linkedinbot|applebot|skypeuripreview|embedly|pinterest|vkshare|redditbot|signal|line-poker|googlebot|bingbot|duckduckbot|kakaotalk|viber|mattermost|imessage|linkpresentation/i;

interface SharedPlanPreviewRow {
  code: string;
  title?: string | null;
  summary?: string | null;
  distance_km?: number | null;
  elevation_m?: number | null;
  stage_count?: number | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveOrigin(request: Request, url: URL): string {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host') || url.host;
  const proto = forwardedProto || url.protocol.replace(/:$/, '') || 'https';
  return `${proto}://${host}`;
}

function extractCode(url: URL): string {
  const queryCode = (url.searchParams.get('code') || '').trim().toLowerCase();
  if (SHORT_CODE_REGEX.test(queryCode)) return queryCode;
  const pathMatch = url.pathname.match(/^\/p\/([a-z0-9]{6,16})\/?$/i);
  if (pathMatch?.[1]) return pathMatch[1].toLowerCase();
  return '';
}

async function fetchSharedPlanMeta(code: string): Promise<SharedPlanPreviewRow | null> {
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const supabaseAnonKey = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseAnonKey || !code) return null;

  try {
    const res = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/get_shared_plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ p_code: code }),
      signal: AbortSignal.timeout(2500),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== 'object') return null;
    return row as SharedPlanPreviewRow;
  } catch (err) {
    console.error('Failed to fetch shared plan preview metadata:', err);
    return null;
  }
}

function buildMetaValues(origin: string, code: string, plan: SharedPlanPreviewRow | null) {
  const defaultTitle = 'Cadence — Shared Ride Plan';
  const defaultDesc =
    'Open this shared ride plan in Cadence to view route weather, resupply stops, pacing, and fueling adapted to your bike.';

  const rawTitle = plan?.title?.trim();
  const title = rawTitle ? `${rawTitle} · Cadence Ride Plan` : defaultTitle;

  const rawSummary = plan?.summary?.trim();
  const description = rawSummary
    ? `${rawSummary} — Open in Cadence to adapt pacing, weather & fueling to your bike.`
    : defaultDesc;

  const canonicalUrl = code ? `${origin}/p/${code}` : `${origin}/`;
  const imageUrl = `${origin}/images/ride-plan-light.jpg`;

  return { title, description, canonicalUrl, imageUrl };
}

function buildBotHtml(meta: ReturnType<typeof buildMetaValues>, redirectTarget: string): string {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const u = escapeHtml(meta.canonicalUrl);
  const img = escapeHtml(meta.imageUrl);
  const target = escapeHtml(redirectTarget);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${t}</title>
    <meta name="description" content="${d}" />
    <link rel="canonical" href="${u}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Cadence" />
    <meta property="og:url" content="${u}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:image" content="${img}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${img}" />
  </head>
  <body>
    <script>window.location.replace(${JSON.stringify(redirectTarget)});</script>
    <noscript><meta http-equiv="refresh" content="0;url=${target}" /></noscript>
  </body>
</html>`;
}

function injectMetaIntoSpaHtml(
  html: string,
  meta: ReturnType<typeof buildMetaValues>
): string {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const u = escapeHtml(meta.canonicalUrl);
  const img = escapeHtml(meta.imageUrl);

  let out = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${d}" />`)
    .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${t}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${d}" />`)
    .replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${img}" />`)
    .replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${t}" />`)
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${d}" />`)
    .replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${img}" />`);

  if (!/<meta\s+property="og:url"/i.test(out)) {
    out = out.replace('</head>', `    <meta property="og:url" content="${u}" />\n  </head>`);
  }

  return out;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const origin = resolveOrigin(request, url);
  const code = extractCode(url);

  if (!code) {
    return Response.redirect(`${origin}/`, 302);
  }

  const plan = await fetchSharedPlanMeta(code);
  const meta = buildMetaValues(origin, code, plan);
  const redirectTarget = `/?p=${encodeURIComponent(code)}`;
  const userAgent = request.headers.get('user-agent') || '';

  if (BOT_UA_REGEX.test(userAgent)) {
    return new Response(buildBotHtml(meta, redirectTarget), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      },
    });
  }

  // For browsers and generic link previewers: serve the real SPA shell with dynamic OG tags injected
  // so the clean /p/<code> URL renders rich metadata AND boots directly into the ride without an extra redirect.
  try {
    const forwardHeaders: Record<string, string> = { Accept: 'text/html' };
    const cookie = request.headers.get('cookie');
    if (cookie) forwardHeaders.cookie = cookie;

    const shellRes = await fetch(`${origin}/index.html`, {
      headers: forwardHeaders,
      signal: AbortSignal.timeout(2000),
    });

    if (shellRes.ok) {
      const shellHtml = await shellRes.text();
      if (shellHtml.includes('</head>')) {
        return new Response(injectMetaIntoSpaHtml(shellHtml, meta), {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=3600',
          },
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch SPA shell for shared plan route, falling back to redirect:', err);
  }

  return Response.redirect(`${origin}${redirectTarget}`, 302);
}
