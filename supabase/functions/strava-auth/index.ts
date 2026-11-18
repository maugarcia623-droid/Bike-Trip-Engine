import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  CORS_HEADERS,
  UUID_REGEX,
  deleteOwnedIntegrationRow,
  findOwnedIntegrationRow,
  getFallbackRedirectOrigin,
  isAllowedRedirectOrigin,
  resolveRequestUser,
  signOAuthState,
  verifyOAuthState,
} from "../_shared/security.ts";

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const stravaClientId = Deno.env.get('STRAVA_CLIENT_ID') || '';
  const stravaClientSecret = Deno.env.get('STRAVA_CLIENT_SECRET') || '';

  // GET is strictly reserved for the Strava OAuth callback (never accepts connection_key or arbitrary redirect_origin).
  if (req.method === 'GET') {
    const reqUrl = new URL(req.url);
    const action = reqUrl.searchParams.get('action');
    if (action === 'authorize') {
      return jsonResponse(
        { ok: false, reason: 'use_post_authorize_url' },
        405
      );
    }

    const rawState = reqUrl.searchParams.get('state') || '';
    const state = await verifyOAuthState(rawState);
    const fallbackOrigin = getFallbackRedirectOrigin();
    const redirectOrigin = state?.redirectOrigin || fallbackOrigin;

    const stravaError = reqUrl.searchParams.get('error');
    if (stravaError) {
      return Response.redirect(
        `${redirectOrigin}/?strava_error=${encodeURIComponent(stravaError)}`,
        302
      );
    }

    const code = reqUrl.searchParams.get('code') || '';
    if (!code || !state || (state.provider && state.provider !== 'strava')) {
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

      const { data: existing } = await admin
        .from('user_integrations')
        .select('user_id')
        .eq('connection_key', state.connectionKey)
        .eq('provider', 'strava')
        .maybeSingle();

      if (existing?.user_id && existing.user_id !== state.userId) {
        return Response.redirect(`${redirectOrigin}/?strava_error=state_ownership_mismatch`, 302);
      }

      const { error: dbErr } = await admin.from('user_integrations').upsert(
        {
          connection_key: state.connectionKey,
          user_id: state.userId ?? existing?.user_id ?? null,
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
    let body: { action?: string; connectionKey?: string; redirectOrigin?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, reason: 'Invalid JSON body.' }, 400);
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, connected: false, reason: 'Missing Supabase server config.' }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const auth = await resolveRequestUser(req, admin);
    if (auth.invalidToken) {
      return jsonResponse({ ok: false, reason: 'invalid_auth_token' }, 401);
    }

    const action = body?.action || 'status';
    const connectionKey = typeof body?.connectionKey === 'string' ? body.connectionKey.trim() : '';

    if (action === 'authorize_url') {
      const safeOrigin = isAllowedRedirectOrigin(String(body?.redirectOrigin || ''));
      if (!safeOrigin) {
        return jsonResponse({ ok: false, reason: 'disallowed_redirect_origin' }, 400);
      }

      const resolvedKey = UUID_REGEX.test(connectionKey)
        ? connectionKey
        : auth.userId
        ? crypto.randomUUID()
        : '';

      if (!resolvedKey) {
        return jsonResponse({ ok: false, reason: 'invalid_connection_key' }, 400);
      }

      if (!stravaClientId) {
        return jsonResponse({ ok: false, reason: 'missing_strava_secrets' });
      }

      const state = await signOAuthState({
        provider: 'strava',
        connectionKey: resolvedKey,
        redirectOrigin: safeOrigin,
        userId: auth.userId ?? undefined,
      });

      if (!state) {
        return jsonResponse({ ok: false, reason: 'missing_oauth_state_secret' }, 500);
      }

      const callbackUrl = `${supabaseUrl}/functions/v1/strava-auth`;
      const authorizeUrl =
        `https://www.strava.com/oauth/authorize` +
        `?client_id=${encodeURIComponent(stravaClientId)}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&response_type=code` +
        `&approval_prompt=auto` +
        `&scope=read,read_all` +
        `&state=${encodeURIComponent(state)}`;

      return jsonResponse({ ok: true, authorizeUrl });
    }

    if (action === 'disconnect') {
      await deleteOwnedIntegrationRow(admin, { userId: auth.userId, connectionKey }, 'strava');
      return jsonResponse({ ok: true, connected: false });
    }

    const rows = await findOwnedIntegrationRow(
      admin,
      { userId: auth.userId, connectionKey },
      'strava',
      'athlete_id, athlete_name, expires_at'
    );
    const data = rows[0];

    return jsonResponse({
      ok: true,
      connected: Boolean(data),
      athleteId: data?.athlete_id ?? undefined,
      athleteName: data?.athlete_name ?? undefined,
    });
  }

  return jsonResponse({ ok: false, reason: 'Method not allowed.' }, 405);
});
