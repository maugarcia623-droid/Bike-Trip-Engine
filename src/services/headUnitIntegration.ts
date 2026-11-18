import { getOrCreateIntegrationConnectionKey } from './stravaIntegration';
import { TripProfile } from '../types/trip';
import { exportTripToFit, FitExportOptions } from '../utils/fitExporter';

const isSupabaseConfigured = Boolean(
  import.meta.env?.VITE_SUPABASE_URL &&
    import.meta.env?.VITE_SUPABASE_ANON_KEY &&
    import.meta.env?.VITE_SUPABASE_URL.startsWith('http')
);

export type HeadUnitProvider = 'wahoo' | 'hammerhead' | 'garmin';

/**
 * Shelved until Wahoo / Hammerhead / Garmin developer keys are configured.
 * Flip to `true` once OAuth client secrets are added in Supabase.
 */
export const HEADUNIT_PUSH_ENABLED = false;

export interface HeadUnitStatuses {
  wahoo: boolean;
  hammerhead: boolean;
  garmin: boolean;
  lastError?: string;
  lastErrorProvider?: HeadUnitProvider;
}

const HEADUNIT_STATUS_STORAGE = 'cadence_headunit_status_v1';
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((fn) => fn());
}

export function getCachedHeadUnitStatuses(): HeadUnitStatuses {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { wahoo: false, hammerhead: false, garmin: false };
    }
    const raw = window.localStorage.getItem(HEADUNIT_STATUS_STORAGE);
    if (!raw) return { wahoo: false, hammerhead: false, garmin: false };
    const parsed = JSON.parse(raw) as Partial<HeadUnitStatuses>;
    return {
      wahoo: Boolean(parsed?.wahoo),
      hammerhead: Boolean(parsed?.hammerhead),
      garmin: Boolean(parsed?.garmin),
      lastError: parsed?.lastError,
      lastErrorProvider: parsed?.lastErrorProvider,
    };
  } catch {
    return { wahoo: false, hammerhead: false, garmin: false };
  }
}

function saveCachedHeadUnitStatuses(next: HeadUnitStatuses): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(HEADUNIT_STATUS_STORAGE, JSON.stringify(next));
    }
  } catch {
    // Ignore storage errors
  }
  notifyListeners();
}

export function subscribeHeadUnitStatuses(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function consumeHeadUnitOAuthRedirectParams(): HeadUnitStatuses | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const connectedProvider = params.get('headunit_connected') as HeadUnitProvider | null;
  const errorCode = params.get('headunit_error');
  const errorProvider = params.get('headunit_provider') as HeadUnitProvider | null;

  if (!connectedProvider && !errorCode) return null;

  params.delete('headunit_connected');
  params.delete('headunit_error');
  params.delete('headunit_provider');
  const qs = params.toString();
  window.history.replaceState(
    {},
    '',
    window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash
  );

  const cur = getCachedHeadUnitStatuses();
  if (connectedProvider) {
    const next: HeadUnitStatuses = {
      ...cur,
      [connectedProvider]: true,
      lastError: undefined,
      lastErrorProvider: undefined,
    };
    saveCachedHeadUnitStatuses(next);
    return next;
  }

  const next: HeadUnitStatuses = {
    ...cur,
    lastError: errorCode || 'oauth_failed',
    lastErrorProvider: errorProvider || undefined,
  };
  saveCachedHeadUnitStatuses(next);
  return next;
}

export async function startHeadUnitOAuthConnect(provider: HeadUnitProvider): Promise<void> {
  if (typeof window === 'undefined' || !isSupabaseConfigured) return;
  const cur = getCachedHeadUnitStatuses();
  try {
    const connectionKey = getOrCreateIntegrationConnectionKey();
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean;
      authorizeUrl?: string;
      reason?: string;
    }>('headunit-auth', {
      body: {
        action: 'authorize_url',
        provider,
        connectionKey,
        redirectOrigin: window.location.origin,
      },
    });
    if (!error && data?.ok && data.authorizeUrl) {
      window.location.assign(data.authorizeUrl);
      return;
    }
    saveCachedHeadUnitStatuses({
      ...cur,
      lastError: data?.reason || 'oauth_failed',
      lastErrorProvider: provider,
    });
  } catch {
    saveCachedHeadUnitStatuses({
      ...cur,
      lastError: 'oauth_failed',
      lastErrorProvider: provider,
    });
  }
}

export async function fetchHeadUnitStatuses(): Promise<HeadUnitStatuses> {
  if (!isSupabaseConfigured) return getCachedHeadUnitStatuses();
  try {
    const connectionKey = getOrCreateIntegrationConnectionKey();
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean;
      statuses?: { wahoo?: boolean; hammerhead?: boolean; garmin?: boolean };
    }>('headunit-auth', {
      body: { action: 'status', connectionKey },
    });
    if (error || !data?.ok || !data.statuses) {
      return getCachedHeadUnitStatuses();
    }
    const next: HeadUnitStatuses = {
      wahoo: Boolean(data.statuses.wahoo),
      hammerhead: Boolean(data.statuses.hammerhead),
      garmin: Boolean(data.statuses.garmin),
    };
    saveCachedHeadUnitStatuses(next);
    return next;
  } catch {
    return getCachedHeadUnitStatuses();
  }
}

export async function disconnectHeadUnit(provider: HeadUnitProvider): Promise<boolean> {
  const cur = getCachedHeadUnitStatuses();
  saveCachedHeadUnitStatuses({ ...cur, [provider]: false });
  if (!isSupabaseConfigured) return true;
  try {
    const connectionKey = getOrCreateIntegrationConnectionKey();
    const { supabase } = await import('./supabase');
    const { error } = await supabase.functions.invoke('headunit-auth', {
      body: { action: 'disconnect', connectionKey, provider },
    });
    return !error;
  } catch {
    return false;
  }
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

export async function pushCourseToHeadUnit(
  trip: TripProfile,
  provider: HeadUnitProvider,
  options?: FitExportOptions
): Promise<{ ok: boolean; reason?: string; externalId?: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, reason: 'supabase_not_configured' };
  }
  const bytes = exportTripToFit(trip, options);
  const contentBase64 = uint8ToBase64(bytes);
  const baseName =
    (trip.name || 'cadence-route')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'cadence-route';
  const fileName = `${baseName}-${Math.round(trip.route.distanceKm || 0)}km.fit`;

  const connectionKey = getOrCreateIntegrationConnectionKey();
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    reason?: string;
    externalId?: string;
  }>('push-course', {
    body: {
      provider,
      connectionKey,
      fileName,
      courseName: trip.name || 'Cadence Route',
      contentBase64,
    },
  });

  if (error || !data?.ok) {
    return { ok: false, reason: data?.reason || 'push_failed' };
  }
  return { ok: true, externalId: data.externalId };
}
