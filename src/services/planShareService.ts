import { TripProfile } from '../types/trip';
import {
  buildPlanShareSummaryMeta,
  buildPlanShareUrl,
  buildShortPlanShareUrl,
  encodePlanShareToken,
  PlanShareExtras,
} from '../utils/planShare';

const isSupabaseEnvConfigured = Boolean(
  import.meta.env?.VITE_SUPABASE_URL &&
    import.meta.env?.VITE_SUPABASE_ANON_KEY &&
    import.meta.env?.VITE_SUPABASE_URL.startsWith('http')
);

async function loadSupabaseClient() {
  const mod = await import('./supabase');
  return mod;
}

const SHORT_LINK_TIMEOUT_MS = 4500;
const SHORT_CODE_REGEX = /^[a-z0-9]{6,16}$/i;

// Session-level deduplication cache: unchanged ride payloads resolve synchronously on repeat clicks.
const tokenToShortCodeCache = new Map<string, string>();
const inFlightCreateByToken = new Map<string, Promise<string | null>>();

export interface ShortPlanShareResult {
  url: string;
  code: string | null;
  isShort: boolean;
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Short link request timed out')), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function requestShortCodeForToken(
  token: string,
  meta: ReturnType<typeof buildPlanShareSummaryMeta>
): Promise<string | null> {
  const cached = tokenToShortCodeCache.get(token);
  if (cached) return cached;

  if (!isSupabaseEnvConfigured) return null;

  const existingInFlight = inFlightCreateByToken.get(token);
  if (existingInFlight) return existingInFlight;

  const requestPromise = (async (): Promise<string | null> => {
    try {
      const { isSupabaseConfigured, supabase } = await loadSupabaseClient();
      if (!isSupabaseConfigured) return null;
      const { data, error } = await withTimeout(
        supabase.rpc('create_shared_plan', {
          p_token: token,
          p_title: meta.title,
          p_summary: meta.summary,
          p_distance_km: meta.distanceKm,
          p_elevation_m: meta.elevationM,
          p_stage_count: meta.stageCount,
        }),
        SHORT_LINK_TIMEOUT_MS
      );

      if (error) {
        console.warn('Could not create short share link, falling back to token URL:', error.message);
        return null;
      }

      const code = typeof data === 'string' ? data.trim().toLowerCase() : '';
      if (!SHORT_CODE_REGEX.test(code)) {
        return null;
      }

      tokenToShortCodeCache.set(token, code);
      return code;
    } catch (err) {
      console.warn('Short share link creation failed, falling back to token URL:', err);
      return null;
    } finally {
      inFlightCreateByToken.delete(token);
    }
  })();

  inFlightCreateByToken.set(token, requestPromise);
  return requestPromise;
}

/**
 * Persists a compact shared plan snapshot in Supabase and returns a short `/p/<code>` URL.
 * Falls back gracefully to the inline `?plan=` URL if offline or Supabase is unavailable.
 */
export async function createShortPlanShareUrl(
  trip: TripProfile,
  extras: PlanShareExtras,
  baseUrl?: string
): Promise<ShortPlanShareResult> {
  const token = encodePlanShareToken(trip, extras);
  const meta = buildPlanShareSummaryMeta(trip, extras);
  const code = await requestShortCodeForToken(token, meta);

  if (code) {
    return {
      url: buildShortPlanShareUrl(code, baseUrl),
      code,
      isShort: true,
    };
  }

  return {
    url: buildPlanShareUrl(trip, extras, baseUrl),
    code: null,
    isShort: false,
  };
}

/**
 * Resolves a short `/p/<code>` share code back into the compact encoded plan token.
 */
export async function resolveShortPlanToken(code: string): Promise<string | null> {
  const cleanCode = (code || '').trim().toLowerCase();
  if (!SHORT_CODE_REGEX.test(cleanCode) || !isSupabaseEnvConfigured) {
    return null;
  }

  try {
    const { isSupabaseConfigured, supabase } = await loadSupabaseClient();
    if (!isSupabaseConfigured) return null;
    const { data, error } = await withTimeout(
      supabase.rpc('get_shared_plan', { p_code: cleanCode }),
      SHORT_LINK_TIMEOUT_MS + 2000
    );

    if (error || !data) {
      if (error) {
        console.warn('Failed to resolve short shared plan code:', error.message);
      }
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const token = typeof row?.token === 'string' ? row.token.trim() : '';
    return token.length >= 10 ? token : null;
  } catch (err) {
    console.warn('Failed to resolve short shared plan code:', err);
    return null;
  }
}

function legacyExecCommandCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Creates a short share URL and copies it to the clipboard in a way that preserves
 * Safari / iOS transient user activation (using async ClipboardItem when available).
 */
export async function copyShortPlanShareUrl(
  trip: TripProfile,
  extras: PlanShareExtras,
  options?: { promptLabel?: string; baseUrl?: string }
): Promise<ShortPlanShareResult & { copied: boolean }> {
  const resultPromise = createShortPlanShareUrl(trip, extras, options?.baseUrl);

  // Safari / iOS require clipboard writes to start synchronously inside the click gesture.
  // Passing a Promise<Blob> to ClipboardItem keeps the gesture alive while Supabase responds.
  if (
    typeof navigator !== 'undefined' &&
    typeof ClipboardItem !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === 'function'
  ) {
    try {
      const textBlobPromise = resultPromise.then(
        (res) => new Blob([res.url], { type: 'text/plain' })
      );
      const item = new ClipboardItem({ 'text/plain': textBlobPromise });
      await navigator.clipboard.write([item]);
      const result = await resultPromise;
      return { ...result, copied: true };
    } catch {
      // Fall through to standard writeText / legacy textarea fallback below
    }
  }

  const result = await resultPromise;

  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(result.url);
      return { ...result, copied: true };
    }
  } catch {
    // Fall through to execCommand / prompt fallback
  }

  if (legacyExecCommandCopy(result.url)) {
    return { ...result, copied: true };
  }

  if (options?.promptLabel && typeof window !== 'undefined') {
    window.prompt(options.promptLabel, result.url);
  }

  return { ...result, copied: false };
}
