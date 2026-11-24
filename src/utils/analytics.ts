import { track } from '@vercel/analytics';

type AnalyticsValue = string | number | boolean | null | undefined;

export function trackCadenceEvent(
  name: string,
  properties?: Record<string, AnalyticsValue>
): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanProps: Record<string, string | number | boolean> = {};
    if (properties) {
      for (const [k, v] of Object.entries(properties)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          cleanProps[k] = v;
        }
      }
    }
    track(name, Object.keys(cleanProps).length > 0 ? cleanProps : undefined);
  } catch {
    // Analytics must never interrupt user actions
  }
}
