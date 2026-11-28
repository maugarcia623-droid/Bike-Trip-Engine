import Foundation
import Supabase
import CadenceCore

// MARK: - Sync Transport Protocol & Supabase Implementation

public protocol SyncTransport: Sendable {
    func fetchRiderProfile(userId: UUID) async throws -> RemoteRiderProfileRow?
    func upsertRiderProfile(_ row: RemoteRiderProfileUpsert) async throws -> RemoteRiderProfileRow

    func fetchRiderBikes(userId: UUID, updatedSince: Date?) async throws -> [RemoteRiderBikeRow]
    func upsertRiderBikes(_ rows: [RemoteRiderBikeUpsert]) async throws -> [RemoteRiderBikeRow]

    func fetchUserTrips(userId: UUID, updatedSince: Date?) async throws -> [RemoteUserTripRow]
    func upsertUserTrips(_ rows: [RemoteUserTripUpsert]) async throws -> [RemoteUserTripRow]

    func backfillUserStateToV2() async throws -> BackfillV2Response
}

public struct SupabaseSyncTransport: SyncTransport, Sendable {
    private static let missingSchemaCodes: Set<String> = [
        "42P01", "42883", "42703", "PGRST205", "PGRST202", "PGRST204"
    ]

    private let client: SupabaseClient

    public init(client: SupabaseClient) {
        self.client = client
    }

    public init(configuration: SupabaseConfiguration) {
        self.client = configuration.makeSupabaseClient()
    }

    public func fetchRiderProfile(userId: UUID) async throws -> RemoteRiderProfileRow? {
        try await executeMapped {
            let rows: [RemoteRiderProfileRow] = try await client
                .from("rider_profiles")
                .select("user_id,schema_version,rider_name,active_trip_client_id,active_bike_client_id,specs,profile,client_updated_at,updated_at")
                .eq("user_id", value: userId.uuidString.lowercased())
                .limit(1)
                .execute()
                .value
            return rows.first
        }
    }

    public func upsertRiderProfile(_ row: RemoteRiderProfileUpsert) async throws -> RemoteRiderProfileRow {
        try await executeMapped {
            try await client
                .from("rider_profiles")
                .upsert(row, onConflict: "user_id")
                .select("user_id,schema_version,rider_name,active_trip_client_id,active_bike_client_id,specs,profile,client_updated_at,updated_at")
                .single()
                .execute()
                .value
        }
    }

    public func fetchRiderBikes(userId: UUID, updatedSince: Date?) async throws -> [RemoteRiderBikeRow] {
        try await executeMapped {
            var query = client
                .from("rider_bikes")
                .select("user_id,client_id,schema_version,name,category,payload,sort_order,client_updated_at,updated_at,deleted_at")
                .eq("user_id", value: userId.uuidString.lowercased())
            if let updatedSince {
                query = query.gte("updated_at", value: SyncTimestamp.format(updatedSince))
            }
            return try await query
                .order("sort_order", ascending: true)
                .execute()
                .value
        }
    }

    public func upsertRiderBikes(_ rows: [RemoteRiderBikeUpsert]) async throws -> [RemoteRiderBikeRow] {
        guard !rows.isEmpty else { return [] }
        return try await executeMapped {
            try await client
                .from("rider_bikes")
                .upsert(rows, onConflict: "user_id,client_id")
                .select("user_id,client_id,schema_version,name,category,payload,sort_order,client_updated_at,updated_at,deleted_at")
                .execute()
                .value
        }
    }

    public func fetchUserTrips(userId: UUID, updatedSince: Date?) async throws -> [RemoteUserTripRow] {
        try await executeMapped {
            var query = client
                .from("user_trips")
                .select("user_id,client_id,schema_version,name,tag,departure_date,payload,client_updated_at,updated_at,deleted_at")
                .eq("user_id", value: userId.uuidString.lowercased())
            if let updatedSince {
                query = query.gte("updated_at", value: SyncTimestamp.format(updatedSince))
            }
            return try await query
                .order("updated_at", ascending: false)
                .execute()
                .value
        }
    }

    public func upsertUserTrips(_ rows: [RemoteUserTripUpsert]) async throws -> [RemoteUserTripRow] {
        guard !rows.isEmpty else { return [] }
        return try await executeMapped {
            try await client
                .from("user_trips")
                .upsert(rows, onConflict: "user_id,client_id")
                .select("user_id,client_id,schema_version,name,tag,departure_date,payload,client_updated_at,updated_at,deleted_at")
                .execute()
                .value
        }
    }

    public func backfillUserStateToV2() async throws -> BackfillV2Response {
        try await executeMapped {
            try await client
                .rpc("backfill_user_state_to_v2")
                .execute()
                .value
        }
    }

    private func executeMapped<T: Sendable>(_ operation: () async throws -> T) async throws -> T {
        do {
            return try await operation()
        } catch let syncError as SyncError {
            throw syncError
        } catch let pgError as PostgrestError {
            if let code = pgError.code, Self.missingSchemaCodes.contains(code) {
                throw SyncError.missingSchemaObject(code: code, message: pgError.message)
            }
            throw SyncError.serverError(code: pgError.code, message: pgError.message)
        } catch let httpError as HTTPError {
            if httpError.response.statusCode == 404 {
                throw SyncError.missingSchemaObject(code: "404", message: httpError.localizedDescription)
            }
            if let decodedPg = try? JSONDecoder().decode(PostgrestError.self, from: httpError.data) {
                if let code = decodedPg.code, Self.missingSchemaCodes.contains(code) {
                    throw SyncError.missingSchemaObject(code: code, message: decodedPg.message)
                }
                throw SyncError.serverError(code: decodedPg.code, message: decodedPg.message)
            }
            throw SyncError.serverError(
                code: String(httpError.response.statusCode),
                message: String(data: httpError.data, encoding: .utf8) ?? httpError.localizedDescription
            )
        } catch let urlError as URLError {
            throw SyncError.networkError(urlError.localizedDescription)
        } catch {
            throw SyncError.networkError(error.localizedDescription)
        }
    }
}

// MARK: - CloudSyncCoordinator Actor

public actor CloudSyncCoordinator {
    private struct InFlightSync {
        let token: UUID
        let userId: UUID
        let fullSync: Bool
        let task: Task<SyncReport, any Error>
    }

    public private(set) var syncStatus: SyncStatus = .idle
    public private(set) var lastSyncedAt: Date?

    private let localStore: any SyncLocalStore
    private let transport: any SyncTransport
    private var lastCursorByUserId: [UUID: Date] = [:]
    private var debounceTask: Task<Void, Never>?
    private var debounceToken: UUID?
    private var inFlightSync: InFlightSync?
    private var activeSyncToken: UUID?

    public init(localStore: any SyncLocalStore, transport: any SyncTransport) {
        self.localStore = localStore
        self.transport = transport
    }

    public init(localStore: any SyncLocalStore, configuration: SupabaseConfiguration = SupabaseConfiguration()) {
        self.localStore = localStore
        self.transport = SupabaseSyncTransport(configuration: configuration)
    }

    deinit {
        debounceTask?.cancel()
        inFlightSync?.task.cancel()
    }

    public func serverCursor(for userId: UUID) -> Date? {
        lastCursorByUserId[userId]
    }

    public func resetCursor(for userId: UUID) {
        lastCursorByUserId.removeValue(forKey: userId)
    }

    public func scheduleSync(
        userId: UUID,
        delay: Duration = .milliseconds(1000)
    ) {
        debounceTask?.cancel()
        let token = UUID()
        debounceToken = token
        debounceTask = Task { [weak self] in
            do {
                try await Task.sleep(for: delay)
            } catch {
                return
            }
            guard !Task.isCancelled, let self else { return }
            await self.runScheduledSyncIfCurrent(userId: userId, token: token)
        }
    }

    private func runScheduledSyncIfCurrent(userId: UUID, token: UUID) async {
        guard debounceToken == token, !Task.isCancelled else { return }
        debounceTask = nil
        debounceToken = nil
        _ = try? await sync(userId: userId, fullSync: false)
    }

    public func onSignOut() {
        debounceToken = nil
        debounceTask?.cancel()
        debounceTask = nil
        activeSyncToken = nil
        inFlightSync?.task.cancel()
        inFlightSync = nil
        syncStatus = .idle
        lastSyncedAt = nil
    }

    @discardableResult
    public func sync(userId: UUID, fullSync: Bool = false) async throws -> SyncReport {
        try Task.checkCancellation()
        debounceToken = nil
        debounceTask?.cancel()
        debounceTask = nil

        while let existing = inFlightSync {
            if existing.userId == userId && (existing.fullSync || !fullSync) {
                return try await existing.task.value
            }
            _ = try? await existing.task.value
            try Task.checkCancellation()
        }

        let token = UUID()
        let task = Task<SyncReport, any Error> {
            try await performSync(userId: userId, fullSync: fullSync, token: token)
        }
        inFlightSync = InFlightSync(token: token, userId: userId, fullSync: fullSync, task: task)
        activeSyncToken = token

        return try await task.value
    }

    // MARK: - Core Reconciliation

    private func ensureSyncStillActive(token: UUID) throws {
        guard activeSyncToken == token, !Task.isCancelled else {
            throw CancellationError()
        }
    }

    private func performSync(userId: UUID, fullSync: Bool, token: UUID) async throws -> SyncReport {
        defer {
            if inFlightSync?.token == token {
                inFlightSync = nil
            }
            if activeSyncToken == token {
                activeSyncToken = nil
            }
        }

        try ensureSyncStillActive(token: token)
        syncStatus = .loading

        do {
            let since = fullSync ? nil : lastCursorByUserId[userId]

            // 1. Pull remote state concurrently
            async let profileTask = transport.fetchRiderProfile(userId: userId)
            async let bikesTask = transport.fetchRiderBikes(userId: userId, updatedSince: since)
            async let tripsTask = transport.fetchUserTrips(userId: userId, updatedSince: since)

            var remoteProfile = try await profileTask
            var remoteBikes = try await bikesTask
            var remoteTrips = try await tripsTask
            try ensureSyncStillActive(token: token)

            // 2. One-time backfill RPC when all 3 v2 tables are empty on initial full fetch
            var didRunBackfill = false
            if since == nil && remoteProfile == nil && remoteBikes.isEmpty && remoteTrips.isEmpty {
                let backfill = try await transport.backfillUserStateToV2()
                try ensureSyncStillActive(token: token)
                didRunBackfill = true
                if backfill.profilesInserted > 0 || backfill.bikesInserted > 0 || backfill.tripsInserted > 0 {
                    async let refreshedProfile = transport.fetchRiderProfile(userId: userId)
                    async let refreshedBikes = transport.fetchRiderBikes(userId: userId, updatedSince: nil)
                    async let refreshedTrips = transport.fetchUserTrips(userId: userId, updatedSince: nil)
                    remoteProfile = try await refreshedProfile
                    remoteBikes = try await refreshedBikes
                    remoteTrips = try await refreshedTrips
                    try ensureSyncStillActive(token: token)
                }
            }

            // 3. Reconcile user_trips (LWW per client_id + bidirectional tombstones)
            let localTrips = try await localStore.fetchSyncableTrips(includeDeleted: true)
            try ensureSyncStillActive(token: token)
            let tripPlan = reconcileTrips(
                userId: userId,
                localTrips: localTrips,
                remoteTrips: remoteTrips,
                isFullSync: since == nil
            )

            // 4. Reconcile rider_bikes (LWW per client_id + bidirectional tombstones)
            let localBikes = try await localStore.fetchSyncableBikes(includeDeleted: true)
            try ensureSyncStillActive(token: token)
            let bikePlan = reconcileBikes(
                userId: userId,
                localBikes: localBikes,
                remoteBikes: remoteBikes,
                isFullSync: since == nil
            )

            // 5. Reconcile rider_profiles (single row per user_id)
            let localProfile = try await localStore.fetchSyncableRiderProfile()
            try ensureSyncStillActive(token: token)
            let activeTripIds = buildEffectiveActiveTripIds(
                localTrips: localTrips,
                pulledOrUpdated: tripPlan.localUpdates
            )
            let activeBikeIds = buildEffectiveActiveBikeIds(
                localBikes: localBikes,
                pulledOrUpdated: bikePlan.localUpdates
            )

            let profilePlan = reconcileProfile(
                userId: userId,
                localProfile: localProfile,
                remoteProfile: remoteProfile,
                activeTripIds: activeTripIds,
                activeBikeIds: activeBikeIds
            )

            // 6. Push local wins to Supabase
            let hasWrites = !tripPlan.upserts.isEmpty || !bikePlan.upserts.isEmpty || profilePlan.upsert != nil
            if hasWrites {
                syncStatus = .saving
            }

            let pushedTrips = try await transport.upsertUserTrips(tripPlan.upserts)
            let pushedBikes = try await transport.upsertRiderBikes(bikePlan.upserts)
            var pushedProfile: RemoteRiderProfileRow?
            if let profileUpsert = profilePlan.upsert {
                pushedProfile = try await transport.upsertRiderProfile(profileUpsert)
            }
            try ensureSyncStillActive(token: token)

            // 7. Persist local store updates (needsSync = false, serverUpdatedAt updated)
            var finalLocalTrips = tripPlan.localUpdates
            for remoteRow in pushedTrips {
                let serverDate = SyncTimestamp.parse(remoteRow.updatedAt)
                if let idx = finalLocalTrips.firstIndex(where: { $0.clientId == remoteRow.clientId }) {
                    finalLocalTrips[idx].serverUpdatedAt = serverDate
                    finalLocalTrips[idx].needsSync = false
                }
            }
            if !finalLocalTrips.isEmpty {
                try await localStore.upsertSyncedTrips(finalLocalTrips)
                try ensureSyncStillActive(token: token)
            }

            var finalLocalBikes = bikePlan.localUpdates
            for remoteRow in pushedBikes {
                let serverDate = SyncTimestamp.parse(remoteRow.updatedAt)
                if let idx = finalLocalBikes.firstIndex(where: { $0.clientId == remoteRow.clientId }) {
                    finalLocalBikes[idx].serverUpdatedAt = serverDate
                    finalLocalBikes[idx].needsSync = false
                }
            }
            if !finalLocalBikes.isEmpty {
                try await localStore.upsertSyncedBikes(finalLocalBikes)
                try ensureSyncStillActive(token: token)
            }

            if var localProfileUpdate = profilePlan.localUpdate {
                if let pushedProfile {
                    localProfileUpdate.serverUpdatedAt = SyncTimestamp.parse(pushedProfile.updatedAt)
                }
                localProfileUpdate.needsSync = false
                try await localStore.upsertSyncedRiderProfile(localProfileUpdate)
                try ensureSyncStillActive(token: token)
            }

            // 8. Advance server cursor across all fetched & pushed rows
            try ensureSyncStillActive(token: token)
            advanceCursor(
                userId: userId,
                profiles: [remoteProfile, pushedProfile].compactMap { $0 },
                bikes: remoteBikes + pushedBikes,
                trips: remoteTrips + pushedTrips
            )

            let now = Date()
            lastSyncedAt = now
            syncStatus = .synced

            return SyncReport(
                didRunBackfill: didRunBackfill,
                tripsPushed: tripPlan.pushedCount,
                tripsPulled: tripPlan.pulledCount,
                tripsDeletedLocally: tripPlan.deletedLocallyCount,
                tripsDeletedRemotely: tripPlan.deletedRemotelyCount,
                bikesPushed: bikePlan.pushedCount,
                bikesPulled: bikePlan.pulledCount,
                bikesDeletedLocally: bikePlan.deletedLocallyCount,
                bikesDeletedRemotely: bikePlan.deletedRemotelyCount,
                profileDirection: profilePlan.direction,
                syncedAt: now
            )
        } catch {
            if error is CancellationError || Task.isCancelled || activeSyncToken != token {
                throw error
            }
            syncStatus = .error(error.localizedDescription)
            throw error
        }
    }

    // MARK: - Trip Reconciliation

    private struct TripReconcilePlan {
        var upserts: [RemoteUserTripUpsert] = []
        var localUpdates: [SyncTripRecord] = []
        var pushedCount: Int = 0
        var pulledCount: Int = 0
        var deletedLocallyCount: Int = 0
        var deletedRemotelyCount: Int = 0
    }

    private func reconcileTrips(
        userId: UUID,
        localTrips: [SyncTripRecord],
        remoteTrips: [RemoteUserTripRow],
        isFullSync: Bool
    ) -> TripReconcilePlan {
        var plan = TripReconcilePlan()
        let localById = Dictionary(uniqueKeysWithValues: localTrips.map { ($0.clientId, $0) })
        let remoteById = Dictionary(uniqueKeysWithValues: remoteTrips.map { ($0.clientId, $0) })
        let allIds = Set(localById.keys).union(remoteById.keys)

        for clientId in allIds.sorted() {
            let local = localById[clientId]
            let remote = remoteById[clientId]

            switch (local, remote) {
            case (nil, let remote?):
                let remoteTs = Self.resolveRemoteTimestamp(
                    clientUpdatedAt: remote.clientUpdatedAt,
                    updatedAt: remote.updatedAt
                )
                let remoteDeletedAt = SyncTimestamp.parse(remote.deletedAt)
                let hydrated = SyncTripRecord(
                    clientId: clientId,
                    trip: remote.resolvedTripProfile(),
                    sortOrder: localTrips.count + plan.localUpdates.count,
                    clientUpdatedAt: remoteTs,
                    serverUpdatedAt: SyncTimestamp.parse(remote.updatedAt),
                    deletedAt: remoteDeletedAt,
                    needsSync: false
                )
                plan.localUpdates.append(hydrated)
                if remoteDeletedAt != nil {
                    plan.deletedLocallyCount += 1
                } else {
                    plan.pulledCount += 1
                }

            case (let local?, nil):
                let shouldPush: Bool
                if isFullSync {
                    shouldPush = (local.deletedAt == nil) || local.needsSync
                } else {
                    shouldPush = local.needsSync
                }
                guard shouldPush else { continue }

                plan.upserts.append(makeTripUpsert(userId: userId, record: local))
                var cleared = local
                cleared.needsSync = false
                plan.localUpdates.append(cleared)
                if local.deletedAt != nil {
                    plan.deletedRemotelyCount += 1
                } else {
                    plan.pushedCount += 1
                }

            case (let local?, let remote?):
                let remoteTs = Self.resolveRemoteTimestamp(
                    clientUpdatedAt: remote.clientUpdatedAt,
                    updatedAt: remote.updatedAt
                )
                let remoteDeletedAt = SyncTimestamp.parse(remote.deletedAt)
                let cmp = SyncTimestamp.compare(local.clientUpdatedAt, remoteTs)

                if cmp == .orderedDescending {
                    // Local wins
                    plan.upserts.append(makeTripUpsert(userId: userId, record: local))
                    var cleared = local
                    cleared.needsSync = false
                    plan.localUpdates.append(cleared)
                    if local.deletedAt != nil {
                        plan.deletedRemotelyCount += 1
                    } else {
                        plan.pushedCount += 1
                    }
                } else if cmp == .orderedAscending {
                    // Remote wins
                    let hydrated = SyncTripRecord(
                        clientId: clientId,
                        trip: remote.resolvedTripProfile(),
                        sortOrder: local.sortOrder,
                        clientUpdatedAt: remoteTs,
                        serverUpdatedAt: SyncTimestamp.parse(remote.updatedAt),
                        deletedAt: remoteDeletedAt,
                        needsSync: false
                    )
                    plan.localUpdates.append(hydrated)
                    if remoteDeletedAt != nil && local.deletedAt == nil {
                        plan.deletedLocallyCount += 1
                    } else if remoteDeletedAt == nil {
                        plan.pulledCount += 1
                    }
                } else {
                    // Exact timestamp tie (within 1ms): remote wins deterministically if state differs; otherwise clear needsSync
                    let tombstoneDiffers = (local.deletedAt == nil) != (remoteDeletedAt == nil)
                    let resolvedTrip = remote.resolvedTripProfile()
                    if tombstoneDiffers || local.trip != resolvedTrip {
                        let hydrated = SyncTripRecord(
                            clientId: clientId,
                            trip: resolvedTrip,
                            sortOrder: local.sortOrder,
                            clientUpdatedAt: remoteTs,
                            serverUpdatedAt: SyncTimestamp.parse(remote.updatedAt),
                            deletedAt: remoteDeletedAt,
                            needsSync: false
                        )
                        plan.localUpdates.append(hydrated)
                        if remoteDeletedAt != nil && local.deletedAt == nil {
                            plan.deletedLocallyCount += 1
                        } else if remoteDeletedAt == nil {
                            plan.pulledCount += 1
                        }
                    } else if local.needsSync {
                        var cleared = local
                        cleared.serverUpdatedAt = SyncTimestamp.parse(remote.updatedAt) ?? local.serverUpdatedAt
                        cleared.needsSync = false
                        plan.localUpdates.append(cleared)
                    }
                }
            case (nil, nil):
                break
            }
        }
        return plan
    }

    private func makeTripUpsert(userId: UUID, record: SyncTripRecord) -> RemoteUserTripUpsert {
        var payload = record.trip
        payload.id = record.clientId
        let normalizedDate = SyncTimestamp.normalizeDepartureDate(payload.departureDate)
        return RemoteUserTripUpsert(
            userId: userId,
            clientId: record.clientId,
            schemaVersion: 2,
            name: payload.name,
            tag: payload.tag,
            departureDate: normalizedDate,
            payload: payload,
            clientUpdatedAt: SyncTimestamp.format(record.clientUpdatedAt),
            deletedAt: record.deletedAt.map(SyncTimestamp.format)
        )
    }

    // MARK: - Bike Reconciliation

    private struct BikeReconcilePlan {
        var upserts: [RemoteRiderBikeUpsert] = []
        var localUpdates: [SyncBikeRecord] = []
        var pushedCount: Int = 0
        var pulledCount: Int = 0
        var deletedLocallyCount: Int = 0
        var deletedRemotelyCount: Int = 0
    }

    private func reconcileBikes(
        userId: UUID,
        localBikes: [SyncBikeRecord],
        remoteBikes: [RemoteRiderBikeRow],
        isFullSync: Bool
    ) -> BikeReconcilePlan {
        var plan = BikeReconcilePlan()
        let localById = Dictionary(uniqueKeysWithValues: localBikes.map { ($0.clientId, $0) })
        let remoteById = Dictionary(uniqueKeysWithValues: remoteBikes.map { ($0.clientId, $0) })
        let allIds = Set(localById.keys).union(remoteById.keys)

        for clientId in allIds.sorted() {
            let local = localById[clientId]
            let remote = remoteById[clientId]

            switch (local, remote) {
            case (nil, let remote?):
                let remoteTs = Self.resolveRemoteTimestamp(
                    clientUpdatedAt: remote.clientUpdatedAt,
                    updatedAt: remote.updatedAt
                )
                let remoteDeletedAt = SyncTimestamp.parse(remote.deletedAt)
                let hydrated = SyncBikeRecord(
                    clientId: clientId,
                    bike: remote.resolvedBikeSpec(),
                    sortOrder: remote.sortOrder,
                    clientUpdatedAt: remoteTs,
                    serverUpdatedAt: SyncTimestamp.parse(remote.updatedAt),
                    deletedAt: remoteDeletedAt,
                    needsSync: false
                )
                plan.localUpdates.append(hydrated)
                if remoteDeletedAt != nil {
                    plan.deletedLocallyCount += 1
                } else {
                    plan.pulledCount += 1
                }

            case (let local?, nil):
                let shouldPush: Bool
                if isFullSync {
                    shouldPush = (local.deletedAt == nil) || local.needsSync
                } else {
                    shouldPush = local.needsSync
                }
                guard shouldPush else { continue }

                plan.upserts.append(makeBikeUpsert(userId: userId, record: local))
                var cleared = local
                cleared.needsSync = false
                plan.localUpdates.append(cleared)
                if local.deletedAt != nil {
                    plan.deletedRemotelyCount += 1
                } else {
                    plan.pushedCount += 1
                }

            case (let local?, let remote?):
                let remoteTs = Self.resolveRemoteTimestamp(
                    clientUpdatedAt: remote.clientUpdatedAt,
                    updatedAt: remote.updatedAt
                )
                let remoteDeletedAt = SyncTimestamp.parse(remote.deletedAt)
                let cmp = SyncTimestamp.compare(local.clientUpdatedAt, remoteTs)

                if cmp == .orderedDescending {
                    plan.upserts.append(makeBikeUpsert(userId: userId, record: local))
                    var cleared = local
                    cleared.needsSync = false
                    plan.localUpdates.append(cleared)
                    if local.deletedAt != nil {
                        plan.deletedRemotelyCount += 1
                    } else {
                        plan.pushedCount += 1
                    }
                } else if cmp == .orderedAscending {
                    let hydrated = SyncBikeRecord(
                        clientId: clientId,
                        bike: remote.resolvedBikeSpec(),
                        sortOrder: remote.sortOrder,
                        clientUpdatedAt: remoteTs,
                        serverUpdatedAt: SyncTimestamp.parse(remote.updatedAt),
                        deletedAt: remoteDeletedAt,
                        needsSync: false
                    )
                    plan.localUpdates.append(hydrated)
                    if remoteDeletedAt != nil && local.deletedAt == nil {
                        plan.deletedLocallyCount += 1
                    } else if remoteDeletedAt == nil {
                        plan.pulledCount += 1
                    }
                } else {
                    let tombstoneDiffers = (local.deletedAt == nil) != (remoteDeletedAt == nil)
                    let resolvedBike = remote.resolvedBikeSpec()
                    if tombstoneDiffers || local.bike != resolvedBike || local.sortOrder != remote.sortOrder {
                        let hydrated = SyncBikeRecord(
                            clientId: clientId,
                            bike: resolvedBike,
                            sortOrder: remote.sortOrder,
                            clientUpdatedAt: remoteTs,
                            serverUpdatedAt: SyncTimestamp.parse(remote.updatedAt),
                            deletedAt: remoteDeletedAt,
                            needsSync: false
                        )
                        plan.localUpdates.append(hydrated)
                        if remoteDeletedAt != nil && local.deletedAt == nil {
                            plan.deletedLocallyCount += 1
                        } else if remoteDeletedAt == nil {
                            plan.pulledCount += 1
                        }
                    } else if local.needsSync {
                        var cleared = local
                        cleared.serverUpdatedAt = SyncTimestamp.parse(remote.updatedAt) ?? local.serverUpdatedAt
                        cleared.needsSync = false
                        plan.localUpdates.append(cleared)
                    }
                }
            case (nil, nil):
                break
            }
        }
        return plan
    }

    private func makeBikeUpsert(userId: UUID, record: SyncBikeRecord) -> RemoteRiderBikeUpsert {
        var payload = record.bike
        payload.id = record.clientId
        return RemoteRiderBikeUpsert(
            userId: userId,
            clientId: record.clientId,
            schemaVersion: 2,
            name: payload.name,
            category: payload.bikeCategory?.rawValue ?? BikeCategory.gravel.rawValue,
            payload: payload,
            sortOrder: record.sortOrder,
            clientUpdatedAt: SyncTimestamp.format(record.clientUpdatedAt),
            deletedAt: record.deletedAt.map(SyncTimestamp.format)
        )
    }

    // MARK: - Rider Profile Reconciliation & Active ID Fallback

    private struct ProfileReconcilePlan {
        var upsert: RemoteRiderProfileUpsert?
        var localUpdate: SyncRiderProfileRecord?
        var direction: SyncDirection = .none
    }

    private func reconcileProfile(
        userId: UUID,
        localProfile: SyncRiderProfileRecord?,
        remoteProfile: RemoteRiderProfileRow?,
        activeTripIds: [String],
        activeBikeIds: [String]
    ) -> ProfileReconcilePlan {
        var plan = ProfileReconcilePlan()

        switch (localProfile, remoteProfile) {
        case (nil, nil):
            return plan

        case (nil, let remote?):
            let remoteTs = Self.resolveRemoteTimestamp(
                clientUpdatedAt: remote.clientUpdatedAt,
                updatedAt: remote.updatedAt
            )
            var record = SyncRiderProfileRecord(
                userId: userId.uuidString.lowercased(),
                riderName: remote.riderName,
                activeTripClientId: remote.activeTripClientId,
                activeBikeClientId: remote.activeBikeClientId,
                specs: remote.specs,
                profile: remote.profile,
                hasCompletedOnboarding: !(remote.profile.completedAt?.isEmpty ?? true),
                clientUpdatedAt: remoteTs,
                serverUpdatedAt: SyncTimestamp.parse(remote.updatedAt),
                needsSync: false
            )
            applyActiveIdFallbacks(&record, activeTripIds: activeTripIds, activeBikeIds: activeBikeIds)
            plan.localUpdate = record
            plan.direction = .pulled
            return plan

        case (let local?, nil):
            let hasMeaningful = local.specs.hasMeaningfulContent
                || !local.profile.isEmpty
                || local.activeTripClientId != nil
                || local.activeBikeClientId != nil
                || !(local.riderName?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
            guard hasMeaningful else { return plan }

            var resolved = local
            resolved.userId = userId.uuidString.lowercased()
            applyActiveIdFallbacks(&resolved, activeTripIds: activeTripIds, activeBikeIds: activeBikeIds)
            plan.upsert = makeProfileUpsert(userId: userId, record: resolved)
            resolved.needsSync = false
            plan.localUpdate = resolved
            plan.direction = .pushed
            return plan

        case (let local?, let remote?):
            let remoteTs = Self.resolveRemoteTimestamp(
                clientUpdatedAt: remote.clientUpdatedAt,
                updatedAt: remote.updatedAt
            )
            let cmp = SyncTimestamp.compare(local.clientUpdatedAt, remoteTs)

            if cmp == .orderedDescending {
                var resolved = local
                resolved.userId = userId.uuidString.lowercased()
                applyActiveIdFallbacks(&resolved, activeTripIds: activeTripIds, activeBikeIds: activeBikeIds)
                plan.upsert = makeProfileUpsert(userId: userId, record: resolved)
                resolved.needsSync = false
                plan.localUpdate = resolved
                plan.direction = .pushed
            } else {
                var resolved = SyncRiderProfileRecord(
                    userId: userId.uuidString.lowercased(),
                    riderName: remote.riderName,
                    activeTripClientId: remote.activeTripClientId,
                    activeBikeClientId: remote.activeBikeClientId,
                    specs: remote.specs,
                    profile: remote.profile,
                    hasCompletedOnboarding: local.hasCompletedOnboarding || !(remote.profile.completedAt?.isEmpty ?? true),
                    clientUpdatedAt: remoteTs,
                    serverUpdatedAt: SyncTimestamp.parse(remote.updatedAt),
                    needsSync: false
                )
                applyActiveIdFallbacks(&resolved, activeTripIds: activeTripIds, activeBikeIds: activeBikeIds)
                if cmp == .orderedAscending || local.specs != resolved.specs || local.profile != resolved.profile
                    || local.activeTripClientId != resolved.activeTripClientId
                    || local.activeBikeClientId != resolved.activeBikeClientId
                    || local.riderName != resolved.riderName {
                    plan.localUpdate = resolved
                    plan.direction = .pulled
                } else if local.needsSync {
                    plan.localUpdate = resolved
                    plan.direction = .none
                }
            }
            return plan
        }
    }

    private func makeProfileUpsert(userId: UUID, record: SyncRiderProfileRecord) -> RemoteRiderProfileUpsert {
        RemoteRiderProfileUpsert(
            userId: userId,
            schemaVersion: 2,
            riderName: record.riderName ?? record.specs.riderName,
            activeTripClientId: record.activeTripClientId,
            activeBikeClientId: record.activeBikeClientId,
            specs: record.specs,
            profile: record.profile,
            clientUpdatedAt: SyncTimestamp.format(record.clientUpdatedAt)
        )
    }

    private func applyActiveIdFallbacks(
        _ record: inout SyncRiderProfileRecord,
        activeTripIds: [String],
        activeBikeIds: [String]
    ) {
        if let candidateTrip = record.activeTripClientId, activeTripIds.contains(candidateTrip) {
            record.activeTripClientId = candidateTrip
        } else {
            record.activeTripClientId = activeTripIds.first
        }

        if let candidateBike = record.activeBikeClientId, activeBikeIds.contains(candidateBike) {
            record.activeBikeClientId = candidateBike
            record.specs.activeBikeId = candidateBike
        } else if let specBike = record.specs.activeBikeId, activeBikeIds.contains(specBike) {
            record.activeBikeClientId = specBike
        } else {
            let fallbackBike = activeBikeIds.first
            record.activeBikeClientId = fallbackBike
            record.specs.activeBikeId = fallbackBike ?? ""
        }
    }

    private func buildEffectiveActiveTripIds(
        localTrips: [SyncTripRecord],
        pulledOrUpdated: [SyncTripRecord]
    ) -> [String] {
        var map = Dictionary(uniqueKeysWithValues: localTrips.map { ($0.clientId, $0) })
        for updated in pulledOrUpdated {
            map[updated.clientId] = updated
        }
        return map.values
            .filter { $0.deletedAt == nil }
            .sorted {
                if $0.sortOrder != $1.sortOrder { return $0.sortOrder < $1.sortOrder }
                return $0.clientUpdatedAt > $1.clientUpdatedAt
            }
            .map(\.clientId)
    }

    private func buildEffectiveActiveBikeIds(
        localBikes: [SyncBikeRecord],
        pulledOrUpdated: [SyncBikeRecord]
    ) -> [String] {
        var map = Dictionary(uniqueKeysWithValues: localBikes.map { ($0.clientId, $0) })
        for updated in pulledOrUpdated {
            map[updated.clientId] = updated
        }
        return map.values
            .filter { $0.deletedAt == nil }
            .sorted { $0.sortOrder < $1.sortOrder }
            .map(\.clientId)
    }

    // MARK: - Timestamps & Cursor Helpers

    private static func resolveRemoteTimestamp(clientUpdatedAt: String, updatedAt: String?) -> Date {
        SyncTimestamp.parse(clientUpdatedAt)
            ?? SyncTimestamp.parse(updatedAt)
            ?? Date.distantPast
    }

    private func advanceCursor(
        userId: UUID,
        profiles: [RemoteRiderProfileRow],
        bikes: [RemoteRiderBikeRow],
        trips: [RemoteUserTripRow]
    ) {
        var maxDate = lastCursorByUserId[userId]
        let candidates: [String?] =
            profiles.map(\.updatedAt)
            + bikes.map(\.updatedAt)
            + trips.map(\.updatedAt)

        for raw in candidates {
            if let parsed = SyncTimestamp.parse(raw) {
                if let currentMax = maxDate {
                    if parsed > currentMax { maxDate = parsed }
                } else {
                    maxDate = parsed
                }
            }
        }
        if let maxDate {
            lastCursorByUserId[userId] = maxDate
        }
    }
}
