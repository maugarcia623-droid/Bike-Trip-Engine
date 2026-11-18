const isSupabaseConfigured = Boolean(
  import.meta.env?.VITE_SUPABASE_URL &&
    import.meta.env?.VITE_SUPABASE_ANON_KEY &&
    import.meta.env?.VITE_SUPABASE_URL.startsWith('http')
);

const CONNECTION_KEY_STORAGE = 'cadence_integration_key_v1';
const STRAVA_STATUS_STORAGE = 'cadence_strava_status_v1';

export interface StravaConnectionStatus {
  connected: boolean;
  athleteName?: string;
  athleteId?: string;
  error?: string;
}

const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((fn) => fn());
}

function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const FALLBACK_EPHEMERAL_KEY = generateUuidV4();

export function getOrCreateIntegrationConnectionKey(): string {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return FALLBACK_EPHEMERAL_KEY;
    }
    const existing = window.localStorage.getItem(CONNECTION_KEY_STORAGE);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
      return existing;
    }
    const created = generateUuidV4();
    window.localStorage.setItem(CONNECTION_KEY_STORAGE, created);
    return created;
  } catch {
    return FALLBACK_EPHEMERAL_KEY;
  }
}

export function getCachedStravaStatus(): StravaConnectionStatus {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { connected: false };
    }
    const raw = window.localStorage.getItem(STRAVA_STATUS_STORAGE);
    if (!raw) return { connected: false };
    const parsed = JSON.parse(raw) as StravaConnectionStatus;
    return {
      connected: Boolean(parsed?.connected),
      athleteName: parsed?.athleteName,
      athleteId: parsed?.athleteId,
      error: parsed?.error,
    };
  } catch {
    return { connected: false };
  }
}

function saveCachedStravaStatus(status: StravaConnectionStatus): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STRAVA_STATUS_STORAGE, JSON.stringify(status));
    }
  } catch {
    // Ignore storage errors
  }
  notifyListeners();
}

export function subscribeStravaStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function consumeStravaOAuthRedirectParams(): StravaConnectionStatus | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const connectedParam = params.get('strava_connected');
  const athleteParam = params.get('strava_athlete');
  const errorParam = params.get('strava_error');

  if (!connectedParam && !errorParam) return null;

  params.delete('strava_connected');
  params.delete('strava_athlete');
  params.delete('strava_error');
  const qs = params.toString();
  const cleanUrl =
    window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
  window.history.replaceState({}, '', cleanUrl);

  if (connectedParam === '1') {
    const next: StravaConnectionStatus = {
      connected: true,
      athleteName: athleteParam || undefined,
    };
    saveCachedStravaStatus(next);
    return next;
  }

  const next: StravaConnectionStatus = {
    connected: false,
    error: errorParam || 'oauth_failed',
  };
  saveCachedStravaStatus(next);
  return next;
}

export async function startStravaOAuthConnect(): Promise<void> {
  if (typeof window === 'undefined' || !isSupabaseConfigured) return;
  try {
    const connectionKey = getOrCreateIntegrationConnectionKey();
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean;
      authorizeUrl?: string;
      reason?: string;
    }>('strava-auth', {
      body: {
        action: 'authorize_url',
        connectionKey,
        redirectOrigin: window.location.origin,
      },
    });
    if (!error && data?.ok && data.authorizeUrl) {
      window.location.assign(data.authorizeUrl);
      return;
    }
    saveCachedStravaStatus({
      connected: false,
      error: data?.reason || 'oauth_failed',
    });
  } catch {
    saveCachedStravaStatus({
      connected: false,
      error: 'oauth_failed',
    });
  }
}

export async function fetchStravaConnectionStatus(): Promise<StravaConnectionStatus> {
  if (!isSupabaseConfigured) {
    return getCachedStravaStatus();
  }
  try {
    const connectionKey = getOrCreateIntegrationConnectionKey();
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean;
      connected?: boolean;
      athleteName?: string;
      athleteId?: string;
    }>('strava-auth', {
      body: { action: 'status', connectionKey },
    });
    if (error || !data?.ok) {
      return getCachedStravaStatus();
    }
    const status: StravaConnectionStatus = {
      connected: Boolean(data.connected),
      athleteName: data.athleteName,
      athleteId: data.athleteId,
    };
    saveCachedStravaStatus(status);
    return status;
  } catch {
    return getCachedStravaStatus();
  }
}

export async function disconnectStravaAccount(): Promise<boolean> {
  saveCachedStravaStatus({ connected: false });
  if (!isSupabaseConfigured) return true;
  try {
    const connectionKey = getOrCreateIntegrationConnectionKey();
    const { supabase } = await import('./supabase');
    const { error } = await supabase.functions.invoke('strava-auth', {
      body: { action: 'disconnect', connectionKey },
    });
    return !error;
  } catch {
    return false;
  }
}
