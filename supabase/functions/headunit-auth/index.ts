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

type HeadUnitProvider = 'wahoo' | 'hammerhead' | 'garmin';

const PROVIDER_CONFIG: Record<
  HeadUnitProvider,
  {
    authorizeUrl: string;
    tokenUrl: string;
    scope: string;
    clientIdEnv: string;
    clientSecretEnv: string;
  }
> = {
  wahoo: {
    authorizeUrl: 'https://api.wahooligan.com/oauth/authorize',
    tokenUrl: 'https://api.wahooligan.com/oauth/token',
    scope: 'routes_write user_read',
    clientIdEnv: 'WAHOO_CLIENT_ID',
    clientSecretEnv: 'WAHOO_CLIENT_SECRET',
  },
  hammerhead: {
    authorizeUrl: 'https://api.hammerhead.io/v1/auth/oauth/authorize',
    tokenUrl: 'https://api.hammerhead.io/v1/auth/oauth/token',
    scope: 'routes:write',
    clientIdEnv: 'HAMMERHEAD_CLIENT_ID',
    clientSecretEnv: 'HAMMERHEAD_CLIENT_SECRET',
  },
  garmin: {
    authorizeUrl: 'https://connect.garmin.com/oauth2Confirm',
    tokenUrl: 'https://diauth.garmin.com/di-oauth2-service/oauth/token',
    scope: 'COURSE_EXPORT',
    clientIdEnv: 'GARMIN_CLIENT_ID',
    clientSecretEnv: 'GARMIN_CLIENT_SECRET',
  },
};

function isProvider(raw: unknown): raw is HeadUnitProvider {
  return raw === 'wahoo' || raw === 'hammerhead' || raw === 'garmin';
}

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

  // GET is strictly reserved for provider OAuth callbacks (never accepts connection_key or arbitrary redirect_origin).
  if (req.method === 'GET') {
    const reqUrl = new URL(req.url);
    const action = reqUrl.searchParams.get('action');
    if (action === 'authorize') {
      return jsonResponse({ ok: false, reason: 'use_post_authorize_url' }, 405);
    }

    const rawState = reqUrl.searchParams.get('state') || '';
    const state = await verifyOAuthState(rawState);
    const redirectOrigin = state?.redirectOrigin || getFallbackRedirectOrigin();
    const provider: HeadUnitProvider = isProvider(state?.provider) ? state.provider : 'wahoo';

    const oauthError = reqUrl.searchParams.get('error');
    if (oauthError) {
      return Response.redirect(
        `${redirectOrigin}/?headunit_error=${encodeURIComponent(oauthError)}&headunit_provider=${provider}`,
        302
      );
    }

    const code = reqUrl.searchParams.get('code') || '';
    if (!code || !state || !isProvider(state.provider)) {
      return Response.redirect(
        `${redirectOrigin}/?headunit_error=invalid_callback_state&headunit_provider=${provider}`,
        302
      );
    }

    const cfg = PROVIDER_CONFIG[state.provider];
    const clientId = Deno.env.get(cfg.clientIdEnv) || '';
    const clientSecret = Deno.env.get(cfg.clientSecretEnv) || '';
    if (!clientId || !clientSecret || !supabaseUrl || !serviceRoleKey) {
      return Response.redirect(
        `${redirectOrigin}/?headunit_error=missing_secrets&headunit_provider=${state.provider}`,
        302
      );
    }

    try {
      const callbackUrl = `${supabaseUrl}/functions/v1/headunit-auth`;
      const bodyParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
      });

      const tokenRes = await fetch(cfg.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(8000),
        body: bodyParams.toString(),
      });

      if (!tokenRes.ok) {
        return Response.redirect(
          `${redirectOrigin}/?headunit_error=token_exchange_failed&headunit_provider=${state.provider}`,
          302
        );
      }

      const tokenJson = await tokenRes.json();
      const accessToken = String(tokenJson?.access_token || '');
      const refreshToken = String(tokenJson?.refresh_token || '');
      const expiresInSec = Number(tokenJson?.expires_in || 7200);
      if (!accessToken) {
        return Response.redirect(
          `${redirectOrigin}/?headunit_error=invalid_token_payload&headunit_provider=${state.provider}`,
          302
        );
      }

      const admin = createClient(supabaseUrl, serviceRoleKey);

      const { data: existing } = await admin
        .from('user_integrations')
        .select('user_id')
        .eq('connection_key', state.connectionKey)
        .eq('provider', state.provider)
        .maybeSingle();

      if (existing?.user_id && existing.user_id !== state.userId) {
        return Response.redirect(
          `${redirectOrigin}/?headunit_error=state_ownership_mismatch&headunit_provider=${state.provider}`,
          302
        );
      }

      const { error: dbErr } = await admin.from('user_integrations').upsert(
        {
          connection_key: state.connectionKey,
          user_id: state.userId ?? existing?.user_id ?? null,
          provider: state.provider,
          athlete_name: state.provider.toUpperCase(),
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: new Date(Date.now() + expiresInSec * 1000).toISOString(),
          scopes: cfg.scope,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'connection_key,provider' }
      );

      if (dbErr) {
        return Response.redirect(
          `${redirectOrigin}/?headunit_error=storage_failed&headunit_provider=${state.provider}`,
          302
        );
      }

      return Response.redirect(
        `${redirectOrigin}/?headunit_connected=${state.provider}`,
        302
      );
    } catch {
      return Response.redirect(
        `${redirectOrigin}/?headunit_error=unexpected_oauth_error&headunit_provider=${state.provider}`,
        302
      );
    }
  }

  if (req.method === 'POST') {
    let body: {
      action?: string;
      connectionKey?: string;
      provider?: string;
      redirectOrigin?: string;
    };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, reason: 'Invalid JSON body.' }, 400);
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({
        ok: true,
        statuses: { wahoo: false, hammerhead: false, garmin: false },
      });
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

      if (!isProvider(body?.provider)) {
        return jsonResponse({ ok: false, reason: 'unsupported_provider' }, 400);
      }

      const resolvedKey = UUID_REGEX.test(connectionKey)
        ? connectionKey
        : auth.userId
        ? crypto.randomUUID()
        : '';

      if (!resolvedKey) {
        return jsonResponse({ ok: false, reason: 'invalid_connection_key' }, 400);
      }

      const cfg = PROVIDER_CONFIG[body.provider];
      const clientId = Deno.env.get(cfg.clientIdEnv) || '';
      if (!clientId) {
        return jsonResponse({
          ok: false,
          reason: 'missing_secrets',
          provider: body.provider,
        });
      }

      const state = await signOAuthState({
        provider: body.provider,
        connectionKey: resolvedKey,
        redirectOrigin: safeOrigin,
        userId: auth.userId ?? undefined,
      });

      if (!state) {
        return jsonResponse({ ok: false, reason: 'missing_oauth_state_secret' }, 500);
      }

      const callbackUrl = `${supabaseUrl}/functions/v1/headunit-auth`;
      const authorizeUrl =
        `${cfg.authorizeUrl}` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(cfg.scope)}` +
        `&state=${encodeURIComponent(state)}`;

      return jsonResponse({ ok: true, authorizeUrl, provider: body.provider });
    }

    if (action === 'disconnect' && isProvider(body?.provider)) {
      await deleteOwnedIntegrationRow(admin, { userId: auth.userId, connectionKey }, body.provider);
      return jsonResponse({ ok: true, disconnected: body.provider });
    }

    const rows = await findOwnedIntegrationRow(
      admin,
      { userId: auth.userId, connectionKey },
      ['wahoo', 'hammerhead', 'garmin'],
      'provider'
    );

    const connectedSet = new Set(rows.map((r: { provider: string }) => r.provider));
    return jsonResponse({
      ok: true,
      statuses: {
        wahoo: connectedSet.has('wahoo'),
        hammerhead: connectedSet.has('hammerhead'),
        garmin: connectedSet.has('garmin'),
      },
    });
  }

  return jsonResponse({ ok: false, reason: 'Method not allowed.' }, 405);
});
