import Foundation
import Testing
import CadenceCore
@testable import CadenceServices

@Suite("CadenceStore & SwiftData Persistence")
struct CadenceStoreTests {
    private func makeSampleTrip(id: String = "trip-1", name: String = "Paris-Brest") -> TripProfile {
        TripProfile(
            departureDate: "2026-06-15",
            departureTime: "07:00",
            id: id,
            name: name,
            tag: "Brevet",
            description: "Long gravel route",
            route: RouteParams(
                distanceKm: 600,
                targetSpeedKmH: 24,
                coordinates: [LatLon(lat: 48.8566, lon: 2.3522), LatLon(lat: 48.3904, lon: -4.4861)]
            )
        )
    }

    private func makeSampleBike(id: String = "bike-1", name: String = "Gravel Rig") -> BikeSpec {
        BikeSpec(
            id: id,
            name: name,
            weightKg: 9.8,
            crr: 0.0052,
            cda: 0.36,
            isTubeless: true,
            tireWidthMm: 40,
            bikeCategory: .gravel,
            casingType: .standard,
            isHookless: false
        )
    }

    @Test("CadenceModelContainer supports disk-backed storeURL fallback and reopens persisted data")
    func diskBackedContainerFallbackPersistence() async throws {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("CadenceStoreDiskTest-\(UUID().uuidString)", isDirectory: true)
        let dbURL = tempDir.appendingPathComponent("Cadence.sqlite")
        defer { try? FileManager.default.removeItem(at: tempDir) }

        do {
            let store1 = try CadenceModelContainer.makeStore(inMemory: false, storeURL: dbURL)
            try await store1.upsertTrip(makeSampleTrip(id: "disk-trip", name: "Loire Valley"))
        }

        let store2 = try CadenceModelContainer.makeStore(inMemory: false, storeURL: dbURL)
        let loaded = try await store2.fetchTrip(clientId: "disk-trip")
        #expect(loaded?.name == "Loire Valley")
        #expect(loaded?.route.distanceKm == 600)
    }

    @Test("Trips CRUD, soft-delete tombstones, resurrection, and markSynced")
    func tripLifecycle() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let t1 = Date(timeIntervalSince1970: 1_700_000_000)
        let t2 = Date(timeIntervalSince1970: 1_700_000_100)
        let t3 = Date(timeIntervalSince1970: 1_700_000_200)

        let trip = makeSampleTrip(id: "trip-a", name: "Morvan Loop")
        try await store.upsertTrip(trip, sortOrder: 0, clientUpdatedAt: t1, markNeedsSync: true)

        let active1 = try await store.fetchActiveTrips()
        #expect(active1.count == 1)
        #expect(active1[0].name == "Morvan Loop")

        // Soft delete -> disappears from active, remains in all including deleted
        try await store.softDeleteTrip(clientId: "trip-a", deletedAt: t2, markNeedsSync: true)
        #expect(try await store.fetchActiveTrips().isEmpty)
        #expect(try await store.fetchTrip(clientId: "trip-a") == nil)

        let withTombstones = try await store.fetchAllTripRecordsIncludingDeleted()
        #expect(withTombstones.count == 1)
        #expect(withTombstones[0].deletedAt == t2)
        #expect(withTombstones[0].needsSync == true)

        // Resurrect via upsert
        var updated = trip
        updated.name = "Morvan Revived"
        try await store.upsertTrip(updated, clientUpdatedAt: t3, markNeedsSync: true)
        let active2 = try await store.fetchActiveTrips()
        #expect(active2.count == 1)
        #expect(active2[0].name == "Morvan Revived")

        // Mark synced clears needsSync
        try await store.markTripsSynced(clientIds: ["trip-a"], serverUpdatedAt: t3)
        let syncedRecords = try await store.fetchAllTripRecordsIncludingDeleted()
        #expect(syncedRecords[0].needsSync == false)
        #expect(syncedRecords[0].serverUpdatedAt == t3)
    }

    @Test("Bikes CRUD, sorting, tombstones, and rider profile assembly")
    func bikeAndRiderProfileLifecycle() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)

        // Empty store returns nil for syncable profile, defaults for effective specs
        #expect(try await store.fetchSyncableRiderProfile() == nil)
        let emptyEffective = try await store.fetchEffectiveRiderSpecs()
        #expect(emptyEffective.bikes == RiderBikeSpecs.defaultBikes)

        let b1 = makeSampleBike(id: "b1", name: "Road Rocket")
        let b2 = makeSampleBike(id: "b2", name: "Gravel Tank")
        try await store.upsertBike(b2, sortOrder: 1)
        try await store.upsertBike(b1, sortOrder: 0)

        let bikes = try await store.fetchActiveBikes()
        #expect(bikes.map(\.id) == ["b1", "b2"])

        var specs = RiderBikeSpecs.defaultSpecs
        specs.riderName = "Alice"
        specs.ftpWatts = 265
        specs.activeBikeId = "b2"
        let profileDTO = UserProfileDTO(name: "Alice", heightCm: 170, weightKg: 60, completedAt: "2026-11-27T10:00:00Z")

        try await store.saveRiderProfile(
            specs: specs,
            userProfile: profileDTO,
            activeTripClientId: "trip-99",
            activeBikeClientId: "b2",
            hasCompletedOnboarding: true,
            userId: "user-123"
        )

        let effective = try await store.fetchEffectiveRiderSpecs()
        #expect(effective.riderName == "Alice")
        #expect(effective.ftpWatts == 265)
        #expect(effective.activeBikeId == "b2")
        #expect(effective.bikes.map(\.id) == ["b1", "b2"])

        // Soft-deleting active bike falls back to remaining active bike in effective specs
        try await store.softDeleteBike(clientId: "b2")
        let afterDelete = try await store.fetchEffectiveRiderSpecs()
        #expect(afterDelete.bikes.map(\.id) == ["b1"])
        #expect(afterDelete.activeBikeId == "b1")

        try await store.markRiderProfileSynced(userId: "user-123", serverUpdatedAt: Date(timeIntervalSince1970: 1_700_000_500))
        let syncProfile = try await store.fetchSyncableRiderProfile()
        #expect(syncProfile?.needsSync == false)
        #expect(syncProfile?.hasCompletedOnboarding == true)
    }

    @Test("Corridor, surface, and weather caches enforce TTL, allowExpired, LRU eviction, and offline pins")
    func cachesAndOfflinePins() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let baseDate = Date(timeIntervalSince1970: 1_700_000_000)

        let amenity = StageAmenity(
            id: "w-1",
            category: .water,
            subType: "drinking_water",
            name: "Fontaine",
            lat: 48.8,
            lon: 2.3,
            routeKm: 12.5,
            detourMeters: 30
        )
        try await store.saveCachedCorridorScan(
            cacheKey: "pinned-route",
            stageId: "stage-1",
            distanceKm: 100,
            amenities: [amenity],
            ttlSeconds: 60,
            pinOffline: false,
            now: baseDate
        )
        try await store.saveCachedCorridorScan(
            cacheKey: "ephemeral-route",
            stageId: "stage-2",
            distanceKm: 50,
            amenities: [amenity],
            ttlSeconds: 60,
            pinOffline: false,
            now: baseDate
        )

        // Pin via offline pack
        let surfaceData = OsmSurfaceRouteData(
            routeKey: "osm-surf-pinned",
            ways: [
                OsmWayElement(
                    id: 42,
                    bounds: OsmBounds(minlat: 48.0, minlon: 2.0, maxlat: 48.1, maxlon: 2.1),
                    geometry: [OsmCoordinate(lat: 48.0, lon: 2.0)],
                    tags: OsmWayTags(highway: "track", surface: "gravel", mtbScale: "1", cyclewaySurface: "asphalt")
                )
            ],
            wayCount: 1,
            chunkCount: 1,
            fetchedAt: "2026-11-27T10:00:00Z"
        )
        try await store.saveCachedSurface(surfaceData, ttlSeconds: 60, pinOffline: false, now: baseDate)

        let weekly = WeeklyForecast(
            latitude: 48.8,
            longitude: 2.3,
            fetchedAt: "2026-11-27T10:00:00Z",
            days: [
                DailyForecastDay(
                    date: "2026-11-28",
                    weatherCode: 1,
                    tempMaxC: 16,
                    tempMinC: 8,
                    precipitationSumMm: 0,
                    precipitationProbMax: 10,
                    windSpeedMaxKmH: 15
                )
            ]
        )
        try await store.saveCachedWeather(
            kind: .weekly,
            cacheKey: "48.80:2.30:2026-11-27",
            value: weekly,
            source: "live",
            ttlSeconds: 60,
            pinOffline: false,
            now: baseDate
        )

        // Save pack pinning corridor + surface + weekly weather
        let pack = OfflinePackMeta(
            tripId: "trip-pack-1",
            tripName: "Pinned Expedition",
            savedAt: baseDate,
            distanceKm: 100,
            amenitiesCount: 1,
            hasSurface: true,
            hasWeather: true,
            tilesPrefetched: 12,
            pinnedCacheKeys: ["pinned-route", "osm-surf-pinned", "weekly:48.80:2.30:2026-11-27"]
        )
        try await store.saveOfflinePack(pack)

        // Advance past TTL: ephemeral expires, pinned survives!
        let expiredTime = baseDate.addingTimeInterval(120)
        #expect(try await store.fetchCachedCorridorScan(cacheKey: "ephemeral-route", now: expiredTime, allowExpired: false) == nil)
        #expect(try await store.fetchCachedCorridorScan(cacheKey: "ephemeral-route", now: expiredTime, allowExpired: true)?.count == 1)
        #expect(try await store.fetchCachedCorridorScan(cacheKey: "pinned-route", now: expiredTime, allowExpired: false)?.count == 1)

        let fetchedSurface = try await store.fetchCachedSurface(routeKey: "osm-surf-pinned", now: expiredTime, allowExpired: false)
        #expect(fetchedSurface == surfaceData)

        let fetchedWeekly = try await store.fetchCachedWeather(
            kind: .weekly,
            cacheKey: "48.80:2.30:2026-11-27",
            as: WeeklyForecast.self,
            now: expiredTime,
            allowExpired: false
        )
        #expect(fetchedWeekly == weekly)

        // Trigger LRU eviction on corridor scans (> 50 unpinned) -> pinned survives, oldest unpinned evicted
        for idx in 0..<55 {
            try await store.saveCachedCorridorScan(
                cacheKey: "lru-\(idx)",
                stageId: "s-\(idx)",
                distanceKm: 20,
                amenities: [],
                ttlSeconds: 3600,
                pinOffline: false,
                now: baseDate.addingTimeInterval(Double(idx + 1))
            )
        }
        #expect(try await store.fetchCachedCorridorScan(cacheKey: "lru-0", now: baseDate.addingTimeInterval(100)) == nil)
        #expect(try await store.fetchCachedCorridorScan(cacheKey: "pinned-route", now: expiredTime) != nil)

        // Delete pack -> unpins keys, so now expired pinned entries respect TTL
        try await store.deleteOfflinePack(tripId: "trip-pack-1")
        #expect(try await store.fetchOfflinePack(tripId: "trip-pack-1") == nil)
        #expect(try await store.fetchCachedCorridorScan(cacheKey: "pinned-route", now: expiredTime, allowExpired: false) == nil)
    }

    @Test("Sector/hourly weather round-trip, surface/weekly LRU eviction, and shared pack key unpinning")
    func weatherSectorHourlyAndSharedPackPins() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let baseDate = Date(timeIntervalSince1970: 1_700_000_000)

        // 1. Sector weather (RouteWeatherAnalysis) + hourly weather round-trip
        let sector = RouteSectorForecast(
            index: 0, startKm: 0, endKm: 50, distanceKm: 50,
            lat: 48.8, lon: 2.3, bearingDeg: 90, etaHHMM: "09:00",
            temperatureC: 14, windChillC: 12, windSpeedKmH: 18, windDirectionDegrees: 270,
            windCardinal: "W", effectiveHeadwindKmH: -10, precipitationRiskPercent: 5,
            visibilityKm: 20, airDensityRho: 1.225, legWatts: 180, aeroPenaltyWatts: -15,
            effectiveSpeedKmH: 26, durationMin: 115, carbsG: 115
        )
        let analysis = RouteWeatherAnalysis(
            sectors: [sector],
            loopComparison: LoopDirectionComparison(
                isLoop: true, forwardOrientation: .clockwise, recommendedDirection: .forward,
                forwardTotalMin: 115, reverseTotalMin: 130, forwardAvgWatts: 180, reverseAvgWatts: 195,
                minutesSaved: 15, wattsSaved: 15
            ),
            coldestSector: sector,
            wettestSector: sector,
            worstCaseWeather: WeatherCondition(temperatureC: 14),
            coldestSectorLabel: "KM 0-50",
            source: .live
        )
        try await store.saveCachedWeather(
            kind: .sector,
            cacheKey: "sector-key-1",
            value: analysis,
            source: "live",
            ttlSeconds: 21_600,
            pinOffline: false,
            now: baseDate
        )
        let decodedSector = try await store.fetchCachedWeather(
            kind: .sector,
            cacheKey: "sector-key-1",
            as: RouteWeatherAnalysis.self,
            now: baseDate
        )
        #expect(decodedSector == analysis)

        try await store.saveCachedWeather(
            kind: .hourly,
            cacheKey: "48.800:2.300",
            value: ["tempC": 15.5],
            source: "live",
            ttlSeconds: 600,
            now: baseDate
        )
        let decodedHourly = try await store.fetchCachedWeather(
            kind: .hourly,
            cacheKey: "48.800:2.300",
            as: [String: Double].self,
            now: baseDate
        )
        #expect(decodedHourly == ["tempC": 15.5])

        // 2. Shared offline pack key stays pinned when first pack is deleted
        try await store.saveCachedCorridorScan(
            cacheKey: "shared-corridor",
            stageId: "st-shared",
            distanceKm: 40,
            amenities: [],
            ttlSeconds: 30,
            now: baseDate
        )
        try await store.saveOfflinePack(
            OfflinePackMeta(tripId: "p1", tripName: "Pack 1", savedAt: baseDate, distanceKm: 40, amenitiesCount: 0, hasSurface: false, hasWeather: false, pinnedCacheKeys: ["shared-corridor"])
        )
        try await store.saveOfflinePack(
            OfflinePackMeta(tripId: "p2", tripName: "Pack 2", savedAt: baseDate, distanceKm: 40, amenitiesCount: 0, hasSurface: false, hasWeather: false, pinnedCacheKeys: ["shared-corridor"])
        )
        let afterExpiry = baseDate.addingTimeInterval(60)
        try await store.deleteOfflinePack(tripId: "p1")
        #expect(try await store.fetchCachedCorridorScan(cacheKey: "shared-corridor", now: afterExpiry, allowExpired: false) != nil)
        try await store.deleteOfflinePack(tripId: "p2")
        #expect(try await store.fetchCachedCorridorScan(cacheKey: "shared-corridor", now: afterExpiry, allowExpired: false) == nil)

        // 3. Surface LRU eviction (> 40 unpinned)
        for i in 0..<45 {
            let s = OsmSurfaceRouteData(routeKey: "surf-\(i)", ways: [], wayCount: 0, chunkCount: 1, fetchedAt: "2026-11-27T10:00:00Z")
            try await store.saveCachedSurface(s, ttlSeconds: 604_800, now: baseDate.addingTimeInterval(Double(i)))
        }
        #expect(try await store.fetchCachedSurface(routeKey: "surf-0", now: baseDate.addingTimeInterval(100)) == nil)
        #expect(try await store.fetchCachedSurface(routeKey: "surf-44", now: baseDate.addingTimeInterval(100)) != nil)
    }

    @Test("Pending share imports CRUD and pruning")
    func pendingShareImportsLifecycle() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let oldDate = Date(timeIntervalSince1970: 1_700_000_000)
        let recentDate = Date(timeIntervalSince1970: 1_700_500_000)

        let fileItem = PendingShareImportDTO(
            id: "imp-1",
            kind: .file,
            status: .pending,
            fileName: "route.gpx",
            utTypeIdentifier: "com.topografix.gpx",
            fileData: Data("<gpx/>".utf8),
            createdAt: oldDate
        )
        let urlItem = PendingShareImportDTO(
            id: "imp-2",
            kind: .planCode,
            status: .pending,
            sourceUrl: "https://ridecadence.cc/p/ABC123",
            createdAt: recentDate
        )

        try await store.enqueuePendingShareImport(fileItem)
        try await store.enqueuePendingShareImport(urlItem)

        let pending = try await store.fetchPendingShareImports(status: .pending)
        #expect(pending.map(\.id) == ["imp-1", "imp-2"])

        try await store.updatePendingShareImportStatus(id: "imp-1", status: .completed, processedAt: oldDate.addingTimeInterval(10))
        let loaded = try await store.fetchPendingShareImport(id: "imp-1")
        #expect(loaded?.status == .completed)
        #expect(loaded?.fileData == Data("<gpx/>".utf8))

        let pruned = try await store.prunePendingShareImports(olderThan: oldDate.addingTimeInterval(1000))
        #expect(pruned == 1)
        #expect(try await store.fetchPendingShareImport(id: "imp-1") == nil)
        #expect(try await store.fetchPendingShareImport(id: "imp-2") != nil)

        try await store.deletePendingShareImport(id: "imp-2")
        #expect(try await store.fetchPendingShareImports(status: nil).isEmpty)
    }

    @Test("Concurrent actor access on CadenceStore completes safely")
    func concurrentAccess() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        try await withThrowingTaskGroup(of: Void.self) { group in
            for i in 0..<20 {
                group.addTask {
                    let trip = self.makeSampleTrip(id: "concurrent-\(i)", name: "Trip \(i)")
                    try await store.upsertTrip(trip, sortOrder: i)
                    _ = try await store.fetchActiveTrips()
                }
            }
            try await group.waitForAll()
        }
        let all = try await store.fetchActiveTrips()
        #expect(all.count == 20)
    }

    @Test("Updating an existing offline pack unpins dropped cache keys unless still pinned by another pack")
    func saveOfflinePackUnpinsDroppedKeys() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let baseDate = Date(timeIntervalSince1970: 1_700_000_000)
        let afterExpiry = baseDate.addingTimeInterval(120)

        let surfOnly = OsmSurfaceRouteData(
            routeKey: "surf-only",
            ways: [],
            wayCount: 0,
            chunkCount: 1,
            fetchedAt: "2026-11-27T10:00:00Z"
        )
        let surfShared = OsmSurfaceRouteData(
            routeKey: "surf-shared",
            ways: [],
            wayCount: 0,
            chunkCount: 1,
            fetchedAt: "2026-11-27T10:00:00Z"
        )
        try await store.saveCachedSurface(surfOnly, ttlSeconds: 30, pinOffline: false, now: baseDate)
        try await store.saveCachedSurface(surfShared, ttlSeconds: 30, pinOffline: false, now: baseDate)
        try await store.saveCachedCorridorScan(
            cacheKey: "corr-new",
            stageId: "st-new",
            distanceKm: 40,
            amenities: [],
            ttlSeconds: 30,
            pinOffline: false,
            now: baseDate
        )

        try await store.saveOfflinePack(
            OfflinePackMeta(
                tripId: "pack-A",
                tripName: "Pack A",
                savedAt: baseDate,
                distanceKm: 50,
                amenitiesCount: 0,
                hasSurface: true,
                hasWeather: false,
                pinnedCacheKeys: ["surf-only", "surf-shared"]
            )
        )
        try await store.saveOfflinePack(
            OfflinePackMeta(
                tripId: "pack-B",
                tripName: "Pack B",
                savedAt: baseDate,
                distanceKm: 50,
                amenitiesCount: 0,
                hasSurface: true,
                hasWeather: false,
                pinnedCacheKeys: ["surf-shared"]
            )
        )

        // Update pack-A to drop both surf-only and surf-shared, pinning corr-new instead
        try await store.saveOfflinePack(
            OfflinePackMeta(
                tripId: "pack-A",
                tripName: "Pack A Updated",
                savedAt: baseDate.addingTimeInterval(10),
                distanceKm: 50,
                amenitiesCount: 0,
                hasSurface: true,
                hasWeather: false,
                pinnedCacheKeys: ["corr-new"]
            )
        )

        // surf-only is unpinned -> expired for allowExpired: false, still present with allowExpired: true
        #expect(try await store.fetchCachedSurface(routeKey: "surf-only", now: afterExpiry, allowExpired: false) == nil)
        #expect(try await store.fetchCachedSurface(routeKey: "surf-only", now: afterExpiry, allowExpired: true) != nil)

        // surf-shared remains pinned via pack-B
        #expect(try await store.fetchCachedSurface(routeKey: "surf-shared", now: afterExpiry, allowExpired: false) != nil)

        // corr-new is newly pinned via pack-A
        #expect(try await store.fetchCachedCorridorScan(cacheKey: "corr-new", now: afterExpiry, allowExpired: false) != nil)

        // Updating pack-A with empty pinnedCacheKeys unpins corr-new as well
        try await store.saveOfflinePack(
            OfflinePackMeta(
                tripId: "pack-A",
                tripName: "Pack A Empty Pins",
                savedAt: baseDate.addingTimeInterval(20),
                distanceKm: 50,
                amenitiesCount: 0,
                hasSurface: false,
                hasWeather: false,
                pinnedCacheKeys: []
            )
        )
        #expect(try await store.fetchCachedCorridorScan(cacheKey: "corr-new", now: afterExpiry, allowExpired: false) == nil)
    }

    @Test("CadenceModelContainer storeURL == nil unentitled fallback creates store without App Group lookup")
    func unentitledStoreURLNilFallback() throws {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        let cadenceDir = appSupport.appendingPathComponent("Cadence", isDirectory: true)
        let dbFile = cadenceDir.appendingPathComponent(CadenceModelContainer.storeFileName)
        let existedBefore = FileManager.default.fileExists(atPath: dbFile.path)
        defer {
            if !existedBefore {
                try? FileManager.default.removeItem(at: cadenceDir)
            }
        }

        let container = try CadenceModelContainer.makeContainer(
            inMemory: false,
            storeURL: nil,
            appGroupIdentifier: "group.invalid.test.\(UUID().uuidString)",
            allowUnentitledFallback: true
        )
        let config = try #require(container.configurations.first)
        #expect(config.groupAppContainerIdentifier == nil)
        #expect(config.url.lastPathComponent == CadenceModelContainer.storeFileName)
    }
}
