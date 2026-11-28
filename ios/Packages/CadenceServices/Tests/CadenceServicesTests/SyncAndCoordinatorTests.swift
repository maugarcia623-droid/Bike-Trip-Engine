import Foundation
import Testing
import CadenceCore
@testable import CadenceServices

private final class MockSyncTransport: SyncTransport, @unchecked Sendable {
    private let lock = NSLock()
    var remoteProfile: RemoteRiderProfileRow?
    var remoteBikes: [RemoteRiderBikeRow] = []
    var remoteTrips: [RemoteUserTripRow] = []

    var backfillResponse = BackfillV2Response(status: "no_legacy_data", profilesInserted: 0, bikesInserted: 0, tripsInserted: 0, skipped: 0)
    var backfillHandler: (@Sendable () -> BackfillV2Response)?
    var fetchError: (any Error)?

    private(set) var backfillCallCount = 0
    private(set) var fetchTripsSinceHistory: [Date?] = []
    private(set) var upsertedTrips: [RemoteUserTripUpsert] = []
    private(set) var upsertedBikes: [RemoteRiderBikeUpsert] = []
    private(set) var upsertedProfiles: [RemoteRiderProfileUpsert] = []
    private(set) var syncInvocationCount = 0

    func fetchRiderProfile(userId: UUID) async throws -> RemoteRiderProfileRow? {
        let (error, profile) = lock.withLock { (fetchError, remoteProfile) }
        if let error { throw error }
        return profile
    }

    func upsertRiderProfile(_ row: RemoteRiderProfileUpsert) async throws -> RemoteRiderProfileRow {
        lock.withLock {
            upsertedProfiles.append(row)
            let saved = RemoteRiderProfileRow(
                userId: row.userId,
                schemaVersion: row.schemaVersion,
                riderName: row.riderName,
                activeTripClientId: row.activeTripClientId,
                activeBikeClientId: row.activeBikeClientId,
                specs: row.specs,
                profile: row.profile,
                clientUpdatedAt: row.clientUpdatedAt,
                updatedAt: "2026-11-27T12:00:00.000Z"
            )
            remoteProfile = saved
            return saved
        }
    }

    func fetchRiderBikes(userId: UUID, updatedSince: Date?) async throws -> [RemoteRiderBikeRow] {
        let (error, bikes) = lock.withLock { (fetchError, remoteBikes) }
        if let error { throw error }
        return bikes
    }

    func upsertRiderBikes(_ rows: [RemoteRiderBikeUpsert]) async throws -> [RemoteRiderBikeRow] {
        lock.withLock {
            upsertedBikes.append(contentsOf: rows)
            var saved: [RemoteRiderBikeRow] = []
            for row in rows {
                let out = RemoteRiderBikeRow(
                    userId: row.userId,
                    clientId: row.clientId,
                    schemaVersion: row.schemaVersion,
                    name: row.name,
                    category: row.category,
                    payload: row.payload,
                    sortOrder: row.sortOrder,
                    clientUpdatedAt: row.clientUpdatedAt,
                    updatedAt: "2026-11-27T12:00:00.000Z",
                    deletedAt: row.deletedAt
                )
                if let idx = remoteBikes.firstIndex(where: { $0.clientId == row.clientId }) {
                    remoteBikes[idx] = out
                } else {
                    remoteBikes.append(out)
                }
                saved.append(out)
            }
            return saved
        }
    }

    func fetchUserTrips(userId: UUID, updatedSince: Date?) async throws -> [RemoteUserTripRow] {
        let (error, trips) = lock.withLock { () -> ((any Error)?, [RemoteUserTripRow]) in
            fetchTripsSinceHistory.append(updatedSince)
            syncInvocationCount += 1
            return (fetchError, remoteTrips)
        }
        if let error { throw error }
        return trips
    }

    func upsertUserTrips(_ rows: [RemoteUserTripUpsert]) async throws -> [RemoteUserTripRow] {
        lock.withLock {
            upsertedTrips.append(contentsOf: rows)
            var saved: [RemoteUserTripRow] = []
            for row in rows {
                let out = RemoteUserTripRow(
                    userId: row.userId,
                    clientId: row.clientId,
                    schemaVersion: row.schemaVersion,
                    name: row.name,
                    tag: row.tag,
                    departureDate: row.departureDate,
                    payload: row.payload,
                    clientUpdatedAt: row.clientUpdatedAt,
                    updatedAt: "2026-11-27T12:00:00.000Z",
                    deletedAt: row.deletedAt
                )
                if let idx = remoteTrips.firstIndex(where: { $0.clientId == row.clientId }) {
                    remoteTrips[idx] = out
                } else {
                    remoteTrips.append(out)
                }
                saved.append(out)
            }
            return saved
        }
    }

    func backfillUserStateToV2() async throws -> BackfillV2Response {
        let (handler, response) = lock.withLock { () -> ((@Sendable () -> BackfillV2Response)?, BackfillV2Response) in
            backfillCallCount += 1
            return (backfillHandler, backfillResponse)
        }
        return handler?() ?? response
    }
}

@Suite("SyncModels & CloudSyncCoordinator")
struct SyncAndCoordinatorTests {
    private let userId = UUID(uuidString: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")!

    private func makeTrip(id: String, name: String, departureDate: String? = "2026-06-15") -> TripProfile {
        TripProfile(
            departureDate: departureDate,
            departureTime: "07:00",
            id: id,
            name: name,
            tag: "Gravel",
            route: RouteParams(distanceKm: 180, targetSpeedKmH: 22)
        )
    }

    private func makeBike(id: String, name: String) -> BikeSpec {
        BikeSpec(
            id: id,
            name: name,
            weightKg: 9.5,
            crr: 0.0050,
            cda: 0.35,
            isTubeless: true,
            tireWidthMm: 38,
            bikeCategory: .gravel,
            casingType: .standard,
            isHookless: false
        )
    }

    // MARK: - SyncModels Unit Tests

    @Test("RiderSpecsCloudPayload omits bikes key and decodes empty or partial JSONB")
    func riderSpecsCloudPayloadSerialization() throws {
        let payload = RiderSpecsCloudPayload(from: RiderBikeSpecs.defaultSpecs)
        let encoded = try JSONEncoder().encode(payload)
        let jsonObject = try JSONSerialization.jsonObject(with: encoded) as? [String: Any]
        #expect(jsonObject != nil)
        #expect(jsonObject?["bikes"] == nil)

        // Empty {} JSONB decodes cleanly
        let emptyDecoded = try JSONDecoder().decode(RiderSpecsCloudPayload.self, from: Data("{}".utf8))
        #expect(emptyDecoded.hasMeaningfulContent == false)

        // 0 and false count as meaningful; empty arrays / whitespace do not
        var zeroPayload = RiderSpecsCloudPayload()
        zeroPayload.ftpWatts = 0
        #expect(zeroPayload.hasMeaningfulContent == true)

        var falsePayload = RiderSpecsCloudPayload()
        falsePayload.enableSavoryPalateResets = false
        #expect(falsePayload.hasMeaningfulContent == true)

        var whitespacePayload = RiderSpecsCloudPayload()
        whitespacePayload.riderName = "   "
        whitespacePayload.dietaryFilters = []
        #expect(whitespacePayload.hasMeaningfulContent == false)

        // Hydrates full RiderBikeSpecs with active bike fallback
        let b1 = makeBike(id: "b-1", name: "Gravel")
        let hydrated = emptyDecoded.toRiderBikeSpecs(bikes: [b1], riderNameOverride: "  Max ", activeBikeClientId: "missing-id")
        #expect(hydrated.riderName == "Max")
        #expect(hydrated.activeBikeId == "b-1")
        #expect(hydrated.bikes == [b1])
    }

    @Test("RemoteRiderBikeRow and Upsert use payload column and emit deleted_at null")
    func remoteBikePayloadColumnAndDeletedAtNull() throws {
        let bike = makeBike(id: "b-1", name: "Tourer")
        let upsert = RemoteRiderBikeUpsert(
            userId: userId,
            clientId: "b-1",
            schemaVersion: 2,
            name: "Tourer",
            category: "gravel",
            payload: bike,
            sortOrder: 0,
            clientUpdatedAt: "2026-11-27T10:00:00.000Z",
            deletedAt: nil
        )
        let data = try JSONEncoder().encode(upsert)
        let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        #expect(dict?["payload"] != nil)
        #expect(dict?["spec"] == nil)
        #expect(dict?.keys.contains("deleted_at") == true)
        #expect(dict?["deleted_at"] is NSNull)
    }

    @Test("SyncTimestamp parses 0/3/6 fractional seconds, normalizes departureDate, and compares at 1ms")
    func syncTimestampParsingAndNormalization() {
        let d0 = SyncTimestamp.parse("2026-11-26T10:05:00Z")
        let d0Offset = SyncTimestamp.parse("2026-11-26T10:05:00+00:00")
        let d3 = SyncTimestamp.parse("2026-11-26T10:05:00.123Z")
        let d6 = SyncTimestamp.parse("2026-11-26T10:05:00.123456+00:00")
        let d6Tz = SyncTimestamp.parse("2026-11-26T12:05:00.123456+02:00")

        #expect(d0 != nil)
        #expect(d0 == d0Offset)
        #expect(d3 != nil)
        #expect(d6 != nil)
        #expect(d6Tz != nil)
        if let d6, let d6Tz {
            #expect(SyncTimestamp.compare(d6, d6Tz) == .orderedSame)
        }

        // Departure date normalization
        #expect(SyncTimestamp.normalizeDepartureDate("2026-06-16T08:00:00Z") == "2026-06-16")
        #expect(SyncTimestamp.normalizeDepartureDate("2026-06-16") == "2026-06-16")
        #expect(SyncTimestamp.normalizeDepartureDate("2026-02-29") == nil)
        #expect(SyncTimestamp.normalizeDepartureDate("2024-02-29") == "2024-02-29")
        #expect(SyncTimestamp.normalizeDepartureDate("2026-02-30") == nil)
        #expect(SyncTimestamp.normalizeDepartureDate("2026-+1-+1") == nil)
        #expect(SyncTimestamp.normalizeDepartureDate("+202-06-16") == nil)
        #expect(SyncTimestamp.normalizeDepartureDate("2026-06-16 08:00:00Z") == nil)
        #expect(SyncTimestamp.normalizeDepartureDate("") == nil)
        #expect(SyncTimestamp.normalizeDepartureDate("not-a-date") == nil)

        // 1ms tolerance
        let base = Date(timeIntervalSince1970: 1_700_000_000.000)
        let withinTolerance = Date(timeIntervalSince1970: 1_700_000_000.0005)
        let outsideTolerance = Date(timeIntervalSince1970: 1_700_000_000.010)
        #expect(SyncTimestamp.compare(base, withinTolerance) == .orderedSame)
        #expect(SyncTimestamp.compare(outsideTolerance, base) == .orderedDescending)
    }

    // MARK: - CloudSyncCoordinator Tests

    @Test("Initial backfill RPC runs once when v2 tables are empty and skips when tombstone exists")
    func initialBackfillBehavior() async throws {
        // Case 1: Empty v2 tables -> runs backfill and re-fetches migrated data
        let store1 = try CadenceModelContainer.makeStore(inMemory: true)
        let transport1 = MockSyncTransport()
        let migratedTrip = makeTrip(id: "legacy-trip", name: "Migrated Tour")
        transport1.backfillHandler = { [userId, transport1] in
            transport1.remoteTrips = [
                RemoteUserTripRow(
                    userId: userId,
                    clientId: "legacy-trip",
                    schemaVersion: 2,
                    name: "Migrated Tour",
                    tag: "Gravel",
                    departureDate: "2026-06-15",
                    payload: migratedTrip,
                    clientUpdatedAt: "2026-11-27T09:00:00.000Z",
                    updatedAt: "2026-11-27T09:00:01.000Z",
                    deletedAt: nil
                )
            ]
            return BackfillV2Response(status: "ok", profilesInserted: 0, bikesInserted: 0, tripsInserted: 1, skipped: 0)
        }

        let coord1 = CloudSyncCoordinator(localStore: store1, transport: transport1)
        let report1 = try await coord1.sync(userId: userId, fullSync: true)
        #expect(report1.didRunBackfill == true)
        #expect(report1.tripsPulled == 1)
        #expect(transport1.backfillCallCount == 1)
        #expect(try await store1.fetchTrip(clientId: "legacy-trip")?.name == "Migrated Tour")

        // Case 2: Tombstone exists in user_trips -> backfill MUST NOT run
        let store2 = try CadenceModelContainer.makeStore(inMemory: true)
        let transport2 = MockSyncTransport()
        transport2.remoteTrips = [
            RemoteUserTripRow(
                userId: userId,
                clientId: "deleted-trip",
                schemaVersion: 2,
                name: "Deleted",
                tag: "Road",
                departureDate: nil,
                payload: makeTrip(id: "deleted-trip", name: "Deleted"),
                clientUpdatedAt: "2026-11-27T09:00:00.000Z",
                updatedAt: "2026-11-27T09:00:00.000Z",
                deletedAt: "2026-11-27T09:00:00.000Z"
            )
        ]
        let coord2 = CloudSyncCoordinator(localStore: store2, transport: transport2)
        let report2 = try await coord2.sync(userId: userId, fullSync: true)
        #expect(report2.didRunBackfill == false)
        #expect(transport2.backfillCallCount == 0)
    }

    @Test("LWW local-wins, remote-wins, and 1ms tie-breaker")
    func lwwResolution() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let transport = MockSyncTransport()

        let tOld = Date(timeIntervalSince1970: 1_700_000_000)
        let tNew = Date(timeIntervalSince1970: 1_700_000_100)

        // Trip A: local newer -> local wins
        try await store.upsertTrip(makeTrip(id: "trip-a", name: "Local Newer"), clientUpdatedAt: tNew, markNeedsSync: true)
        transport.remoteTrips.append(RemoteUserTripRow(
            userId: userId,
            clientId: "trip-a",
            name: "Remote Older",
            tag: "Gravel",
            payload: makeTrip(id: "trip-a", name: "Remote Older"),
            clientUpdatedAt: SyncTimestamp.format(tOld),
            updatedAt: SyncTimestamp.format(tOld)
        ))

        // Trip B: remote newer -> remote wins
        try await store.upsertTrip(makeTrip(id: "trip-b", name: "Local Older"), clientUpdatedAt: tOld, markNeedsSync: true)
        transport.remoteTrips.append(RemoteUserTripRow(
            userId: userId,
            clientId: "trip-b",
            name: "Remote Newer",
            tag: "Gravel",
            payload: makeTrip(id: "trip-b", name: "Remote Newer"),
            clientUpdatedAt: SyncTimestamp.format(tNew),
            updatedAt: SyncTimestamp.format(tNew)
        ))

        // Trip C: within 1ms tie -> remote wins cleanly
        let tTieRemote = tOld
        let tTieLocal = tOld.addingTimeInterval(0.0004)
        try await store.upsertTrip(makeTrip(id: "trip-c", name: "Local Tie"), clientUpdatedAt: tTieLocal, markNeedsSync: true)
        transport.remoteTrips.append(RemoteUserTripRow(
            userId: userId,
            clientId: "trip-c",
            name: "Remote Tie",
            tag: "Gravel",
            payload: makeTrip(id: "trip-c", name: "Remote Tie"),
            clientUpdatedAt: SyncTimestamp.format(tTieRemote),
            updatedAt: SyncTimestamp.format(tTieRemote)
        ))

        let coordinator = CloudSyncCoordinator(localStore: store, transport: transport)
        let report = try await coordinator.sync(userId: userId, fullSync: true)

        #expect(report.tripsPushed == 1)
        #expect(report.tripsPulled == 2)
        #expect(try await store.fetchTrip(clientId: "trip-a")?.name == "Local Newer")
        #expect(try await store.fetchTrip(clientId: "trip-b")?.name == "Remote Newer")
        #expect(try await store.fetchTrip(clientId: "trip-c")?.name == "Remote Tie")
        #expect(transport.upsertedTrips.map(\.clientId) == ["trip-a"])

        let allLocal = try await store.fetchAllTripRecordsIncludingDeleted()
        #expect(allLocal.allSatisfy { $0.needsSync == false })
        #expect(await coordinator.serverCursor(for: userId) != nil)
    }

    @Test("Bidirectional deleted_at tombstones, resurrection, and active ID fallbacks")
    func tombstonesResurrectionAndActiveFallbacks() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let transport = MockSyncTransport()

        let t1 = Date(timeIntervalSince1970: 1_700_000_000)
        let t2 = Date(timeIntervalSince1970: 1_700_000_200)

        // 1. Remote deletes trip-1 at T2 > local T1
        try await store.upsertTrip(makeTrip(id: "trip-1", name: "Will Be Deleted Locally"), clientUpdatedAt: t1)
        transport.remoteTrips.append(RemoteUserTripRow(
            userId: userId,
            clientId: "trip-1",
            name: "Will Be Deleted Locally",
            tag: "Gravel",
            payload: makeTrip(id: "trip-1", name: "Will Be Deleted Locally"),
            clientUpdatedAt: SyncTimestamp.format(t2),
            updatedAt: SyncTimestamp.format(t2),
            deletedAt: SyncTimestamp.format(t2)
        ))

        // 2. Local deletes trip-2 at T2 > remote T1
        try await store.upsertTrip(makeTrip(id: "trip-2", name: "Will Be Deleted Remotely"), clientUpdatedAt: t1)
        try await store.softDeleteTrip(clientId: "trip-2", deletedAt: t2)
        transport.remoteTrips.append(RemoteUserTripRow(
            userId: userId,
            clientId: "trip-2",
            name: "Will Be Deleted Remotely",
            tag: "Gravel",
            payload: makeTrip(id: "trip-2", name: "Will Be Deleted Remotely"),
            clientUpdatedAt: SyncTimestamp.format(t1),
            updatedAt: SyncTimestamp.format(t1),
            deletedAt: nil
        ))

        // 3. Resurrection: remote deleted bike-1 at T1, local resurrected/edited at T2 > T1
        try await store.upsertBike(makeBike(id: "bike-1", name: "Resurrected Bike"), clientUpdatedAt: t2)
        transport.remoteBikes.append(RemoteRiderBikeRow(
            userId: userId,
            clientId: "bike-1",
            name: "Resurrected Bike",
            category: "gravel",
            payload: makeBike(id: "bike-1", name: "Resurrected Bike"),
            sortOrder: 0,
            clientUpdatedAt: SyncTimestamp.format(t1),
            updatedAt: SyncTimestamp.format(t1),
            deletedAt: SyncTimestamp.format(t1)
        ))

        // 4. Active ID fallback when remote profile points to deleted trip-1 and missing bike-999
        transport.remoteProfile = RemoteRiderProfileRow(
            userId: userId,
            riderName: "Sam",
            activeTripClientId: "trip-1",
            activeBikeClientId: "bike-999",
            specs: RiderSpecsCloudPayload(activeBikeId: "bike-999"),
            profile: UserProfileDTO(name: "Sam"),
            clientUpdatedAt: SyncTimestamp.format(t2),
            updatedAt: SyncTimestamp.format(t2)
        )

        let coordinator = CloudSyncCoordinator(localStore: store, transport: transport)
        let report = try await coordinator.sync(userId: userId, fullSync: true)

        #expect(report.tripsDeletedLocally == 1)
        #expect(report.tripsDeletedRemotely == 1)
        #expect(report.bikesPushed == 1)

        // trip-1 and trip-2 are both deleted locally; trip-2 pushed deleted_at; bike-1 resurrected with deleted_at = nil
        #expect(try await store.fetchActiveTrips().isEmpty)
        let pushedTrip2 = try #require(transport.upsertedTrips.first { $0.clientId == "trip-2" })
        #expect(pushedTrip2.deletedAt != nil)

        let pushedBike1 = try #require(transport.upsertedBikes.first { $0.clientId == "bike-1" })
        #expect(pushedBike1.deletedAt == nil)

        let savedProfile = try #require(try await store.fetchSyncableRiderProfile())
        #expect(savedProfile.activeTripClientId == nil)
        #expect(savedProfile.activeBikeClientId == "bike-1")
        #expect(savedProfile.specs.activeBikeId == "bike-1")
    }

    @Test("RLS 42501 error propagates as SyncError.serverError and sets error status")
    func rlsErrorPropagates() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let transport = MockSyncTransport()
        transport.fetchError = SyncError.serverError(code: "42501", message: "permission denied for table user_trips")

        let coordinator = CloudSyncCoordinator(localStore: store, transport: transport)
        do {
            _ = try await coordinator.sync(userId: userId)
            Issue.record("Expected SyncError.serverError to be thrown")
        } catch let error as SyncError {
            #expect(error == .serverError(code: "42501", message: "permission denied for table user_trips"))
        }

        let status = await coordinator.syncStatus
        if case .error = status {
            // Expected
        } else {
            Issue.record("Expected syncStatus to be .error, got \(status)")
        }
    }

    @Test("Debounced scheduleSync coalesces rapid calls and onSignOut cancels pending debounce")
    func debouncedScheduleSyncAndSignOut() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let transport = MockSyncTransport()
        let coordinator = CloudSyncCoordinator(localStore: store, transport: transport)

        // Rapid scheduleSync calls coalesce into 1 sync
        await coordinator.scheduleSync(userId: userId, delay: .milliseconds(60))
        await coordinator.scheduleSync(userId: userId, delay: .milliseconds(60))
        await coordinator.scheduleSync(userId: userId, delay: .milliseconds(60))

        try await Task.sleep(for: .milliseconds(200))
        #expect(transport.syncInvocationCount == 1)
        #expect(await coordinator.syncStatus == .synced)

        // onSignOut cancels pending debounce and resets state
        await coordinator.scheduleSync(userId: userId, delay: .milliseconds(150))
        await coordinator.onSignOut()
        try await Task.sleep(for: .milliseconds(250))

        #expect(transport.syncInvocationCount == 1)
        #expect(await coordinator.syncStatus == .idle)
        #expect(await coordinator.lastSyncedAt == nil)
    }

    @Test("SupabaseSyncTransport integration via MockURLProtocol verifies PostgREST endpoints, payload column, and no deleted_at filter")
    func supabaseSyncTransportHTTPIntegration() async throws {
        let capturedRequests = BoxedList<(method: String, path: String, query: String?)>()
        let trip = makeTrip(id: "http-trip-1", name: "HTTP Tour")
        let bike = makeBike(id: "http-bike-1", name: "HTTP Bike")

        let encoder = JSONEncoder()
        let tripPayloadStr = String(data: try encoder.encode(trip), encoding: .utf8)!
        let bikePayloadStr = String(data: try encoder.encode(bike), encoding: .utf8)!

        let (mockId, session) = MockURLProtocol.registerSession { request, _ in
            let path = request.url?.path ?? ""
            let query = request.url?.query
            capturedRequests.append((request.httpMethod ?? "", path, query))

            let body: String
            if path.hasSuffix("/rest/v1/rider_profiles") {
                body = """
                [{
                  "user_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                  "schema_version": 2,
                  "rider_name": "HTTP Rider",
                  "active_trip_client_id": "http-trip-1",
                  "active_bike_client_id": "http-bike-1",
                  "specs": {"ftpWatts": 250},
                  "profile": {},
                  "client_updated_at": "2026-11-27T10:00:00.000Z",
                  "updated_at": "2026-11-27T10:00:01.000Z"
                }]
                """
            } else if path.hasSuffix("/rest/v1/rider_bikes") {
                body = """
                [{
                  "user_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                  "client_id": "http-bike-1",
                  "schema_version": 2,
                  "name": "HTTP Bike",
                  "category": "gravel",
                  "payload": \(bikePayloadStr),
                  "sort_order": 0,
                  "client_updated_at": "2026-11-27T10:00:00.000Z",
                  "updated_at": "2026-11-27T10:00:01.000Z",
                  "deleted_at": null
                }]
                """
            } else if path.hasSuffix("/rest/v1/user_trips") {
                body = """
                [{
                  "user_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                  "client_id": "http-trip-1",
                  "schema_version": 2,
                  "name": "HTTP Tour",
                  "tag": "Gravel",
                  "departure_date": "2026-06-15",
                  "payload": \(tripPayloadStr),
                  "client_updated_at": "2026-11-27T10:00:00.000Z",
                  "updated_at": "2026-11-27T10:00:01.000Z",
                  "deleted_at": null
                }]
                """
            } else {
                body = "{}"
            }

            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (response, Data(body.utf8))
        }
        defer { MockURLProtocol.unregister(id: mockId) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://mock-sync.supabase.co")!,
            supabaseAnonKey: "anon-key",
            urlSession: session,
            authStorage: InMemoryAuthLocalStorage()
        )
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let coordinator = CloudSyncCoordinator(localStore: store, configuration: config)

        let report = try await coordinator.sync(userId: userId, fullSync: true)
        #expect(report.tripsPulled == 1)
        #expect(report.bikesPulled == 1)
        #expect(report.profileDirection == .pulled)

        let bikesReq = try #require(capturedRequests.snapshot().first { $0.path == "/rest/v1/rider_bikes" })
        #expect(bikesReq.query?.contains("payload") == true)
        #expect(bikesReq.query?.contains("deleted_at=is.null") != true)

        let tripsReq = try #require(capturedRequests.snapshot().first { $0.path == "/rest/v1/user_trips" })
        #expect(tripsReq.query?.contains("deleted_at=is.null") != true)

        let loadedTrip = try await store.fetchTrip(clientId: "http-trip-1")
        #expect(loadedTrip?.name == "HTTP Tour")
        let loadedBike = try await store.fetchBike(clientId: "http-bike-1")
        #expect(loadedBike?.name == "HTTP Bike")
    }

    @Test("Incremental delta sync uses updatedSince cursor and avoids re-pushing unchanged rows")
    func incrementalDeltaSyncUsesCursor() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let transport = MockSyncTransport()
        let t1 = Date(timeIntervalSince1970: 1_700_000_000)

        try await store.upsertTrip(makeTrip(id: "t-1", name: "Existing"), clientUpdatedAt: t1, markNeedsSync: true)
        let coordinator = CloudSyncCoordinator(localStore: store, transport: transport)

        let first = try await coordinator.sync(userId: userId, fullSync: true)
        #expect(first.tripsPushed == 1)
        #expect(transport.fetchTripsSinceHistory.first == .some(nil))

        // Second sync (delta): cursor is set, and unchanged t-1 is NOT pushed again
        transport.remoteTrips = []
        let second = try await coordinator.sync(userId: userId, fullSync: false)
        #expect(second.tripsPushed == 0)
        let cursor = await coordinator.serverCursor(for: userId)
        #expect(cursor != nil)
        #expect(transport.fetchTripsSinceHistory.last == .some(cursor))
        #expect(transport.upsertedTrips.count == 1)
    }

    @Test("SupabaseSyncTransport maps PostgREST 42P01 to missingSchemaObject, 42501 to serverError, and calls backfill RPC via HTTP")
    func supabaseSyncTransportHTTPErrorAndRPCMapping() async throws {
        // 1. Backfill RPC via MockURLProtocol when all 3 v2 tables return []
        let rpcPaths = BoxedList<String>()
        let (rpcMockId, rpcSession) = MockURLProtocol.registerSession { request, _ in
            let path = request.url?.path ?? ""
            rpcPaths.append(path)
            let body: String
            if path.hasSuffix("/rest/v1/rpc/backfill_user_state_to_v2") {
                body = #"{"status":"ok","profiles_inserted":0,"bikes_inserted":0,"trips_inserted":0,"skipped":0}"#
            } else {
                body = "[]"
            }
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (response, Data(body.utf8))
        }
        defer { MockURLProtocol.unregister(id: rpcMockId) }

        let rpcConfig = SupabaseConfiguration(
            supabaseURL: URL(string: "https://mock-rpc.supabase.co")!,
            supabaseAnonKey: "anon-key",
            urlSession: rpcSession,
            authStorage: InMemoryAuthLocalStorage()
        )
        let rpcTransport = SupabaseSyncTransport(configuration: rpcConfig)
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let coord = CloudSyncCoordinator(localStore: store, transport: rpcTransport)
        let report = try await coord.sync(userId: userId, fullSync: true)
        #expect(report.didRunBackfill == true)
        #expect(rpcPaths.snapshot().contains("/rest/v1/rpc/backfill_user_state_to_v2"))

        // 2. PostgREST 42P01 missing relation -> SyncError.missingSchemaObject
        let (errMockId, errSession) = MockURLProtocol.registerSession { request, _ in
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 404,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            let payload = #"{"code":"42P01","message":"relation \"public.rider_bikes\" does not exist"}"#
            return (response, Data(payload.utf8))
        }
        defer { MockURLProtocol.unregister(id: errMockId) }

        let errTransport = SupabaseSyncTransport(
            configuration: SupabaseConfiguration(
                supabaseURL: URL(string: "https://mock-err.supabase.co")!,
                supabaseAnonKey: "anon-key",
                urlSession: errSession,
                authStorage: InMemoryAuthLocalStorage()
            )
        )
        do {
            _ = try await errTransport.fetchRiderBikes(userId: userId, updatedSince: nil)
            Issue.record("Expected missingSchemaObject error")
        } catch let error as SyncError {
            if case .missingSchemaObject = error {
                // Expected
            } else {
                Issue.record("Expected missingSchemaObject, got \(error)")
            }
        }
    }

    @Test("onSignOut mid-flight leaves syncStatus idle, lastSyncedAt nil, and does not clobber subsequent sync")
    func onSignOutMidFlightDoesNotOverwriteIdleOrSubsequentSync() async throws {
        let userA = UUID(uuidString: "11111111-1111-1111-1111-111111111111")!
        let userB = UUID(uuidString: "22222222-2222-2222-2222-222222222222")!

        // Case 1: Cancelled via onSignOut() mid-flight -> syncStatus stays .idle, lastSyncedAt stays nil
        let store1 = try CadenceModelContainer.makeStore(inMemory: true)
        let gate1 = SyncGate(ignoreCancellation: false)
        let transport1 = DelayedSyncTransport(
            remoteTripsByUser: [:],
            gatesByUser: [userA: gate1]
        )
        let coord1 = CloudSyncCoordinator(localStore: store1, transport: transport1)

        let task1 = Task {
            try await coord1.sync(userId: userA, fullSync: true)
        }
        await gate1.waitUntilEntered()
        #expect(await coord1.syncStatus == .loading)

        await coord1.onSignOut()
        #expect(await coord1.syncStatus == .idle)
        #expect(await coord1.lastSyncedAt == nil)

        await gate1.release()
        do {
            _ = try await task1.value
            Issue.record("Expected cancelled sync to throw CancellationError")
        } catch is CancellationError {
            // Expected
        }
        #expect(await coord1.syncStatus == .idle)
        #expect(await coord1.lastSyncedAt == nil)

        // Case 2: Non-cancelling transport returns after onSignOut() + subsequent userB sync starts ->
        // stale userA unwind must NOT clobber userB's inFlightSync, syncStatus, or lastSyncedAt.
        let store2 = try CadenceModelContainer.makeStore(inMemory: true)
        let gateA = SyncGate(ignoreCancellation: true)
        let tripB = makeTrip(id: "trip-b-after-signout", name: "User B Trip")
        let transport2 = DelayedSyncTransport(
            remoteTripsByUser: [
                userB: [
                    RemoteUserTripRow(
                        userId: userB,
                        clientId: "trip-b-after-signout",
                        name: "User B Trip",
                        tag: "Gravel",
                        payload: tripB,
                        clientUpdatedAt: "2026-11-27T11:00:00.000Z",
                        updatedAt: "2026-11-27T11:00:01.000Z"
                    )
                ]
            ],
            gatesByUser: [userA: gateA]
        )
        let coord2 = CloudSyncCoordinator(localStore: store2, transport: transport2)

        let syncA = Task {
            try await coord2.sync(userId: userA, fullSync: true)
        }
        await gateA.waitUntilEntered()

        await coord2.onSignOut()
        #expect(await coord2.syncStatus == .idle)
        #expect(await coord2.lastSyncedAt == nil)

        // Start userB sync BEFORE releasing userA's stale transport
        let syncB = Task {
            try await coord2.sync(userId: userB, fullSync: true)
        }
        // Release userA while userB is running/completing
        await gateA.release()

        do {
            _ = try await syncA.value
            Issue.record("Expected stale userA sync to throw CancellationError after onSignOut")
        } catch is CancellationError {
            // Expected
        }

        let reportB = try await syncB.value
        #expect(reportB.tripsPulled == 1)
        #expect(await coord2.syncStatus == .synced)
        #expect(await coord2.lastSyncedAt != nil)
        #expect(try await store2.fetchTrip(clientId: "trip-b-after-signout")?.name == "User B Trip")
    }

    @Test("Concurrent sync for distinct userId does not coalesce and concurrent fullSync true does not downgrade")
    func multiUserAndFullSyncCoalescing() async throws {
        let userA = UUID(uuidString: "11111111-1111-1111-1111-111111111111")!
        let userB = UUID(uuidString: "22222222-2222-2222-2222-222222222222")!

        // Subtest 1: Concurrent userB sync while userA sync is in-flight must NOT coalesce onto userA
        let store1 = try CadenceModelContainer.makeStore(inMemory: true)
        let gateA = SyncGate(ignoreCancellation: false)
        let tripB = makeTrip(id: "trip-for-B", name: "Trip For B")
        let transport1 = DelayedSyncTransport(
            remoteTripsByUser: [
                userB: [
                    RemoteUserTripRow(
                        userId: userB,
                        clientId: "trip-for-B",
                        name: "Trip For B",
                        tag: "Gravel",
                        payload: tripB,
                        clientUpdatedAt: "2026-11-27T10:00:00.000Z",
                        updatedAt: "2026-11-27T10:00:01.000Z"
                    )
                ]
            ],
            gatesByUser: [userA: gateA]
        )
        let coord1 = CloudSyncCoordinator(localStore: store1, transport: transport1)

        let syncA = Task {
            try await coord1.sync(userId: userA, fullSync: false)
        }
        await gateA.waitUntilEntered()

        let syncB = Task {
            try await coord1.sync(userId: userB, fullSync: true)
        }
        try await Task.sleep(for: .milliseconds(25))
        await gateA.release()

        let reportA = try await syncA.value
        let reportB = try await syncB.value
        #expect(reportA.tripsPulled == 0)
        #expect(reportB.tripsPulled == 1)
        #expect(try await store1.fetchTrip(clientId: "trip-for-B")?.name == "Trip For B")

        // Subtest 2: Concurrent fullSync: true while fullSync: false is in-flight must NOT downgrade to incremental
        let store2 = try CadenceModelContainer.makeStore(inMemory: true)
        let gateInc = SyncGate(ignoreCancellation: false)
        let seedTrip = RemoteUserTripRow(
            userId: userA,
            clientId: "seed-a",
            name: "Seed A",
            tag: "Gravel",
            payload: makeTrip(id: "seed-a", name: "Seed A"),
            clientUpdatedAt: "2026-11-27T09:00:00.000Z",
            updatedAt: "2026-11-27T09:00:01.000Z"
        )
        let transport2 = DelayedSyncTransport(
            remoteTripsByUser: [userA: [seedTrip]],
            gatesByUser: [:]
        )
        let coord2 = CloudSyncCoordinator(localStore: store2, transport: transport2)

        // Initial full sync sets cursor for userA
        _ = try await coord2.sync(userId: userA, fullSync: true)
        #expect(await coord2.serverCursor(for: userA) != nil)

        await transport2.setGate(gateInc, for: userA)
        let syncInc = Task {
            try await coord2.sync(userId: userA, fullSync: false)
        }
        await gateInc.waitUntilEntered()
        // Clear gate before fullSync runs after syncInc settles
        await transport2.setGate(nil, for: userA)

        let syncFull = Task {
            try await coord2.sync(userId: userA, fullSync: true)
        }
        try await Task.sleep(for: .milliseconds(25))
        await gateInc.release()

        _ = try await syncInc.value
        _ = try await syncFull.value

        let history = await transport2.fetchTripsHistory(for: userA)
        // [nil (initial), <cursor> (incremental), nil (upgraded fullSync)]
        #expect(history.count == 3)
        #expect(history[0] == nil)
        #expect(history[1] != nil)
        #expect(history[2] == nil)

        // Subtest 3: Concurrent fullSync: false while fullSync: true is in-flight DOES coalesce
        let gateCoalesce = SyncGate(ignoreCancellation: false)
        await transport2.setGate(gateCoalesce, for: userA)
        let primaryFull = Task {
            try await coord2.sync(userId: userA, fullSync: true)
        }
        await gateCoalesce.waitUntilEntered()
        let coalescedInc = Task {
            try await coord2.sync(userId: userA, fullSync: false)
        }
        try await Task.sleep(for: .milliseconds(25))
        await gateCoalesce.release()
        _ = try await primaryFull.value
        _ = try await coalescedInc.value
        let finalHistory = await transport2.fetchTripsHistory(for: userA)
        #expect(finalHistory.count == 4)
    }

    @Test("SupabaseSyncTransport HTTP-level POST upsert bodies, incremental updated_at=gte. query, and HTTP 403 42501 RLS error")
    func supabaseSyncTransportUpsertBodiesIncrementalQueryAnd42501() async throws {
        struct CapturedHTTPRequest: Sendable {
            let method: String
            let path: String
            let query: String?
            let body: Data?
        }

        let captured = BoxedList<CapturedHTTPRequest>()
        let (mockId, session) = MockURLProtocol.registerSession { request, bodyData in
            let path = request.url?.path ?? ""
            let query = request.url?.query(percentEncoded: false)
            let method = request.httpMethod ?? ""
            captured.append(CapturedHTTPRequest(method: method, path: path, query: query, body: bodyData))

            let responseBody: String
            if method == "POST", path.hasSuffix("/rest/v1/rpc/backfill_user_state_to_v2") {
                responseBody = #"{"status":"ok","profiles_inserted":0,"bikes_inserted":0,"trips_inserted":0,"skipped":0}"#
            } else if method == "POST", path.hasSuffix("/rest/v1/user_trips") {
                let rawBody = bodyData.flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
                // Echo back with updated_at populated
                if var arr = try? JSONSerialization.jsonObject(with: Data(rawBody.utf8)) as? [[String: Any]] {
                    for i in arr.indices {
                        arr[i]["updated_at"] = "2026-11-27T12:00:05.000Z"
                    }
                    responseBody = String(data: try JSONSerialization.data(withJSONObject: arr), encoding: .utf8)!
                } else {
                    responseBody = "[]"
                }
            } else if method == "POST", path.hasSuffix("/rest/v1/rider_bikes") {
                let rawBody = bodyData.flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
                if var arr = try? JSONSerialization.jsonObject(with: Data(rawBody.utf8)) as? [[String: Any]] {
                    for i in arr.indices {
                        arr[i]["updated_at"] = "2026-11-27T12:00:05.000Z"
                    }
                    responseBody = String(data: try JSONSerialization.data(withJSONObject: arr), encoding: .utf8)!
                } else {
                    responseBody = "[]"
                }
            } else if method == "POST", path.hasSuffix("/rest/v1/rider_profiles") {
                let rawBody = bodyData.flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
                if var dict = try? JSONSerialization.jsonObject(with: Data(rawBody.utf8)) as? [String: Any] {
                    dict["updated_at"] = "2026-11-27T12:00:05.000Z"
                    responseBody = String(data: try JSONSerialization.data(withJSONObject: dict), encoding: .utf8)!
                } else if var arr = try? JSONSerialization.jsonObject(with: Data(rawBody.utf8)) as? [[String: Any]], !arr.isEmpty {
                    arr[0]["updated_at"] = "2026-11-27T12:00:05.000Z"
                    responseBody = String(data: try JSONSerialization.data(withJSONObject: arr[0]), encoding: .utf8)!
                } else {
                    responseBody = "{}"
                }
            } else {
                responseBody = "[]"
            }

            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (response, Data(responseBody.utf8))
        }
        defer { MockURLProtocol.unregister(id: mockId) }

        let config = SupabaseConfiguration(
            supabaseURL: URL(string: "https://mock-upsert.supabase.co")!,
            supabaseAnonKey: "anon-key",
            urlSession: session,
            authStorage: InMemoryAuthLocalStorage()
        )
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let t1 = Date(timeIntervalSince1970: 1_700_000_000)

        let trip = makeTrip(id: "post-trip-1", name: "POST Trip", departureDate: "2026-07-04T06:30:00Z")
        let bike = makeBike(id: "post-bike-1", name: "POST Bike")
        var specs = RiderBikeSpecs.defaultSpecs
        specs.riderName = "HTTP Rider"
        specs.ftpWatts = 285
        specs.bikes = [bike]
        specs.activeBikeId = "post-bike-1"

        try await store.upsertTrip(trip, sortOrder: 0, clientUpdatedAt: t1, markNeedsSync: true)
        try await store.upsertBike(bike, sortOrder: 0, clientUpdatedAt: t1, markNeedsSync: true)
        try await store.saveRiderProfile(
            specs: specs,
            userProfile: UserProfileDTO(name: "HTTP Rider", heightCm: 178, weightKg: 70),
            activeTripClientId: "post-trip-1",
            activeBikeClientId: "post-bike-1",
            hasCompletedOnboarding: true,
            userId: userId.uuidString.lowercased(),
            clientUpdatedAt: t1,
            markNeedsSync: true
        )

        let coordinator = CloudSyncCoordinator(localStore: store, configuration: config)
        let report1 = try await coordinator.sync(userId: userId, fullSync: true)
        #expect(report1.tripsPushed == 1)
        #expect(report1.bikesPushed == 1)
        #expect(report1.profileDirection == .pushed)

        let snapshot1 = captured.snapshot()

        // Verify POST /rest/v1/user_trips body
        let postTripReq = try #require(snapshot1.first { $0.method == "POST" && $0.path == "/rest/v1/user_trips" })
        let tripBodyData = try #require(postTripReq.body)
        let tripArr = try #require(try JSONSerialization.jsonObject(with: tripBodyData) as? [[String: Any]])
        #expect(tripArr.count == 1)
        #expect(tripArr[0]["client_id"] as? String == "post-trip-1")
        #expect(tripArr[0]["departure_date"] as? String == "2026-07-04")
        #expect(tripArr[0]["deleted_at"] is NSNull)
        let tripPayload = try #require(tripArr[0]["payload"] as? [String: Any])
        #expect(tripPayload["name"] as? String == "POST Trip")

        // Verify POST /rest/v1/rider_bikes body uses "payload" (not "spec") and explicit deleted_at null
        let postBikeReq = try #require(snapshot1.first { $0.method == "POST" && $0.path == "/rest/v1/rider_bikes" })
        let bikeBodyData = try #require(postBikeReq.body)
        let bikeArr = try #require(try JSONSerialization.jsonObject(with: bikeBodyData) as? [[String: Any]])
        #expect(bikeArr.count == 1)
        #expect(bikeArr[0]["client_id"] as? String == "post-bike-1")
        #expect(bikeArr[0]["payload"] != nil)
        #expect(bikeArr[0]["spec"] == nil)
        #expect(bikeArr[0]["deleted_at"] is NSNull)

        // Verify POST /rest/v1/rider_profiles body omits "bikes" from specs
        let postProfileReq = try #require(snapshot1.first { $0.method == "POST" && $0.path == "/rest/v1/rider_profiles" })
        let profileBodyData = try #require(postProfileReq.body)
        let profileJson = try JSONSerialization.jsonObject(with: profileBodyData)
        let profileDict: [String: Any]
        if let dict = profileJson as? [String: Any] {
            profileDict = dict
        } else if let arr = profileJson as? [[String: Any]], let first = arr.first {
            profileDict = first
        } else {
            Issue.record("Unexpected rider_profiles POST JSON shape")
            return
        }
        let specsDict = try #require(profileDict["specs"] as? [String: Any])
        #expect(specsDict["bikes"] == nil)
        #expect(specsDict["ftpWatts"] as? Int == 285)

        // Run incremental sync -> verify updated_at=gte. query parameter on GET requests
        let countBeforeIncremental = snapshot1.count
        _ = try await coordinator.sync(userId: userId, fullSync: false)
        let snapshot2 = Array(captured.snapshot().dropFirst(countBeforeIncremental))

        let incBikesGet = try #require(snapshot2.first { $0.method == "GET" && $0.path == "/rest/v1/rider_bikes" })
        #expect(incBikesGet.query?.contains("updated_at=gte.") == true)
        let incTripsGet = try #require(snapshot2.first { $0.method == "GET" && $0.path == "/rest/v1/user_trips" })
        #expect(incTripsGet.query?.contains("updated_at=gte.") == true)

        // Verify HTTP 403 42501 RLS error propagates as SyncError.serverError(code: "42501", ...)
        let (rlsMockId, rlsSession) = MockURLProtocol.registerSession { request, _ in
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 403,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            let payload = #"{"code":"42501","message":"new row violates row-level security policy for table \"user_trips\""}"#
            return (response, Data(payload.utf8))
        }
        defer { MockURLProtocol.unregister(id: rlsMockId) }

        let rlsTransport = SupabaseSyncTransport(
            configuration: SupabaseConfiguration(
                supabaseURL: URL(string: "https://mock-rls.supabase.co")!,
                supabaseAnonKey: "anon-key",
                urlSession: rlsSession,
                authStorage: InMemoryAuthLocalStorage()
            )
        )
        do {
            _ = try await rlsTransport.fetchUserTrips(userId: userId, updatedSince: nil)
            Issue.record("Expected SyncError.serverError for HTTP 403 42501")
        } catch let error as SyncError {
            #expect(error == .serverError(code: "42501", message: "new row violates row-level security policy for table \"user_trips\""))
        }
    }
}

private actor SyncGate {
    private let ignoreCancellation: Bool
    private var entered = false
    private var entryWaiters: [CheckedContinuation<Void, Never>] = []
    private var released = false
    private var releaseWaiters: [CheckedContinuation<Void, any Error>] = []
    private var nonThrowingWaiters: [CheckedContinuation<Void, Never>] = []

    init(ignoreCancellation: Bool) {
        self.ignoreCancellation = ignoreCancellation
    }

    func markEnteredAndWaitForRelease() async throws {
        entered = true
        let waiters = entryWaiters
        entryWaiters.removeAll()
        for w in waiters {
            w.resume()
        }

        if released { return }
        if ignoreCancellation {
            await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
                if released {
                    cont.resume()
                } else {
                    nonThrowingWaiters.append(cont)
                }
            }
        } else {
            try await withTaskCancellationHandler {
                try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, any Error>) in
                    if Task.isCancelled {
                        cont.resume(throwing: CancellationError())
                    } else if released {
                        cont.resume()
                    } else {
                        releaseWaiters.append(cont)
                    }
                }
            } onCancel: {
                Task { await self.cancelAllWaiters() }
            }
        }
    }

    private func cancelAllWaiters() {
        let waiters = releaseWaiters
        releaseWaiters.removeAll()
        for w in waiters {
            w.resume(throwing: CancellationError())
        }
    }

    func waitUntilEntered() async {
        if entered { return }
        await withCheckedContinuation { cont in
            if entered {
                cont.resume()
            } else {
                entryWaiters.append(cont)
            }
        }
    }

    func release() {
        released = true
        let waiters = releaseWaiters
        releaseWaiters.removeAll()
        for w in waiters {
            w.resume()
        }
        let nonThrowing = nonThrowingWaiters
        nonThrowingWaiters.removeAll()
        for w in nonThrowing {
            w.resume()
        }
    }
}

private actor DelayedSyncTransport: SyncTransport {
    private var remoteProfilesByUser: [UUID: RemoteRiderProfileRow]
    private var remoteBikesByUser: [UUID: [RemoteRiderBikeRow]]
    private var remoteTripsByUser: [UUID: [RemoteUserTripRow]]
    private var gatesByUser: [UUID: SyncGate]
    private var fetchTripsHistoryByUser: [UUID: [Date?]] = [:]

    init(
        remoteProfilesByUser: [UUID: RemoteRiderProfileRow] = [:],
        remoteBikesByUser: [UUID: [RemoteRiderBikeRow]] = [:],
        remoteTripsByUser: [UUID: [RemoteUserTripRow]] = [:],
        gatesByUser: [UUID: SyncGate] = [:]
    ) {
        self.remoteProfilesByUser = remoteProfilesByUser
        self.remoteBikesByUser = remoteBikesByUser
        self.remoteTripsByUser = remoteTripsByUser
        self.gatesByUser = gatesByUser
    }

    func setGate(_ gate: SyncGate?, for userId: UUID) {
        gatesByUser[userId] = gate
    }

    func fetchTripsHistory(for userId: UUID) -> [Date?] {
        fetchTripsHistoryByUser[userId] ?? []
    }

    func fetchRiderProfile(userId: UUID) async throws -> RemoteRiderProfileRow? {
        if let gate = gatesByUser[userId] {
            try await gate.markEnteredAndWaitForRelease()
        }
        return remoteProfilesByUser[userId]
    }

    func upsertRiderProfile(_ row: RemoteRiderProfileUpsert) async throws -> RemoteRiderProfileRow {
        let saved = RemoteRiderProfileRow(
            userId: row.userId,
            schemaVersion: row.schemaVersion,
            riderName: row.riderName,
            activeTripClientId: row.activeTripClientId,
            activeBikeClientId: row.activeBikeClientId,
            specs: row.specs,
            profile: row.profile,
            clientUpdatedAt: row.clientUpdatedAt,
            updatedAt: "2026-11-27T12:00:00.000Z"
        )
        remoteProfilesByUser[row.userId] = saved
        return saved
    }

    func fetchRiderBikes(userId: UUID, updatedSince: Date?) async throws -> [RemoteRiderBikeRow] {
        remoteBikesByUser[userId] ?? []
    }

    func upsertRiderBikes(_ rows: [RemoteRiderBikeUpsert]) async throws -> [RemoteRiderBikeRow] {
        rows.map { row in
            RemoteRiderBikeRow(
                userId: row.userId,
                clientId: row.clientId,
                schemaVersion: row.schemaVersion,
                name: row.name,
                category: row.category,
                payload: row.payload,
                sortOrder: row.sortOrder,
                clientUpdatedAt: row.clientUpdatedAt,
                updatedAt: "2026-11-27T12:00:00.000Z",
                deletedAt: row.deletedAt
            )
        }
    }

    func fetchUserTrips(userId: UUID, updatedSince: Date?) async throws -> [RemoteUserTripRow] {
        fetchTripsHistoryByUser[userId, default: []].append(updatedSince)
        return remoteTripsByUser[userId] ?? []
    }

    func upsertUserTrips(_ rows: [RemoteUserTripUpsert]) async throws -> [RemoteUserTripRow] {
        rows.map { row in
            RemoteUserTripRow(
                userId: row.userId,
                clientId: row.clientId,
                schemaVersion: row.schemaVersion,
                name: row.name,
                tag: row.tag,
                departureDate: row.departureDate,
                payload: row.payload,
                clientUpdatedAt: row.clientUpdatedAt,
                updatedAt: "2026-11-27T12:00:00.000Z",
                deletedAt: row.deletedAt
            )
        }
    }

    func backfillUserStateToV2() async throws -> BackfillV2Response {
        BackfillV2Response(status: "no_legacy_data", profilesInserted: 0, bikesInserted: 0, tripsInserted: 0, skipped: 0)
    }
}
