import { supabase } from './supabase';
import { AppDataPayload } from '../types/auth';

/**
 * Determines whether cloud-stored app_data is empty or missing content.
 */
export function isCloudDataEmpty(appData: any): boolean {
  if (!appData) return true;
  if (typeof appData !== 'object') return true;
  if (Object.keys(appData).length === 0) return true;

  const hasTrips = Array.isArray(appData.trips) && appData.trips.length > 0;
  const hasSpecs = Boolean(appData.riderSpecs && typeof appData.riderSpecs === 'object');

  return !hasTrips && !hasSpecs;
}

/**
 * Loads user_state record from Supabase for the given user ID.
 */
export async function fetchCloudUserState(userId: string): Promise<{
  data: { app_data: AppDataPayload | null; updated_at: string | null } | null;
  error: any;
}> {
  try {
    const { data, error } = await supabase
      .from('user_state')
      .select('app_data, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Saves or updates user_state record in Supabase.
 */
export async function saveCloudUserState(
  userId: string,
  payload: AppDataPayload
): Promise<{ error: any }> {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase.from('user_state').upsert(
      {
        user_id: userId,
        app_data: {
          ...payload,
          updatedAt: now,
        },
        updated_at: now,
      },
      { onConflict: 'user_id' }
    );

    return { error };
  } catch (err) {
    return { error: err };
  }
}
