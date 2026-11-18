import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  CORS_HEADERS,
  UUID_REGEX,
  findOwnedIntegrationRow,
  parseStrictFitBase64,
  resolveRequestUser,
} from "../_shared/security.ts";

type HeadUnitProvider = 'wahoo' | 'hammerhead' | 'garmin';

const PROVIDER_REFRESH_CONFIG: Record<
  HeadUnitProvider,
  {
    tokenUrl: string;
    clientIdEnv: string;
    clientSecretEnv: string;
  }
> = {
  wahoo: {
    tokenUrl: 'https://api.wahooligan.com/oauth/token',
    clientIdEnv: 'WAHOO_CLIENT_ID',
    clientSecretEnv: 'WAHOO_CLIENT_SECRET',
  },
  hammerhead: {
    tokenUrl: 'https://api.hammerhead.io/v1/auth/oauth/token',
    clientIdEnv: 'HAMMERHEAD_CLIENT_ID',
    clientSecretEnv: 'HAMMERHEAD_CLIENT_SECRET',
  },
  garmin: {
    tokenUrl: 'https://diauth.garmin.com/di-oauth2-service/oauth/token',
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

function sanitizeFileName(raw: string): string {
  const cleaned = raw
    .replace(/[\r\n\t\\/]+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 115);
  if (!cleaned) return 'cadence-route.fit';
  return cleaned.toLowerCase().endsWith('.fit') ? cleaned : `${cleaned}.fit`;
}

async function refreshHeadUnitAccessToken(
  // deno-lint-ignore no-explicit-any
  admin: any,
  row: { id: number; refresh_token?: string | null },
  provider: HeadUnitProvider
): Promise<{ accessToken?: string; reason?: string }> {
  const refreshToken = String(row.refresh_token || '').trim();
  if (!refreshToken) {
    return { reason: `${provider}_token_refresh_failed` };
  }

  const cfg = PROVIDER_REFRESH_CONFIG[provider];
  const clientId = Deno.env.get(cfg.clientIdEnv) || '';
  const clientSecret = Deno.env.get(cfg.clientSecretEnv) || '';
  if (!clientId || !clientSecret) {
    return { reason: `missing_${provider}_secrets` };
  }

  try {
    const bodyParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    const res = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(8000),
      body: bodyParams.toString(),
    });
    if (!res.ok) {
      return { reason: `${provider}_token_refresh_failed` };
    }
    const refreshed = await res.json();
    const nextAccessToken = String(refreshed?.access_token || '');
    if (!nextAccessToken) {
      return { reason: `${provider}_token_refresh_failed` };
    }

    const nextRefreshToken = String(refreshed?.refresh_token || refreshToken);
    const expiresInSec = Number(refreshed?.expires_in || 7200);
    await admin
      .from('user_integrations')
      .update({
        access_token: nextAccessToken,
        refresh_token: nextRefreshToken,
        expires_at: new Date(Date.now() + expiresInSec * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    return { accessToken: nextAccessToken };
  } catch {
    return { reason: `${provider}_token_refresh_failed` };
  }
}

async function uploadCourseToProvider(
  provider: HeadUnitProvider,
  accessToken: string,
  fileBytes: Uint8Array,
  fileName: string,
  courseName: string
): Promise<Response> {
  if (provider === 'wahoo') {
    const form = new FormData();
    form.append('route[name]', courseName);
    form.append(
      'route[file]',
      new Blob([fileBytes], { type: 'application/octet-stream' }),
      fileName
    );
    return fetch('https://api.wahooligan.com/v1/routes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
      body: form,
    });
  }

  if (provider === 'hammerhead') {
    const form = new FormData();
    form.append(
      'file',
      new Blob([fileBytes], { type: 'application/octet-stream' }),
      fileName
    );
    return fetch('https://api.hammerhead.io/v1/routes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
      body: form,
    });
  }

  // Garmin Courses API
  return fetch('https://apis.garmin.com/training-api/courses/v1/course', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    signal: AbortSignal.timeout(10000),
    body: fileBytes,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, reason: 'Method not allowed; use POST.' }, 405);
  }

  let body: {
    provider?: string;
    connectionKey?: string;
    fileName?: string;
    courseName?: string;
    contentBase64?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, reason: 'Invalid JSON body.' }, 400);
  }

  const provider = body?.provider;
  const connectionKey = typeof body?.connectionKey === 'string' ? body.connectionKey.trim() : '';
  const fileName = sanitizeFileName(String(body?.fileName || 'cadence-route.fit'));
  const courseName = String(body?.courseName || 'Cadence Route').trim().slice(0, 80) || 'Cadence Route';

  if (!isProvider(provider)) {
    return jsonResponse({ ok: false, reason: 'Unsupported head-unit provider.' }, 400);
  }

  const parsedPayload = parseStrictFitBase64(body?.contentBase64);
  if (!parsedPayload.ok) {
    return jsonResponse({ ok: false, reason: parsedPayload.reason }, 400);
  }
  const fileBytes = parsedPayload.bytes;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, reason: 'Missing Supabase server config.' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const auth = await resolveRequestUser(req, admin);
  if (auth.invalidToken) {
    return jsonResponse({ ok: false, reason: 'invalid_auth_token' }, 401);
  }

  if (!auth.userId && !UUID_REGEX.test(connectionKey)) {
    return jsonResponse({ ok: false, reason: 'not_connected' });
  }

  const rows = await findOwnedIntegrationRow(
    admin,
    { userId: auth.userId, connectionKey },
    provider,
    'id, access_token, refresh_token, expires_at'
  );
  const row = rows[0];

  if (!row?.access_token) {
    return jsonResponse({ ok: false, reason: 'not_connected' });
  }

  let accessToken = String(row.access_token);
  let didRefresh = false;
  const expiresAtMs = new Date(row.expires_at).getTime();

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now() + 300_000) {
    const refreshed = await refreshHeadUnitAccessToken(admin, row, provider);
    if (!refreshed.accessToken) {
      return jsonResponse({ ok: false, reason: refreshed.reason || `${provider}_token_refresh_failed` });
    }
    accessToken = refreshed.accessToken;
    didRefresh = true;
  }

  try {
    let res = await uploadCourseToProvider(provider, accessToken, fileBytes, fileName, courseName);

    if (res.status === 401 && !didRefresh) {
      const refreshed = await refreshHeadUnitAccessToken(admin, row, provider);
      if (refreshed.accessToken) {
        accessToken = refreshed.accessToken;
        res = await uploadCourseToProvider(provider, accessToken, fileBytes, fileName, courseName);
      }
    }

    if (!res.ok) {
      return jsonResponse({ ok: false, reason: `${provider}_upload_failed_${res.status}` });
    }

    const json = await res.json();
    const externalId =
      provider === 'garmin' ? String(json?.courseId || '') : String(json?.id || '');
    return jsonResponse({ ok: true, provider, externalId });
  } catch {
    return jsonResponse({ ok: false, reason: `${provider}_network_error` });
  }
});
