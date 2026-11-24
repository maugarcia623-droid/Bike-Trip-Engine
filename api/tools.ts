const BOT_UA_REGEX =
  /facebookexternalhit|facebot|twitterbot|whatsapp|slackbot|discordbot|telegrambot|linkedinbot|applebot|skypeuripreview|embedly|pinterest|vkshare|redditbot|signal|line-poker|googlebot|bingbot|duckduckbot|kakaotalk|viber|mattermost|imessage|linkpresentation/i;

interface ToolSeoRecord {
  slug: string;
  title: string;
  description: string;
}

const TOOL_SEO_MAP: Record<string, ToolSeoRecord> = {
  hub: {
    slug: '',
    title: 'Cadence Free Cycling Tools — Fuel, Wind Flipper, Water Radar & Stem Sticker',
    description:
      'Free browser-only cycling tools with zero signup: real-food fueling planner, clockwise vs. counter-clockwise loop wind flipper, GPX water & bakery scanner, printable top-tube stem sticker, tyre pressure, and kit advisor.',
  },
  'fuel-plan': {
    slug: 'fuel-plan',
    title: 'Cycling Real-Food Fuel & Bottle Calculator (Free) — Cadence',
    description:
      'Calculate exact cycling carbs, bottles, and real-food portions (dates, oat bars, vegan/GF options) with a copyable grocery list. Free, no login.',
  },
  'flip-my-loop': {
    slug: 'flip-my-loop',
    title: 'Cycling Loop Wind Direction Checker: Clockwise or Counter-Clockwise? — Cadence',
    description:
      'Drop any cycling loop GPX and compare clockwise vs. counter-clockwise wind cost in minutes and watts saved. Instant browser tool, free.',
  },
  'water-bakery': {
    slug: 'water-bakery',
    title: 'GPX Water Fountain & Open Bakery Scanner for Cycling — Cadence',
    description:
      'Scan any GPX cycling route for drinking water taps, cemetery spigots, water deserts, and bakeries open when you actually arrive. Free, no signup.',
  },
  'stem-sticker': {
    slug: 'stem-sticker',
    title: 'Free Cycling Top-Tube Cue Sticker Generator (Printable) — Cadence',
    description:
      'Turn any GPX route into a real-scale printable top-tube stem sticker with climb splits, open water/bakery markers, and fueling cues.',
  },
  'tyre-pressure': {
    slug: 'tyre-pressure',
    title: 'Road & Gravel Cycling Tyre Pressure Calculator (ETRTO Hookless Safe) — Cadence',
    description:
      'Calculate front and rear road or gravel tyre pressure using the 15% drop method, ETRTO 5-bar hookless cap, and optional GPX surface detection.',
  },
  'what-to-wear': {
    slug: 'what-to-wear',
    title: 'What to Wear Cycling Calculator (Wind Chill & Bike Lights) — Cadence',
    description:
      'Get exact cycling clothing layers and front light lumen advice based on temperature, wind chill at riding speed, rain risk, and twilight.',
  },
  'leave-by': {
    slug: 'leave-by',
    title: 'Bike Commute Leave-By Time Calculator (With Wind & Shower Buffer) — Cadence',
    description:
      'Know the exact minute to leave by bike so you arrive on time with headwind slowdown, coffee stop, and locker/shower buffer built in.',
  },
  'wind-cost': {
    slug: 'wind-cost',
    title: 'Cycling Headwind Cost Calculator (Watts & Minutes) — Cadence',
    description:
      'See how many watts and minutes a headwind, crosswind, or tailwind costs on your road, gravel, or commuter bike using real aerodynamic physics.',
  },
};

const ALIAS_MAP: Record<string, string> = {
  fuel: 'fuel-plan',
  nutrition: 'fuel-plan',
  flip: 'flip-my-loop',
  'loop-wind': 'flip-my-loop',
  water: 'water-bakery',
  bakery: 'water-bakery',
  resupply: 'water-bakery',
  sticker: 'stem-sticker',
  'top-tube': 'stem-sticker',
  pressure: 'tyre-pressure',
  wear: 'what-to-wear',
  kit: 'what-to-wear',
  wind: 'wind-cost',
};

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

function resolveSeoRecord(url: URL): ToolSeoRecord {
  const rawSlug =
    (url.searchParams.get('slug') || '').trim().toLowerCase() ||
    (url.pathname.match(/^\/tools\/([a-z0-9-]+)\/?$/i)?.[1] || '').toLowerCase();

  if (!rawSlug) return TOOL_SEO_MAP.hub;
  const canonicalKey = ALIAS_MAP[rawSlug] || rawSlug;
  return TOOL_SEO_MAP[canonicalKey] || TOOL_SEO_MAP.hub;
}

function injectMetaIntoSpaHtml(
  html: string,
  meta: { title: string; description: string; canonicalUrl: string; imageUrl: string }
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

  if (!/<link\s+rel="canonical"/i.test(out)) {
    out = out.replace('</head>', `    <link rel="canonical" href="${u}" />\n  </head>`);
  }
  if (!/<meta\s+property="og:url"/i.test(out)) {
    out = out.replace('</head>', `    <meta property="og:url" content="${u}" />\n  </head>`);
  }

  return out;
}

function buildBotHtml(meta: { title: string; description: string; canonicalUrl: string; imageUrl: string }): string {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const u = escapeHtml(meta.canonicalUrl);
  const img = escapeHtml(meta.imageUrl);

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
    <main>
      <h1>${t}</h1>
      <p>${d}</p>
      <p><a href="${u}">Open in Cadence</a></p>
    </main>
  </body>
</html>`;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const origin = resolveOrigin(request, url);
  const record = resolveSeoRecord(url);
  const canonicalPath = record.slug ? `/tools/${record.slug}` : '/tools';

  const meta = {
    title: record.title,
    description: record.description,
    canonicalUrl: `${origin}${canonicalPath}`,
    imageUrl: `${origin}/images/ride-plan-light.jpg`,
  };

  const userAgent = request.headers.get('user-agent') || '';
  if (BOT_UA_REGEX.test(userAgent)) {
    return new Response(buildBotHtml(meta), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  }

  try {
    const shellRes = await fetch(`${origin}/index.html`, {
      headers: { Accept: 'text/html' },
      signal: AbortSignal.timeout(2000),
    });

    if (shellRes.ok) {
      const shellHtml = await shellRes.text();
      if (shellHtml.includes('</head>')) {
        return new Response(injectMetaIntoSpaHtml(shellHtml, meta), {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
          },
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch SPA shell for /tools route:', err);
  }

  return Response.redirect(`${origin}/?tool=${encodeURIComponent(record.slug || 'fuel-plan')}`, 302);
}
