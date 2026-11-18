import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function isAllowedRedirectOrigin(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:') return parsed.origin;
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return parsed.origin;
    }
    return null;
  } catch {
    return null;
  }
}

function encodeState(payload: { connectionKey: string; redirectOrigin: string }): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeState(rawState: string): { connectionKey: string; redirectOrigin: string } | null {
  try {
    const padded = rawState.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((rawState.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed?.connectionKey || !UUID_REGEX.test(parsed.connectionKey)) return null;
    const safeOrigin = isAllowedRedirectOrigin(String(parsed.redirectOrigin || ''));
    if (!safeOrigin) return null;
    return { connectionKey: parsed.connectionKey, redirectOrigin: safeOrigin };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const stravaClientId = Deno.env.get('STRAVA_CLIENT_ID') || '';
  const stravaClientSecret = Deno.env.get('STRAVA_CLIENT_SECRET') || '';

  if (req.method === 'GET') {
    const reqUrl = new URL(req.url);
    const action = reqUrl.searchParams.get('action');

    // Step 1: Start Strava OAuth flow
    if (action === 'authorize') {
      const connectionKey = reqUrl.searchParams.get('connection_key') || '';
      const rawOrigin = reqUrl.searchParams.get('redirect_origin') || 'http://localhost:5173';
      const redirectOrigin = isAllowedRedirectOrigin(rawOrigin) || 'http://localhost:5173';

      if (!UUID_REGEX.test(connectionKey)) {
        return Response.redirect(`${redirectOrigin}/?strava_error=invalid_connection_key`, 302);
      }

      if (!stravaClientId || !supabaseUrl) {
        return Response.redirect(`${redirectOrigin}/?strava_error=missing_strava_secrets`, 302);
      }

      const callbackUrl = `${supabaseUrl}/functions/v1/strava-auth`;
      const state = encodeState({ connectionKey, redirectOrigin });
      const authorizeUrl =
        `https://www.strava.com/oauth/authorize` +
        `?client_id=${encodeURIComponent(stravaClientId)}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&response_type=code` +
        `&approval_prompt=auto` +
        `&scope=read,read_all` +
        `&state=${encodeURIComponent(state)}`;

      return Response.redirect(authorizeUrl, 302);
    }

    // Step 2: OAuth callback from Strava
    const rawState = reqUrl.searchParams.get('state') || '';
    const state = decodeState(rawState);
    const fallbackOrigin = 'http://localhost:5173';
    const redirectOrigin = state?.redirectOrigin || fallbackOrigin;

    const stravaError = reqUrl.searchParams.get('error');
    if (stravaError) {
      return Response.redirect(
        `${redirectOrigin}/?strava_error=${encodeURIComponent(stravaError)}`,
        302
      );
    }

    const code = reqUrl.searchParams.get('code') || '';
    if (!code || !state) {
      return Response.redirect(`${redirectOrigin}/?strava_error=invalid_callback_state`, 302);
    }

    if (!stravaClientId || !stravaClientSecret || !supabaseUrl || !serviceRoleKey) {
      return Response.redirect(`${redirectOrigin}/?strava_error=missing_strava_secrets`, 302);
    }

    try {
      const tokenRes = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          client_id: stravaClientId,
          client_secret: stravaClientSecret,
          code,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        return Response.redirect(`${redirectOrigin}/?strava_error=token_exchange_failed`, 302);
      }

      const tokenJson = await tokenRes.json();
      const accessToken = String(tokenJson?.access_token || '');
      const refreshToken = String(tokenJson?.refresh_token || '');
      const expiresAtSec = Number(tokenJson?.expires_at || 0);
      if (!accessToken || !refreshToken || !expiresAtSec) {
        return Response.redirect(`${redirectOrigin}/?strava_error=invalid_token_payload`, 302);
      }

      const athlete = tokenJson?.athlete || {};
      const athleteId = athlete?.id ? String(athlete.id) : null;
      const athleteName =
        [athlete?.firstname, athlete?.lastname].filter(Boolean).join(' ').trim() ||
        athlete?.username ||
        'Strava Rider';

      const admin = createClient(supabaseUrl, serviceRoleKey);
      const { error: dbErr } = await admin.from('user_integrations').upsert(
        {
          connection_key: state.connectionKey,
          provider: 'strava',
          athlete_id: athleteId,
          athlete_name: athleteName,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: new Date(expiresAtSec * 1000).toISOString(),
          scopes: reqUrl.searchParams.get('scope') || 'read,read_all',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'connection_key,provider' }
      );

      if (dbErr) {
        return Response.redirect(`${redirectOrigin}/?strava_error=storage_failed`, 302);
      }

      return Response.redirect(
        `${redirectOrigin}/?strava_connected=1&strava_athlete=${encodeURIComponent(athleteName)}`,
        302
      );
    } catch {
      return Response.redirect(`${redirectOrigin}/?strava_error=unexpected_oauth_error`, 302);
    }
  }

  if (req.method === 'POST') {
    let body: { action?: string; connectionKey?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, reason: 'Invalid JSON body.' }, 400);
    }

    const action = body?.action || 'status';
    const connectionKey = typeof body?.connectionKey === 'string' ? body.connectionKey.trim() : '';
    if (!UUID_REGEX.test(connectionKey)) {
      return jsonResponse({ ok: true, connected: false });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, connected: false, reason: 'Missing Supabase server config.' }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (action === 'disconnect') {
      await admin
        .from('user_integrations')
        .delete()
        .eq('connection_key', connectionKey)
        .eq('provider', 'strava');
      return jsonResponse({ ok: true, connected: false });
    }

    const { data } = await admin
      .from('user_integrations')
      .select('athlete_id, athlete_name, expires_at')
      .eq('connection_key', connectionKey)
      .eq('provider', 'strava')
      .maybeSingle();

    return jsonResponse({
      ok: true,
      connected: Boolean(data),
      athleteId: data?.athlete_id ?? undefined,
      athleteName: data?.athlete_name ?? undefined,
    });
  }

  return jsonResponse({ ok: false, reason: 'Method not allowed.' }, 405);
});
