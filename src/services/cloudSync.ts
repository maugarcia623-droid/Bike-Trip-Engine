import { AppDataPayload } from '../types/auth';
import { BikeSpec, RiderBikeSpecs } from '../types/specs';
import { TripProfile } from '../types/trip';
import { UserProfile } from '../utils/userProfileStorage';

export interface CloudSyncQueryResult<T = any> {
  data: T | null;
  error: any;
}

export interface CloudSyncQueryBuilder extends PromiseLike<CloudSyncQueryResult<any>> {
  select(columns?: string): CloudSyncQueryBuilder;
  eq(column: string, value: any): CloudSyncQueryBuilder;
  is(column: string, value: null | boolean): CloudSyncQueryBuilder;
  in(column: string, values: any[]): CloudSyncQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): CloudSyncQueryBuilder;
  maybeSingle(): PromiseLike<CloudSyncQueryResult<any>>;
  upsert(values: any, options?: { onConflict?: string }): PromiseLike<CloudSyncQueryResult<any>>;
  update(values: any): CloudSyncQueryBuilder;
}

export interface CloudSyncSupabaseClient {
  from(table: string): CloudSyncQueryBuilder;
  rpc(fn: string, args?: Record<string, any>): PromiseLike<CloudSyncQueryResult<any>>;
}

export interface CloudUserStateResult {
  data: { app_data: AppDataPayload | null; updated_at: string | null } | null;
  error: any;
}

export interface CloudSyncClient {
  isCloudDataEmpty(appData: any): boolean;
  fetchCloudUserState(userId: string): Promise<CloudUserStateResult>;
  saveCloudUserState(userId: string, payload: AppDataPayload): Promise<{ error: any }>;
}

const MISSING_SCHEMA_CODES = new Set([
  '42P01', // undefined_table
  '42883', // undefined_function
  '42703', // undefined_column
  'PGRST205', // table not found in PostgREST schema cache
  'PGRST202', // function not found in PostgREST schema cache
  'PGRST204', // column not found in PostgREST schema cache
]);

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isMissingSchemaObjectError(error: any): boolean {
  if (!error) return false;
  const code = typeof error.code === 'string' ? error.code : '';
  if (MISSING_SCHEMA_CODES.has(code)) return true;
  if (error.status === 404) return true;

  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return (
    message.includes('does not exist') ||
    message.includes('could not find the table') ||
    message.includes('could not find the function') ||
    message.includes('schema cache')
  );
}

function validIsoTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function normalizeDepartureDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function dedupeByClientId<T extends { id?: string }>(items: T[] | undefined | null): Array<T & { id: string }> {
  if (!Array.isArray(items) || items.length === 0) return [];
  const byId = new Map<string, T & { id: string }>();
  for (const item of items) {
    if (!isPlainObject(item) || typeof item.id !== 'string') continue;
    const cleanId = item.id.trim();
    if (!cleanId) continue;
    byId.set(cleanId, { ...item, id: cleanId });
  }
  return Array.from(byId.values());
}

function pickLatestIso(candidates: Array<unknown>): string | null {
  let bestMs = -Infinity;
  let bestIso: string | null = null;
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    const ms = Date.parse(trimmed);
    if (Number.isFinite(ms) && ms >= bestMs) {
      bestMs = ms;
      bestIso = trimmed;
    }
  }
  return bestIso;
}

/**
 * Determines whether cloud-stored app_data is empty or missing content.
 */
export function isCloudDataEmpty(appData: any): boolean {
  if (!isPlainObject(appData)) return true;
  if (Object.keys(appData).length === 0) return true;

  const hasTrips = Array.isArray(appData.trips) && appData.trips.length > 0;
  const hasSpecs =
    isPlainObject(appData.riderSpecs) &&
    Object.values(appData.riderSpecs).some((value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (isPlainObject(value)) {
        return Object.keys(value).length > 0;
      }
      if (value === null || value === undefined) {
        return false;
      }
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return true;
    });
  const hasProfile =
    isPlainObject(appData.userProfile) &&
    typeof appData.userProfile.name === 'string' &&
    appData.userProfile.name.trim().length > 0;

  return !hasTrips && !hasSpecs && !hasProfile;
}

async function readLegacyUserState(
  client: CloudSyncSupabaseClient,
  userId: string
): Promise<CloudUserStateResult> {
  const { data, error } = await client
    .from('user_state')
    .select('app_data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaObjectError(error)) {
      return { data: null, error: null };
    }
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return {
    data: {
      app_data: (data.app_data ?? null) as AppDataPayload | null,
      updated_at: typeof data.updated_at === 'string' ? data.updated_at : null,
    },
    error: null,
  };
}

async function saveLegacyUserState(
  client: CloudSyncSupabaseClient,
  userId: string,
  payload: AppDataPayload,
  now: string
): Promise<{ error: any }> {
  const { error } = await client.from('user_state').upsert(
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

  return { error: error ?? null };
}

async function queryV2State(client: CloudSyncSupabaseClient, userId: string) {
  const [profileRes, bikesRes, tripsRes] = await Promise.all([
    client
      .from('rider_profiles')
      .select(
        'user_id, schema_version, rider_name, active_trip_client_id, active_bike_client_id, specs, profile, client_updated_at, updated_at'
      )
      .eq('user_id', userId)
      .maybeSingle(),
    client
      .from('rider_bikes')
      .select(
        'client_id, schema_version, name, category, payload, sort_order, client_updated_at, updated_at, deleted_at'
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
    client
      .from('user_trips')
      .select(
        'client_id, schema_version, name, tag, departure_date, payload, client_updated_at, updated_at, deleted_at'
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
  ]);

  return { profileRes, bikesRes, tripsRes };
}

function assembleV2Payload(
  profileRow: any,
  bikeRows: any[],
  tripRows: any[]
): { appData: AppDataPayload | null; updatedAt: string | null } {
  const trips: TripProfile[] = [];
  for (const row of tripRows) {
    if (!row || row.deleted_at) continue;
    const rawPayload = isPlainObject(row.payload) ? row.payload : null;
    if (!rawPayload) continue;
    const clientId =
      typeof row.client_id === 'string' && row.client_id.trim()
        ? row.client_id.trim()
        : typeof rawPayload.id === 'string'
          ? rawPayload.id.trim()
          : '';
    if (!clientId) continue;

    trips.push({
      ...rawPayload,
      id: clientId,
      name: typeof rawPayload.name === 'string' ? rawPayload.name : typeof row.name === 'string' ? row.name : '',
      tag: typeof rawPayload.tag === 'string' ? rawPayload.tag : typeof row.tag === 'string' ? row.tag : '',
      ...(row.departure_date && !rawPayload.departureDate
        ? { departureDate: row.departure_date }
        : {}),
    } as TripProfile);
  }

  const bikes: BikeSpec[] = [];
  for (const row of bikeRows) {
    if (!row || row.deleted_at) continue;
    const rawPayload = isPlainObject(row.payload)
      ? row.payload
      : isPlainObject(row.spec)
        ? row.spec
        : null;
    if (!rawPayload) continue;
    const clientId =
      typeof row.client_id === 'string' && row.client_id.trim()
        ? row.client_id.trim()
        : typeof rawPayload.id === 'string'
          ? rawPayload.id.trim()
          : '';
    if (!clientId) continue;

    bikes.push({
      ...rawPayload,
      id: clientId,
      name: typeof rawPayload.name === 'string' ? rawPayload.name : typeof row.name === 'string' ? row.name : '',
      ...(rawPayload.bikeCategory === undefined && typeof row.category === 'string' && row.category
        ? { bikeCategory: row.category }
        : {}),
    } as BikeSpec);
  }

  const rawSpecs: Record<string, any> = isPlainObject(profileRow?.specs)
    ? { ...profileRow.specs }
    : {};
  delete rawSpecs.bikes;

  const riderName =
    typeof profileRow?.rider_name === 'string' && profileRow.rider_name.trim().length > 0
      ? profileRow.rider_name.trim()
      : typeof rawSpecs.riderName === 'string' && rawSpecs.riderName.trim().length > 0
        ? rawSpecs.riderName.trim()
        : undefined;

  const rawActiveBikeId =
    typeof profileRow?.active_bike_client_id === 'string' &&
    profileRow.active_bike_client_id.trim().length > 0
      ? profileRow.active_bike_client_id.trim()
      : typeof rawSpecs.activeBikeId === 'string' && rawSpecs.activeBikeId.trim().length > 0
        ? rawSpecs.activeBikeId.trim()
        : '';

  const activeBikeId =
    rawActiveBikeId && bikes.some((b) => b.id === rawActiveBikeId)
      ? rawActiveBikeId
      : bikes[0]?.id ?? '';

  const hasSpecsContent =
    Object.keys(rawSpecs).length > 0 ||
    bikes.length > 0 ||
    riderName !== undefined ||
    activeBikeId.length > 0;

  const riderSpecs: RiderBikeSpecs = hasSpecsContent
    ? ({
        ...rawSpecs,
        ...(riderName !== undefined ? { riderName } : {}),
        activeBikeId,
        bikes,
      } as RiderBikeSpecs)
    : ({} as RiderBikeSpecs);

  const rawActiveTripId =
    typeof profileRow?.active_trip_client_id === 'string' &&
    profileRow.active_trip_client_id.trim().length > 0
      ? profileRow.active_trip_client_id.trim()
      : '';

  const activeTripId =
    rawActiveTripId && trips.some((t) => t.id === rawActiveTripId)
      ? rawActiveTripId
      : trips[0]?.id ?? '';

  const userProfile =
    isPlainObject(profileRow?.profile) && Object.keys(profileRow.profile).length > 0
      ? (profileRow.profile as UserProfile)
      : undefined;

  const updatedAt = pickLatestIso([
    profileRow?.updated_at,
    profileRow?.client_updated_at,
    ...bikeRows.map((r) => r?.updated_at),
    ...tripRows.map((r) => r?.updated_at),
  ]);

  const assembled: AppDataPayload = {
    trips,
    riderSpecs,
    activeTripId,
    ...(updatedAt ? { updatedAt } : {}),
    ...(userProfile ? { userProfile } : {}),
  };

  if (isCloudDataEmpty(assembled)) {
    return { appData: null, updatedAt };
  }

  return { appData: assembled, updatedAt };
}

export function createCloudSyncClient(
  clientOrProvider: CloudSyncSupabaseClient | (() => Promise<CloudSyncSupabaseClient>)
): CloudSyncClient {
  const resolveClient = async (): Promise<CloudSyncSupabaseClient> =>
    typeof clientOrProvider === 'function' ? clientOrProvider() : clientOrProvider;

  return {
    isCloudDataEmpty,

    async fetchCloudUserState(userId: string): Promise<CloudUserStateResult> {
      if (!userId) {
        return { data: null, error: null };
      }

      try {
        const client = await resolveClient();

        const initial = await queryV2State(client, userId);
        const initialError =
          initial.profileRes.error || initial.bikesRes.error || initial.tripsRes.error;

        if (initialError) {
          if (isMissingSchemaObjectError(initialError)) {
            return await readLegacyUserState(client, userId);
          }
          return { data: null, error: initialError };
        }

        let profileRow =
          initial.profileRes.data && !initial.profileRes.data.deleted_at
            ? initial.profileRes.data
            : null;
        let bikeRows = Array.isArray(initial.bikesRes.data)
          ? initial.bikesRes.data.filter((r: any) => r && !r.deleted_at)
          : [];
        let tripRows = Array.isArray(initial.tripsRes.data)
          ? initial.tripsRes.data.filter((r: any) => r && !r.deleted_at)
          : [];

        let hasV2Rows = Boolean(profileRow || bikeRows.length > 0 || tripRows.length > 0);

        if (!hasV2Rows) {
          const rpcRes = await client.rpc('backfill_user_state_to_v2');
          if (rpcRes.error) {
            if (isMissingSchemaObjectError(rpcRes.error)) {
              return await readLegacyUserState(client, userId);
            }
            return { data: null, error: rpcRes.error };
          }

          const afterBackfill = await queryV2State(client, userId);
          const afterError =
            afterBackfill.profileRes.error ||
            afterBackfill.bikesRes.error ||
            afterBackfill.tripsRes.error;

          if (afterError) {
            if (isMissingSchemaObjectError(afterError)) {
              return await readLegacyUserState(client, userId);
            }
            return { data: null, error: afterError };
          }

          profileRow =
            afterBackfill.profileRes.data && !afterBackfill.profileRes.data.deleted_at
              ? afterBackfill.profileRes.data
              : null;
          bikeRows = Array.isArray(afterBackfill.bikesRes.data)
            ? afterBackfill.bikesRes.data.filter((r: any) => r && !r.deleted_at)
            : [];
          tripRows = Array.isArray(afterBackfill.tripsRes.data)
            ? afterBackfill.tripsRes.data.filter((r: any) => r && !r.deleted_at)
            : [];

          hasV2Rows = Boolean(profileRow || bikeRows.length > 0 || tripRows.length > 0);
          if (!hasV2Rows) {
            return await readLegacyUserState(client, userId);
          }
        }

        const { appData, updatedAt } = assembleV2Payload(profileRow, bikeRows, tripRows);
        if (!appData) {
          return { data: null, error: null };
        }

        return {
          data: {
            app_data: appData,
            updated_at: updatedAt,
          },
          error: null,
        };
      } catch (err) {
        return { data: null, error: err };
      }
    },

    async saveCloudUserState(
      userId: string,
      payload: AppDataPayload
    ): Promise<{ error: any }> {
      if (!userId) {
        return { error: new Error('User ID is required for cloud sync') };
      }

      try {
        const client = await resolveClient();
        const now = new Date().toISOString();
        const clientUpdatedAt = validIsoTimestamp(payload?.updatedAt) ?? now;

        const rawSpecs: Record<string, any> = isPlainObject(payload?.riderSpecs)
          ? payload.riderSpecs
          : {};
        const { bikes: rawBikes, ...specsWithoutBikes } = rawSpecs;

        const bikes = dedupeByClientId(rawBikes as BikeSpec[] | undefined);
        const trips = dedupeByClientId(payload?.trips);

        const userProfile: Record<string, any> = isPlainObject(payload?.userProfile)
          ? payload.userProfile
          : {};
        const riderName =
          typeof userProfile.name === 'string' && userProfile.name.trim().length > 0
            ? userProfile.name.trim()
            : typeof rawSpecs.riderName === 'string' && rawSpecs.riderName.trim().length > 0
              ? rawSpecs.riderName.trim()
              : null;

        const activeTripClientId =
          typeof payload?.activeTripId === 'string' && payload.activeTripId.trim().length > 0
            ? payload.activeTripId.trim()
            : null;
        const activeBikeClientId =
          typeof rawSpecs.activeBikeId === 'string' && rawSpecs.activeBikeId.trim().length > 0
            ? rawSpecs.activeBikeId.trim()
            : null;

        // 1. Upsert rider_profiles (also acts as probe for whether v2 migration is applied)
        const { error: profileError } = await client.from('rider_profiles').upsert(
          {
            user_id: userId,
            schema_version: 2,
            rider_name: riderName,
            active_trip_client_id: activeTripClientId,
            active_bike_client_id: activeBikeClientId,
            specs: specsWithoutBikes,
            profile: userProfile,
            client_updated_at: clientUpdatedAt,
            updated_at: now,
          },
          { onConflict: 'user_id' }
        );

        if (profileError) {
          if (isMissingSchemaObjectError(profileError)) {
            return await saveLegacyUserState(client, userId, payload, now);
          }
          return { error: profileError };
        }

        // 2. Sync rider_bikes (read active IDs -> upsert active -> soft-delete removed)
        const { data: existingBikeRows, error: existingBikesError } = await client
          .from('rider_bikes')
          .select('client_id')
          .eq('user_id', userId)
          .is('deleted_at', null);

        if (existingBikesError) {
          if (isMissingSchemaObjectError(existingBikesError)) {
            return await saveLegacyUserState(client, userId, payload, now);
          }
          return { error: existingBikesError };
        }

        if (bikes.length > 0) {
          const bikeUpsertRows = bikes.map((bike, index) => ({
            user_id: userId,
            client_id: bike.id,
            schema_version: 2,
            name: typeof bike.name === 'string' ? bike.name : '',
            category:
              typeof bike.bikeCategory === 'string' && bike.bikeCategory.trim().length > 0
                ? bike.bikeCategory.trim()
                : 'gravel',
            payload: bike,
            sort_order: index,
            client_updated_at: clientUpdatedAt,
            updated_at: now,
            deleted_at: null,
          }));

          const { error: bikesUpsertError } = await client
            .from('rider_bikes')
            .upsert(bikeUpsertRows, { onConflict: 'user_id,client_id' });

          if (bikesUpsertError) {
            if (isMissingSchemaObjectError(bikesUpsertError)) {
              return await saveLegacyUserState(client, userId, payload, now);
            }
            return { error: bikesUpsertError };
          }
        }

        const activeBikeIds = new Set(bikes.map((b) => b.id));
        const removedBikeIds = Array.isArray(existingBikeRows)
          ? existingBikeRows
              .map((r: any) => (typeof r?.client_id === 'string' ? r.client_id : ''))
              .filter((id: string) => id.length > 0 && !activeBikeIds.has(id))
          : [];

        if (removedBikeIds.length > 0) {
          const { error: bikesDeleteError } = await client
            .from('rider_bikes')
            .update({
              deleted_at: now,
              updated_at: now,
              client_updated_at: now,
            })
            .eq('user_id', userId)
            .in('client_id', removedBikeIds)
            .is('deleted_at', null);

          if (bikesDeleteError) {
            return { error: bikesDeleteError };
          }
        }

        // 3. Sync user_trips (read active IDs -> upsert active -> soft-delete removed)
        const { data: existingTripRows, error: existingTripsError } = await client
          .from('user_trips')
          .select('client_id')
          .eq('user_id', userId)
          .is('deleted_at', null);

        if (existingTripsError) {
          if (isMissingSchemaObjectError(existingTripsError)) {
            return await saveLegacyUserState(client, userId, payload, now);
          }
          return { error: existingTripsError };
        }

        if (trips.length > 0) {
          const tripUpsertRows = trips.map((trip) => ({
            user_id: userId,
            client_id: trip.id,
            schema_version: 2,
            name: typeof trip.name === 'string' ? trip.name : '',
            tag: typeof trip.tag === 'string' ? trip.tag : '',
            departure_date: normalizeDepartureDate(trip.departureDate),
            payload: trip,
            client_updated_at: validIsoTimestamp(trip.updatedAt) ?? clientUpdatedAt,
            updated_at: now,
            deleted_at: null,
          }));

          const { error: tripsUpsertError } = await client
            .from('user_trips')
            .upsert(tripUpsertRows, { onConflict: 'user_id,client_id' });

          if (tripsUpsertError) {
            if (isMissingSchemaObjectError(tripsUpsertError)) {
              return await saveLegacyUserState(client, userId, payload, now);
            }
            return { error: tripsUpsertError };
          }
        }

        const activeTripIds = new Set(trips.map((t) => t.id));
        const removedTripIds = Array.isArray(existingTripRows)
          ? existingTripRows
              .map((r: any) => (typeof r?.client_id === 'string' ? r.client_id : ''))
              .filter((id: string) => id.length > 0 && !activeTripIds.has(id))
          : [];

        if (removedTripIds.length > 0) {
          const { error: tripsDeleteError } = await client
            .from('user_trips')
            .update({
              deleted_at: now,
              updated_at: now,
              client_updated_at: now,
            })
            .eq('user_id', userId)
            .in('client_id', removedTripIds)
            .is('deleted_at', null);

          if (tripsDeleteError) {
            return { error: tripsDeleteError };
          }
        }

        return { error: null };
      } catch (err) {
        return { error: err };
      }
    },
  };
}

const defaultClient = createCloudSyncClient(async () => {
  const { supabase } = await import('./supabase');
  return supabase as unknown as CloudSyncSupabaseClient;
});

/**
 * Loads user_state record from Supabase for the given user ID (v2 normalized tables with legacy fallback).
 */
export async function fetchCloudUserState(userId: string): Promise<CloudUserStateResult> {
  return defaultClient.fetchCloudUserState(userId);
}

/**
 * Saves or updates user state in Supabase (v2 normalized tables with legacy fallback).
 */
export async function saveCloudUserState(
  userId: string,
  payload: AppDataPayload
): Promise<{ error: any }> {
  return defaultClient.saveCloudUserState(userId, payload);
}
