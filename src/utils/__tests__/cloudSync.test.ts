import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCloudSyncClient,
  isCloudDataEmpty,
  isMissingSchemaObjectError,
  type CloudSyncQueryBuilder,
  type CloudSyncQueryResult,
  type CloudSyncSupabaseClient,
} from '../../services/cloudSync';
import { DEFAULT_RIDER_BIKE_SPECS, type BikeSpec, type RiderBikeSpecs } from '../../types/specs';
import type { AppDataPayload } from '../../types/auth';
import type { TripProfile } from '../../types/trip';

function makeTrip(id: string, overrides: Partial<TripProfile> = {}): TripProfile {
  return {
    id,
    name: `Trip ${id}`,
    tag: 'VELOTAF',
    description: 'Test trip',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-10T09:00:00.000Z',
    departureDate: '2026-11-20',
    physics: {
      riderWeightKg: 68,
      bikeWeightKg: 10,
      gearWeightKg: 2,
      cda: 0.35,
      crr: 0.005,
      rho: 1.225,
      drivetrainEfficiency: 0.97,
      grossMechanicalEfficiency: 0.22,
      gradientPercent: 0,
    },
    route: {
      distanceKm: 32,
      targetSpeedKmH: 25,
      urbanTrafficDelayMinutes: 5,
      gateSecurityDelayMinutes: 2,
    },
    office: {
      shiftStartTime: '09:00',
      targetGateArrivalTime: '08:30',
      gateName: 'Main Gate',
      lockerRefuelMinutes: 5,
      showerChangeMinutes: 10,
      breakRoomBreakfastMinutes: 5,
      strictNoFoodInOpenSpace: false,
      badgeRequiredForGate: true,
      notes: '',
    },
    weather: {
      isHeadwindActive: false,
      baseWindSpeedKmH: 8,
      windDirection: 'calm',
      windDirectionDegrees: 0,
      temperatureC: 15,
      precipitationRiskPercent: 10,
      estuaryGustKmH: 12,
      visibilityKm: 10,
    },
    checklist: [],
    ...overrides,
  };
}

function makeBike(id: string, overrides: Partial<BikeSpec> = {}): BikeSpec {
  return {
    id,
    name: `Bike ${id}`,
    weightKg: 9.8,
    crr: 0.005,
    cda: 0.36,
    isTubeless: true,
    bikeCategory: 'gravel',
    ...overrides,
  };
}

interface MockOp {
  table: string;
  op: 'select' | 'upsert' | 'update' | 'rpc';
  payload?: any;
  options?: any;
}

interface MockDbOptions {
  rider_profiles?: any[];
  rider_bikes?: any[];
  user_trips?: any[];
  user_state?: any[];
  tableErrors?: Record<string, Record<string, any>>;
  rpcError?: any;
  onBackfillRpc?: (db: Record<string, any[]>) => any;
}

function createMockSupabaseClient(options: MockDbOptions = {}) {
  const db: Record<string, any[]> = {
    rider_profiles: [...(options.rider_profiles ?? [])],
    rider_bikes: [...(options.rider_bikes ?? [])],
    user_trips: [...(options.user_trips ?? [])],
    user_state: [...(options.user_state ?? [])],
  };
  const ops: MockOp[] = [];
  const tableErrors = options.tableErrors ?? {};

  const getConflictKeys = (onConflict?: string): string[] =>
    (onConflict ?? 'id')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const makeBuilder = (table: string): CloudSyncQueryBuilder => {
    const eqFilters: Array<[string, any]> = [];
    const isFilters: Array<[string, null | boolean]> = [];
    const inFilters: Array<[string, any[]]> = [];
    let orderSpec: { column: string; ascending: boolean } | null = null;
    let mode: 'select' | 'update' = 'select';
    let updateValues: Record<string, any> | null = null;
    let singleMode = false;

    const applyFilters = (rows: any[]) =>
      rows.filter((row) => {
        for (const [col, val] of eqFilters) {
          if (row[col] !== val) return false;
        }
        for (const [col, val] of isFilters) {
          if (val === null) {
            if (row[col] !== null && row[col] !== undefined) return false;
          } else if (row[col] !== val) {
            return false;
          }
        }
        for (const [col, vals] of inFilters) {
          if (!vals.includes(row[col])) return false;
        }
        return true;
      });

    const execute = async (): Promise<CloudSyncQueryResult<any>> => {
      if (mode === 'update') {
        ops.push({ table, op: 'update', payload: updateValues });
        const err = tableErrors[table]?.update;
        if (err) return { data: null, error: err };

        const targetRows = applyFilters(db[table] ?? []);
        for (const row of targetRows) {
          Object.assign(row, updateValues);
        }
        return { data: targetRows.map((r) => ({ ...r })), error: null };
      }

      ops.push({ table, op: 'select' });
      const err = tableErrors[table]?.select;
      if (err) return { data: null, error: err };

      let matched = applyFilters(db[table] ?? []).map((r) => ({ ...r }));
      if (orderSpec) {
        const { column, ascending } = orderSpec;
        matched.sort((a, b) => {
          const av = a[column];
          const bv = b[column];
          if (av === bv) return 0;
          if (av === undefined || av === null) return ascending ? 1 : -1;
          if (bv === undefined || bv === null) return ascending ? -1 : 1;
          return av < bv ? (ascending ? -1 : 1) : ascending ? 1 : -1;
        });
      }

      if (singleMode) {
        return { data: matched[0] ?? null, error: null };
      }
      return { data: matched, error: null };
    };

    const builder: CloudSyncQueryBuilder = {
      select() {
        return builder;
      },
      eq(column: string, value: any) {
        eqFilters.push([column, value]);
        return builder;
      },
      is(column: string, value: null | boolean) {
        isFilters.push([column, value]);
        return builder;
      },
      in(column: string, values: any[]) {
        inFilters.push([column, values]);
        return builder;
      },
      order(column: string, opts?: { ascending?: boolean }) {
        orderSpec = { column, ascending: opts?.ascending ?? true };
        return builder;
      },
      maybeSingle() {
        singleMode = true;
        return execute();
      },
      async upsert(values: any, opts?: { onConflict?: string }) {
        ops.push({ table, op: 'upsert', payload: values, options: opts });
        const err = tableErrors[table]?.upsert;
        if (err) return { data: null, error: err };

        const rowsToUpsert = Array.isArray(values) ? values : [values];
        const keys = getConflictKeys(opts?.onConflict);
        const targetTable = (db[table] = db[table] ?? []);

        for (const item of rowsToUpsert) {
          const existingIdx = targetTable.findIndex((existing) =>
            keys.every((k) => existing[k] === item[k])
          );
          if (existingIdx >= 0) {
            targetTable[existingIdx] = { ...targetTable[existingIdx], ...item };
          } else {
            targetTable.push({ ...item });
          }
        }
        return { data: rowsToUpsert, error: null };
      },
      update(values: any) {
        mode = 'update';
        updateValues = values;
        return builder;
      },
      then(onfulfilled, onrejected) {
        return execute().then(onfulfilled, onrejected);
      },
    };

    return builder;
  };

  const client: CloudSyncSupabaseClient = {
    from(table: string) {
      return makeBuilder(table);
    },
    async rpc(fn: string, args?: Record<string, any>) {
      ops.push({ table: fn, op: 'rpc', payload: args });
      if (options.rpcError) {
        return { data: null, error: options.rpcError };
      }
      if (fn === 'backfill_user_state_to_v2' && options.onBackfillRpc) {
        const result = options.onBackfillRpc(db);
        return { data: result, error: null };
      }
      return { data: { status: 'ok' }, error: null };
    },
  };

  return { client, db, ops };
}

describe('cloudSync (normalized multi-client v2 sync)', () => {
  it('detects empty cloud payloads accurately across null, objects, specs, and userProfile', () => {
    assert.equal(isCloudDataEmpty(null), true);
    assert.equal(isCloudDataEmpty(undefined), true);
    assert.equal(isCloudDataEmpty({}), true);
    assert.equal(isCloudDataEmpty([]), true);
    assert.equal(isCloudDataEmpty('invalid'), true);
    assert.equal(isCloudDataEmpty({ trips: [], riderSpecs: {} }), true);
    assert.equal(isCloudDataEmpty({ trips: [], riderSpecs: { bikes: [] } }), true);
    assert.equal(isCloudDataEmpty({ trips: [], riderSpecs: { bikes: [], activeBikeId: '' } }), true);
    assert.equal(
      isCloudDataEmpty({ trips: [], riderSpecs: { bikes: [], ftpWatts: 225 } }),
      false
    );
    assert.equal(
      isCloudDataEmpty({ trips: [], riderSpecs: {}, userProfile: { name: '   ' } }),
      true
    );

    assert.equal(isCloudDataEmpty({ trips: [makeTrip('t1')], riderSpecs: {} }), false);
    assert.equal(
      isCloudDataEmpty({ trips: [], riderSpecs: DEFAULT_RIDER_BIKE_SPECS }),
      false
    );
    assert.equal(
      isCloudDataEmpty({ trips: [], riderSpecs: {}, userProfile: { name: 'Mau' } }),
      false
    );
  });

  it('recognizes Postgres and PostgREST missing schema object errors without matching RLS errors', () => {
    assert.equal(isMissingSchemaObjectError({ code: '42P01' }), true);
    assert.equal(isMissingSchemaObjectError({ code: '42883' }), true);
    assert.equal(isMissingSchemaObjectError({ code: '42703' }), true);
    assert.equal(isMissingSchemaObjectError({ code: 'PGRST205' }), true);
    assert.equal(isMissingSchemaObjectError({ code: 'PGRST202' }), true);
    assert.equal(isMissingSchemaObjectError({ code: 'PGRST204' }), true);
    assert.equal(isMissingSchemaObjectError({ status: 404 }), true);
    assert.equal(
      isMissingSchemaObjectError({ message: 'Could not find the table public.rider_profiles in the schema cache' }),
      true
    );
    assert.equal(isMissingSchemaObjectError({ code: '42501', message: 'permission denied' }), false);
  });

  it('reads v2 tables primarily, excludes soft-deleted bikes and trips, and skips backfill RPC', async () => {
    const trip1 = makeTrip('trip-1');
    const tripDeleted = makeTrip('trip-deleted');
    const bike1 = makeBike('bike-1', { name: 'Gravel Primary' });
    const bike2 = makeBike('bike-2', { name: 'Road Secondary', bikeCategory: 'road' });
    const bikeDeleted = makeBike('bike-deleted');

    const { client, ops } = createMockSupabaseClient({
      rider_profiles: [
        {
          user_id: 'user-1',
          schema_version: 2,
          rider_name: 'Mau',
          active_trip_client_id: 'trip-1',
          active_bike_client_id: 'bike-2',
          specs: {
            riderWeightKg: 68,
            riderHeightCm: 178,
            ftpWatts: 225,
            carbTargetGPerHr: 60,
            nutritionPreference: 'real-food',
            riderLevel: 'regular',
          },
          profile: { name: 'Mau', heightCm: 178, weightKg: 68 },
          client_updated_at: '2026-11-25T10:00:00.000Z',
          updated_at: '2026-11-25T10:00:05.000Z',
        },
      ],
      rider_bikes: [
        {
          user_id: 'user-1',
          client_id: 'bike-2',
          sort_order: 1,
          name: 'Road Secondary',
          category: 'road',
          payload: bike2,
          updated_at: '2026-11-25T10:00:06.000Z',
          deleted_at: null,
        },
        {
          user_id: 'user-1',
          client_id: 'bike-1',
          sort_order: 0,
          name: 'Gravel Primary',
          category: 'gravel',
          payload: bike1,
          updated_at: '2026-11-25T10:00:05.000Z',
          deleted_at: null,
        },
        {
          user_id: 'user-1',
          client_id: 'bike-deleted',
          sort_order: 2,
          name: 'Old Bike',
          category: 'urban',
          payload: bikeDeleted,
          updated_at: '2026-11-25T11:00:00.000Z',
          deleted_at: '2026-11-25T11:00:00.000Z',
        },
      ],
      user_trips: [
        {
          user_id: 'user-1',
          client_id: 'trip-1',
          name: trip1.name,
          tag: trip1.tag,
          departure_date: '2026-11-20',
          payload: trip1,
          updated_at: '2026-11-25T10:05:00.000Z',
          deleted_at: null,
        },
        {
          user_id: 'user-1',
          client_id: 'trip-deleted',
          name: tripDeleted.name,
          tag: tripDeleted.tag,
          departure_date: '2026-11-21',
          payload: tripDeleted,
          updated_at: '2026-11-25T12:00:00.000Z',
          deleted_at: '2026-11-25T12:00:00.000Z',
        },
      ],
    });

    const sync = createCloudSyncClient(client);
    const result = await sync.fetchCloudUserState('user-1');

    assert.equal(result.error, null);
    assert.ok(result.data?.app_data);
    assert.equal(result.data?.app_data?.activeTripId, 'trip-1');
    assert.equal(result.data?.app_data?.trips.length, 1);
    assert.equal(result.data?.app_data?.trips[0].id, 'trip-1');
    assert.equal(result.data?.app_data?.riderSpecs.activeBikeId, 'bike-2');
    assert.deepEqual(
      result.data?.app_data?.riderSpecs.bikes.map((b) => b.id),
      ['bike-1', 'bike-2']
    );
    assert.equal(result.data?.app_data?.userProfile?.name, 'Mau');
    assert.equal(result.data?.updated_at, '2026-11-25T10:05:00.000Z');
    assert.equal(ops.some((o) => o.op === 'rpc'), false);
    assert.equal(ops.some((o) => o.table === 'user_state'), false);
  });

  it('triggers backfill_user_state_to_v2 RPC when v2 is empty and re-reads migrated rows', async () => {
    const legacyTrip = makeTrip('legacy-trip-1');
    const legacyBike = makeBike('legacy-bike-1');
    const legacyPayload: AppDataPayload = {
      trips: [legacyTrip],
      riderSpecs: {
        ...DEFAULT_RIDER_BIKE_SPECS,
        riderName: 'Camille',
        activeBikeId: 'legacy-bike-1',
        bikes: [legacyBike],
      },
      activeTripId: 'legacy-trip-1',
      updatedAt: '2026-11-20T07:30:00.000Z',
      userProfile: { name: 'Camille', heightCm: 170 },
    };

    const { client, ops } = createMockSupabaseClient({
      user_state: [
        {
          user_id: 'user-2',
          app_data: legacyPayload,
          updated_at: '2026-11-20T07:30:00.000Z',
        },
      ],
      onBackfillRpc(db) {
        const legacy = db.user_state.find((r) => r.user_id === 'user-2')?.app_data;
        const { bikes, ...specsClean } = legacy.riderSpecs;
        db.rider_profiles.push({
          user_id: 'user-2',
          schema_version: 2,
          rider_name: 'Camille',
          active_trip_client_id: 'legacy-trip-1',
          active_bike_client_id: 'legacy-bike-1',
          specs: specsClean,
          profile: legacy.userProfile,
          client_updated_at: legacy.updatedAt,
          updated_at: '2026-11-26T08:00:00.000Z',
        });
        db.rider_bikes.push({
          user_id: 'user-2',
          client_id: 'legacy-bike-1',
          sort_order: 0,
          name: legacyBike.name,
          category: 'gravel',
          payload: legacyBike,
          updated_at: '2026-11-26T08:00:00.000Z',
          deleted_at: null,
        });
        db.user_trips.push({
          user_id: 'user-2',
          client_id: 'legacy-trip-1',
          name: legacyTrip.name,
          tag: legacyTrip.tag,
          departure_date: '2026-11-20',
          payload: legacyTrip,
          updated_at: '2026-11-26T08:00:00.000Z',
          deleted_at: null,
        });
        return { status: 'ok', profiles_inserted: 1, bikes_inserted: 1, trips_inserted: 1 };
      },
    });

    const sync = createCloudSyncClient(client);
    const result = await sync.fetchCloudUserState('user-2');

    assert.equal(result.error, null);
    assert.equal(
      ops.filter((o) => o.op === 'rpc' && o.table === 'backfill_user_state_to_v2').length,
      1
    );
    assert.equal(result.data?.app_data?.trips[0].id, 'legacy-trip-1');
    assert.equal(result.data?.app_data?.riderSpecs.bikes[0].id, 'legacy-bike-1');
    assert.equal(result.data?.app_data?.userProfile?.name, 'Camille');
  });

  it('falls back to legacy user_state when v2 tables or backfill RPC are missing, and handles empty state cleanly', async () => {
    const legacyPayload: AppDataPayload = {
      trips: [makeTrip('legacy-1')],
      riderSpecs: DEFAULT_RIDER_BIKE_SPECS,
      activeTripId: 'legacy-1',
    };

    // Case A: v2 tables do not exist yet (PGRST205)
    const missingTables = createMockSupabaseClient({
      user_state: [
        {
          user_id: 'user-3',
          app_data: legacyPayload,
          updated_at: '2026-11-18T12:00:00.000Z',
        },
      ],
      tableErrors: {
        rider_profiles: { select: { code: 'PGRST205', message: 'Could not find table' } },
      },
    });
    const resMissingTables = await createCloudSyncClient(missingTables.client).fetchCloudUserState(
      'user-3'
    );
    assert.equal(resMissingTables.error, null);
    assert.equal(resMissingTables.data?.app_data?.activeTripId, 'legacy-1');
    assert.equal(resMissingTables.data?.updated_at, '2026-11-18T12:00:00.000Z');

    // Case B: v2 tables exist & empty, RPC missing (PGRST202) -> fallback to user_state
    const missingRpc = createMockSupabaseClient({
      user_state: [
        {
          user_id: 'user-3',
          app_data: legacyPayload,
          updated_at: '2026-11-19T12:00:00.000Z',
        },
      ],
      rpcError: { code: 'PGRST202', message: 'Could not find the function' },
    });
    const resMissingRpc = await createCloudSyncClient(missingRpc.client).fetchCloudUserState(
      'user-3'
    );
    assert.equal(resMissingRpc.error, null);
    assert.equal(resMissingRpc.data?.app_data?.trips[0].id, 'legacy-1');

    // Case C: v2 empty AND legacy user_state table missing -> clean null result
    const freshV2Only = createMockSupabaseClient({
      tableErrors: {
        user_state: { select: { code: '42P01', message: 'relation "public.user_state" does not exist' } },
      },
    });
    const resFresh = await createCloudSyncClient(freshV2Only.client).fetchCloudUserState('user-new');
    assert.equal(resFresh.error, null);
    assert.equal(resFresh.data, null);
  });

  it('propagates real RLS/network errors from v2 without falling back to user_state', async () => {
    const rlsError = { code: '42501', message: 'new row violates row-level security policy' };
    const { client, ops } = createMockSupabaseClient({
      user_state: [
        {
          user_id: 'user-4',
          app_data: {
            trips: [makeTrip('stale-legacy')],
            riderSpecs: DEFAULT_RIDER_BIKE_SPECS,
            activeTripId: 'stale-legacy',
          },
          updated_at: '2026-11-10T00:00:00.000Z',
        },
      ],
      tableErrors: {
        user_trips: { select: rlsError },
      },
    });

    const result = await createCloudSyncClient(client).fetchCloudUserState('user-4');
    assert.equal(result.data, null);
    assert.deepEqual(result.error, rlsError);
    assert.equal(ops.some((o) => o.table === 'user_state'), false);
  });

  it('writes normalized v2 rows, strips bikes from specs, deduplicates IDs, and normalizes departure_date', async () => {
    const bike1 = makeBike('b1', { name: 'Bike One', bikeCategory: 'road' });
    const bike1Updated = makeBike('b1', { name: 'Bike One Updated', bikeCategory: 'road' });
    const bike2 = makeBike('b2', { name: 'Bike Two', bikeCategory: 'gravel' });

    const tripValidDate = makeTrip('t1', {
      departureDate: '2026-06-15',
      updatedAt: '2026-11-26T09:15:00.000Z',
    });
    const tripEmptyDate = makeTrip('t2', { departureDate: '' });
    const tripInvalidDate = makeTrip('t3', { departureDate: '2026-02-30' });
    const tripDup = makeTrip('t1', {
      name: 'Trip t1 latest',
      departureDate: '2026-06-16T08:00:00Z',
      updatedAt: '2026-11-26T10:00:00.000Z',
    });

    const payload: AppDataPayload = {
      trips: [tripValidDate, tripEmptyDate, tripInvalidDate, tripDup],
      riderSpecs: {
        ...DEFAULT_RIDER_BIKE_SPECS,
        riderName: 'Luc',
        activeBikeId: 'b2',
        bikes: [bike1, bike2, bike1Updated],
      },
      activeTripId: 't1',
      updatedAt: '2026-11-26T10:05:00.000Z',
      userProfile: { name: 'Luc', weightKg: 70 },
    };

    const { client, db, ops } = createMockSupabaseClient();
    const sync = createCloudSyncClient(client);
    const saveRes = await sync.saveCloudUserState('user-5', payload);

    assert.equal(saveRes.error, null);
    assert.equal(ops.some((o) => o.table === 'user_state'), false);

    // rider_profiles strips bikes from specs
    assert.equal(db.rider_profiles.length, 1);
    const profileRow = db.rider_profiles[0];
    assert.equal(profileRow.rider_name, 'Luc');
    assert.equal(profileRow.active_trip_client_id, 't1');
    assert.equal(profileRow.active_bike_client_id, 'b2');
    assert.equal('bikes' in profileRow.specs, false);

    // rider_bikes deduplicated by client_id (latest wins)
    assert.equal(db.rider_bikes.length, 2);
    assert.equal(db.rider_bikes[0].client_id, 'b1');
    assert.equal(db.rider_bikes[0].name, 'Bike One Updated');
    assert.equal(db.rider_bikes[0].sort_order, 0);
    assert.equal(db.rider_bikes[1].client_id, 'b2');
    assert.equal(db.rider_bikes[1].sort_order, 1);

    // user_trips deduplicated & departure_date strictly coerced
    assert.equal(db.user_trips.length, 3);
    const byId = new Map(db.user_trips.map((r) => [r.client_id, r]));
    assert.equal(byId.get('t1')?.name, 'Trip t1 latest');
    assert.equal(byId.get('t1')?.departure_date, '2026-06-16');
    assert.equal(byId.get('t2')?.departure_date, null);
    assert.equal(byId.get('t3')?.departure_date, null);
  });

  it('soft-deletes removed bikes/trips, handles empty trips array, and resurrects re-added IDs', async () => {
    const bikeA = makeBike('bike-a');
    const bikeB = makeBike('bike-b');
    const trip1 = makeTrip('trip-1');
    const trip2 = makeTrip('trip-2');

    const { client, db } = createMockSupabaseClient();
    const sync = createCloudSyncClient(client);

    // Initial save with 2 bikes, 2 trips
    await sync.saveCloudUserState('user-6', {
      trips: [trip1, trip2],
      riderSpecs: { ...DEFAULT_RIDER_BIKE_SPECS, activeBikeId: 'bike-a', bikes: [bikeA, bikeB] },
      activeTripId: 'trip-1',
    });
    assert.equal(db.rider_bikes.filter((r) => r.deleted_at === null).length, 2);
    assert.equal(db.user_trips.filter((r) => r.deleted_at === null).length, 2);

    // Remove bike-b and trip-2
    const rmRes = await sync.saveCloudUserState('user-6', {
      trips: [trip1],
      riderSpecs: { ...DEFAULT_RIDER_BIKE_SPECS, activeBikeId: 'bike-a', bikes: [bikeA] },
      activeTripId: 'trip-1',
    });
    assert.equal(rmRes.error, null);

    const deletedBikeB = db.rider_bikes.find((r) => r.client_id === 'bike-b');
    const deletedTrip2 = db.user_trips.find((r) => r.client_id === 'trip-2');
    assert.ok(typeof deletedBikeB?.deleted_at === 'string' && deletedBikeB.deleted_at.length > 0);
    assert.ok(typeof deletedTrip2?.deleted_at === 'string' && deletedTrip2.deleted_at.length > 0);

    // Subsequent fetch excludes soft-deleted bike and trip
    const afterDeleteFetch = await sync.fetchCloudUserState('user-6');
    assert.deepEqual(
      afterDeleteFetch.data?.app_data?.trips.map((t) => t.id),
      ['trip-1']
    );
    assert.deepEqual(
      afterDeleteFetch.data?.app_data?.riderSpecs.bikes.map((b) => b.id),
      ['bike-a']
    );

    // Saving with trips: [] soft-deletes remaining trip without failing
    const emptyTripsSave = await sync.saveCloudUserState('user-6', {
      trips: [],
      riderSpecs: { ...DEFAULT_RIDER_BIKE_SPECS, activeBikeId: 'bike-a', bikes: [bikeA] },
      activeTripId: '',
    });
    assert.equal(emptyTripsSave.error, null);
    assert.equal(db.user_trips.filter((r) => r.deleted_at === null).length, 0);

    // Resurrecting trip-2 clears deleted_at back to null
    const resurrectRes = await sync.saveCloudUserState('user-6', {
      trips: [trip2],
      riderSpecs: { ...DEFAULT_RIDER_BIKE_SPECS, activeBikeId: 'bike-a', bikes: [bikeA] },
      activeTripId: 'trip-2',
    });
    assert.equal(resurrectRes.error, null);
    const resurrectedTrip2 = db.user_trips.find((r) => r.client_id === 'trip-2');
    assert.equal(resurrectedTrip2?.deleted_at, null);
  });

  it('falls back to legacy user_state upsert when v2 tables are unmigrated, but propagates real save errors', async () => {
    const payload: AppDataPayload = {
      trips: [makeTrip('t-unmigrated')],
      riderSpecs: DEFAULT_RIDER_BIKE_SPECS as RiderBikeSpecs,
      activeTripId: 't-unmigrated',
    };

    const unmigrated = createMockSupabaseClient({
      tableErrors: {
        rider_profiles: { upsert: { code: '42P01', message: 'relation "public.rider_profiles" does not exist' } },
      },
    });
    const fallbackSave = await createCloudSyncClient(unmigrated.client).saveCloudUserState(
      'user-7',
      payload
    );
    assert.equal(fallbackSave.error, null);
    assert.equal(unmigrated.db.user_state.length, 1);
    assert.equal(unmigrated.db.user_state[0].user_id, 'user-7');
    assert.equal(unmigrated.db.user_state[0].app_data.activeTripId, 't-unmigrated');

    const rlsError = { code: '42501', message: 'permission denied' };
    const rlsBlocked = createMockSupabaseClient({
      tableErrors: {
        rider_profiles: { upsert: rlsError },
      },
    });
    const errSave = await createCloudSyncClient(rlsBlocked.client).saveCloudUserState(
      'user-7',
      payload
    );
    assert.deepEqual(errSave.error, rlsError);
    assert.equal(rlsBlocked.db.user_state.length, 0);
  });

  it('propagates non-schema backfill_user_state_to_v2 RPC errors (42501) without falling back to user_state', async () => {
    const rpcRlsError = { code: '42501', message: 'permission denied for function backfill_user_state_to_v2' };
    const { client, ops } = createMockSupabaseClient({
      rpcError: rpcRlsError,
      tableErrors: {
        user_state: { select: { code: '42P01', message: 'relation "public.user_state" does not exist' } },
      },
    });

    const result = await createCloudSyncClient(client).fetchCloudUserState('user-rpc-err');
    assert.equal(result.data, null);
    assert.deepEqual(result.error, rpcRlsError);
    assert.equal(ops.some((o) => o.table === 'user_state'), false);
  });

  it('clears activeBikeId and activeTripId to empty string when all bikes or trips are soft-deleted', async () => {
    const { client } = createMockSupabaseClient({
      rider_profiles: [
        {
          user_id: 'user-all-deleted',
          schema_version: 2,
          rider_name: 'Mau',
          active_trip_client_id: 'trip-deleted',
          active_bike_client_id: 'bike-deleted',
          specs: {
            ftpWatts: 240,
            activeBikeId: 'bike-deleted',
          },
          profile: { name: 'Mau' },
          updated_at: '2026-11-26T12:00:00.000Z',
        },
      ],
      rider_bikes: [
        {
          user_id: 'user-all-deleted',
          client_id: 'bike-deleted',
          sort_order: 0,
          payload: makeBike('bike-deleted'),
          updated_at: '2026-11-26T12:05:00.000Z',
          deleted_at: '2026-11-26T12:05:00.000Z',
        },
      ],
      user_trips: [
        {
          user_id: 'user-all-deleted',
          client_id: 'trip-deleted',
          payload: makeTrip('trip-deleted'),
          updated_at: '2026-11-26T12:05:00.000Z',
          deleted_at: '2026-11-26T12:05:00.000Z',
        },
      ],
    });

    const result = await createCloudSyncClient(client).fetchCloudUserState('user-all-deleted');
    assert.equal(result.error, null);
    assert.ok(result.data?.app_data);
    assert.deepEqual(result.data?.app_data?.trips, []);
    assert.deepEqual(result.data?.app_data?.riderSpecs.bikes, []);
    assert.equal(result.data?.app_data?.activeTripId, '');
    assert.equal(result.data?.app_data?.riderSpecs.activeBikeId, '');
  });

  it('falls back to legacy user_state when rider_bikes or user_trips upsert hits PGRST204, but propagates real upsert errors', async () => {
    const payload: AppDataPayload = {
      trips: [makeTrip('t-pgrst204')],
      riderSpecs: DEFAULT_RIDER_BIKE_SPECS as RiderBikeSpecs,
      activeTripId: 't-pgrst204',
    };

    // Case A: rider_bikes upsert returns PGRST204
    const bikesMissingCol = createMockSupabaseClient({
      tableErrors: {
        rider_bikes: {
          upsert: { code: 'PGRST204', message: "Could not find the 'payload' column of 'rider_bikes' in the schema cache" },
        },
      },
    });
    const bikesFallback = await createCloudSyncClient(bikesMissingCol.client).saveCloudUserState(
      'user-pgrst204-bikes',
      payload
    );
    assert.equal(bikesFallback.error, null);
    assert.equal(bikesMissingCol.db.user_state.length, 1);
    assert.equal(bikesMissingCol.db.user_state[0].app_data.activeTripId, 't-pgrst204');

    // Case B: user_trips upsert returns PGRST204
    const tripsMissingCol = createMockSupabaseClient({
      tableErrors: {
        user_trips: {
          upsert: { code: 'PGRST204', message: "Could not find the 'payload' column of 'user_trips' in the schema cache" },
        },
      },
    });
    const tripsFallback = await createCloudSyncClient(tripsMissingCol.client).saveCloudUserState(
      'user-pgrst204-trips',
      payload
    );
    assert.equal(tripsFallback.error, null);
    assert.equal(tripsMissingCol.db.user_state.length, 1);
    assert.equal(tripsMissingCol.db.user_state[0].app_data.activeTripId, 't-pgrst204');

    // Case C: user_trips upsert returns 42501 -> propagates error without legacy fallback
    const rlsErr = { code: '42501', message: 'permission denied' };
    const tripsRls = createMockSupabaseClient({
      tableErrors: {
        user_trips: { upsert: rlsErr },
      },
    });
    const tripsRlsRes = await createCloudSyncClient(tripsRls.client).saveCloudUserState(
      'user-rls-trips',
      payload
    );
    assert.deepEqual(tripsRlsRes.error, rlsErr);
    assert.equal(tripsRls.db.user_state.length, 0);
  });

  it('treats empty arrays and empty objects inside riderSpecs as empty while preserving zero/false scalars and populated arrays', () => {
    assert.equal(
      isCloudDataEmpty({
        trips: [],
        riderSpecs: { bikes: [], customPantryItems: [], dietaryFilters: [] },
      }),
      true
    );
    assert.equal(
      isCloudDataEmpty({
        trips: [],
        riderSpecs: { bikes: [], nested: {} },
      }),
      true
    );
    assert.equal(
      isCloudDataEmpty({
        trips: [],
        riderSpecs: { bikes: [], customPantryItems: [{ id: 'c1', name: 'Gel' }] },
      }),
      false
    );
    assert.equal(
      isCloudDataEmpty({
        trips: [],
        riderSpecs: { bikes: [], ftpWatts: 0 },
      }),
      false
    );
    assert.equal(
      isCloudDataEmpty({
        trips: [],
        riderSpecs: { bikes: [], autoModulateLiquidInHeatOrEffort: false },
      }),
      false
    );
  });

  it('returns { data: null, error: null } from fetchCloudUserState when rider_profiles specs contain only empty arrays and no active bikes or trips', async () => {
    const { client } = createMockSupabaseClient({
      rider_profiles: [
        {
          user_id: 'user-empty-arrays',
          schema_version: 2,
          rider_name: null,
          active_trip_client_id: null,
          active_bike_client_id: null,
          specs: { customPantryItems: [], dietaryFilters: [] },
          profile: {},
          client_updated_at: '2026-11-26T12:00:00.000Z',
          updated_at: '2026-11-26T12:00:00.000Z',
        },
      ],
      rider_bikes: [],
      user_trips: [],
    });

    const result = await createCloudSyncClient(client).fetchCloudUserState('user-empty-arrays');
    assert.equal(result.data, null);
    assert.equal(result.error, null);
  });
});
