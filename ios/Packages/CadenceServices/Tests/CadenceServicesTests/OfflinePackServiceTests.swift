import Foundation
import Testing
import CadenceCore
@testable import CadenceServices

@Suite("OfflinePackService")
struct OfflinePackServiceTests {
    @Test("Pure helpers: stage clamping, 450/250 key aliases, rollout time with chips buffer, and tile URL round-robin")
    func pureHelpersParity() {
        var trip = M4CTestSupport.makeSampleTrip(
            id: "pack-trip-1",
            coordinateCount: 20,
            distanceKm: 92.4,
            departureDate: "2026-06-15",
            departureTime: "08:00",
            arriveAtMode: true
        )
        trip.route.coordinates = M4CTestSupport.makeWavyCoordinates(count: 600)
        trip.customChips = ["coffee-stop", "hill-climb"]
        trip.ruleSettings = LogisticsSettings(
            coffeeDurationMin: 20,
            plannedLongStopMin: 10
        )

        // Stage clamping
        #expect(OfflinePackService.resolveActiveStageIndexForPack(trip) == -1)
        let stage1 = TripStage(
            id: "s1",
            dayNumber: 1,
            departureDate: "2026-06-15",
            departureTime: "08:00",
            route: trip.route,
            office: trip.office,
            weather: trip.weather
        )
        let stage2 = TripStage(
            id: "s2",
            dayNumber: 2,
            departureDate: "2026-06-16",
            departureTime: "08:30",
            route: trip.route,
            office: trip.office,
            weather: trip.weather
        )
        trip.stages = [stage1, stage2]
        trip.activeStageIndex = 99
        #expect(OfflinePackService.resolveActiveStageIndexForPack(trip) == 1)
        trip.activeStageIndex = -4
        #expect(OfflinePackService.resolveActiveStageIndexForPack(trip) == 0)

        // 450 & 250 downsampled aliases matching StageManagerEngine.downsampleCoordinates
        let smallCoords = M4CTestSupport.makeWavyCoordinates(count: 100)
        let smallAliases = OfflinePackService.buildStageOfflineKeyAliases(
            coordinates: smallCoords,
            stageId: "s1",
            distanceKm: 92.4
        )
        #expect(smallAliases.aliasAmenityKeys.isEmpty)
        #expect(smallAliases.aliasSurfaceKeys.isEmpty)

        let mediumCoords = M4CTestSupport.makeWavyCoordinates(count: 300)
        let mediumAliases = OfflinePackService.buildStageOfflineKeyAliases(
            coordinates: mediumCoords,
            stageId: "s1",
            distanceKm: 92.4
        )
        let mediumDs250 = StageManagerEngine.downsampleCoordinates(mediumCoords, maxPoints: 250)!
        let mediumAllAmenity = [mediumAliases.rawAmenityKey] + mediumAliases.aliasAmenityKeys
        let mediumAllSurface = [mediumAliases.rawSurfaceKey] + mediumAliases.aliasSurfaceKeys
        #expect(mediumAllAmenity.contains(RouteCacheKey.routeHashKey(coordinates: mediumDs250, stageId: "s1", totalDistanceKm: 92.4)))
        #expect(mediumAllSurface.contains(RouteCacheKey.osmSurfaceRouteKey(coordinates: mediumDs250, distanceKm: 92.4)))

        let largeCoords = trip.route.coordinates ?? []
        let largeAliases = OfflinePackService.buildStageOfflineKeyAliases(
            coordinates: largeCoords,
            stageId: "s1",
            distanceKm: 92.4
        )
        let largeDs450 = StageManagerEngine.downsampleCoordinates(largeCoords, maxPoints: 450)!
        let largeDs250 = StageManagerEngine.downsampleCoordinates(largeCoords, maxPoints: 250)!
        let largeAllAmenity = [largeAliases.rawAmenityKey] + largeAliases.aliasAmenityKeys
        let largeAllSurface = [largeAliases.rawSurfaceKey] + largeAliases.aliasSurfaceKeys
        #expect(largeAllAmenity.contains(RouteCacheKey.routeHashKey(coordinates: largeDs450, stageId: "s1", totalDistanceKm: 92.4)))
        #expect(largeAllAmenity.contains(RouteCacheKey.routeHashKey(coordinates: largeDs250, stageId: "s1", totalDistanceKm: 92.4)))
        #expect(largeAllSurface.contains(RouteCacheKey.osmSurfaceRouteKey(coordinates: largeDs450, distanceKm: 92.4)))
        #expect(largeAllSurface.contains(RouteCacheKey.osmSurfaceRouteKey(coordinates: largeDs250, distanceKm: 92.4)))

        // Rollout time incorporates chips extra buffer (plannedLongStop 10 + coffee 20 + hill-climb 8 = 38 min)
        #expect(OfflinePackService.chipsExtraBufferMinutes(trip) == 38)
        let rolloutArriveMode = OfflinePackService.resolveStageWeatherRolloutTime(
            tripForWeather: trip,
            lang: .en,
            ftpWatts: 250
        )
        #expect(rolloutArriveMode != "08:00")
        #expect(rolloutArriveMode.contains(":"))

        // Tile URL builder: [11, 12, 13] round-robin, centerline before halo, maxTiles cap
        #expect(OfflinePackService.buildRouteTileUrls(coordinates: [LatLon(lat: 47.2, lon: -1.5)]).isEmpty)
        let tileURLs = OfflinePackService.buildRouteTileUrls(
            coordinates: trip.route.coordinates ?? [],
            maxTiles: 18
        )
        #expect(tileURLs.count == 18)
        #expect(tileURLs[0].absoluteString.contains("/tile/11/"))
        #expect(tileURLs[1].absoluteString.contains("/tile/12/"))
        #expect(tileURLs[2].absoluteString.contains("/tile/13/"))
        #expect(tileURLs.contains(where: { $0.absoluteString.contains("World_Light_Gray_Base") }))
        #expect(tileURLs.contains(where: { $0.absoluteString.contains("World_Dark_Gray_Base") }))
    }

    @Test("saveExpeditionPack warms 2 stages, aliases 450/250 & rawTargetTime, pins across TTL expiry, and unpins on delete")
    func multiStageWarmingPinningAndDeleteUnpin() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let fixedNow = BoxedValue(ISO8601DateFormatter().date(from: "2026-11-28T07:00:00Z")!)

        let (mockID, session) = MockURLProtocol.registerSession { request, bodyData in
            let url = try #require(request.url)
            let host = url.host ?? ""

            if host.contains("open-meteo.com") {
                let comps = URLComponents(url: url, resolvingAgainstBaseURL: false)
                let latParam = comps?.queryItems?.first(where: { $0.name == "latitude" })?.value ?? ""
                let sectorCount = max(1, latParam.split(separator: ",").count)
                let times = [
                    "2026-11-29T06:00", "2026-11-29T07:00", "2026-11-29T08:00",
                    "2026-11-29T09:00", "2026-11-29T10:00", "2026-11-29T11:00",
                    "2026-11-30T06:00", "2026-11-30T07:00", "2026-11-30T08:00",
                    "2026-11-30T09:00", "2026-11-30T10:00", "2026-11-30T11:00",
                ]
                let item: [String: Any] = [
                    "hourly": [
                        "time": times,
                        "temperature_2m": Array(repeating: 13.5, count: times.count),
                        "relative_humidity_2m": Array(repeating: 72.0, count: times.count),
                        "surface_pressure": Array(repeating: 1015.0, count: times.count),
                        "wind_speed_10m": Array(repeating: 14.0, count: times.count),
                        "wind_direction_10m": Array(repeating: 245.0, count: times.count),
                        "wind_gusts_10m": Array(repeating: 22.0, count: times.count),
                        "precipitation_probability": Array(repeating: 15.0, count: times.count),
                        "visibility": Array(repeating: 18000.0, count: times.count),
                        "is_day": Array(repeating: 1, count: times.count),
                        "weather_code": Array(repeating: 2, count: times.count),
                    ],
                ]
                let batch = Array(repeating: item, count: sectorCount)
                return try M4CTestSupport.makeJSONResponse(url: url, object: batch)
            }

            if host.contains("arcgisonline.com") {
                return (M4CTestSupport.makeHTTPResponse(url: url, statusCode: 200), Data([0x89, 0x50, 0x4E, 0x47]))
            }

            // Overpass query: distinguish surface query ("way["highway"]") vs corridor amenity query
            let queryText = OverpassTestSupport.decodeFormDataQuery(from: bodyData) ?? ""
            if queryText.contains("\"highway\"") {
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "elements": [[
                        "type": "way",
                        "id": 9001,
                        "bounds": ["minlat": 47.2, "minlon": -1.6, "maxlat": 47.3, "maxlon": -1.4],
                        "geometry": [
                            ["lat": 47.2184, "lon": -1.5536],
                            ["lat": 47.2204, "lon": -1.5506],
                        ],
                        "tags": ["highway": "secondary", "surface": "asphalt"],
                    ]],
                ])
            }

            return try M4CTestSupport.makeJSONResponse(url: url, object: [
                "elements": [[
                    "type": "node",
                    "id": 5001,
                    "lat": 47.2,
                    "lon": -1.48,
                    "tags": ["amenity": "drinking_water", "name": "Fontaine Loire"],
                ]],
            ])
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let nowClosure: @Sendable () -> Date = { fixedNow.get() }
        let utcTZ = TimeZone(secondsFromGMT: 0)!
        let overpass = OverpassCorridorService(
            urlSession: session,
            endpoints: [URL(string: "https://overpass-api.de/api/interpreter")!],
            store: store,
            nowProvider: nowClosure
        )
        let surface = OsmSurfaceService(
            urlSession: session,
            store: store,
            endpoints: [URL(string: "https://overpass-api.de/api/interpreter")!],
            nowProvider: nowClosure
        )
        let routeWeather = RouteWeatherService(
            urlSession: session,
            store: store,
            nowProvider: nowClosure,
            timeZone: utcTZ
        )
        let tilePrefetcher = URLSessionOfflineTilePrefetcher(urlSession: session)

        let packService = OfflinePackService(
            store: store,
            overpassService: overpass,
            surfaceService: surface,
            routeWeatherService: routeWeather,
            tilePrefetcher: tilePrefetcher,
            nowProvider: nowClosure,
            timeZone: utcTZ
        )

        let coordsStage1 = M4CTestSupport.makeWavyCoordinates(count: 600)
        let coordsStage2 = M4CTestSupport.makeWavyCoordinates(count: 300, latStart: 47.4000, lonStart: -0.9000)

        var trip = M4CTestSupport.makeSampleTrip(
            id: "tour-loire-2d",
            name: "Loire 2-Day",
            coordinateCount: 600,
            distanceKm: 52.0,
            departureDate: "2026-11-29",
            departureTime: "10:30",
            arriveAtMode: true
        )
        trip.route.coordinates = coordsStage1

        let stage1 = TripStage(
            id: "stage-day-1",
            dayNumber: 1,
            departureDate: "2026-11-29",
            departureTime: "10:30",
            targetMode: "arrive",
            route: trip.route,
            office: trip.office,
            weather: trip.weather
        )
        var route2 = trip.route
        route2.coordinates = coordsStage2
        route2.distanceKm = 38.0
        let stage2 = TripStage(
            id: "stage-day-2",
            dayNumber: 2,
            departureDate: "2026-11-30",
            departureTime: "11:00",
            targetMode: "arrive",
            route: route2,
            office: trip.office,
            weather: trip.weather
        )
        trip.stages = [stage1, stage2]
        trip.activeStageIndex = 0

        let progressEvents = BoxedList<OfflinePackStageProgress.Phase>()
        let meta = try await packService.saveExpeditionPack(
            trip: trip,
            lang: .en,
            ftpWattsOverride: 240,
            onProgress: { progressEvents.append($0.phase) }
        )

        #expect(meta.tripId == "tour-loire-2d")
        #expect(meta.amenitiesCount == 1)
        #expect(meta.hasSurface == true)
        #expect(meta.hasWeather == true)
        #expect(meta.tilesPrefetched > 0)
        #expect(progressEvents.snapshot().contains(.started))
        #expect(progressEvents.snapshot().contains(.saved))

        // Verify raw + 450 + 250 aliases survive past TTL expiry because they are pinned!
        let stage1Aliases = OfflinePackService.buildStageOfflineKeyAliases(
            coordinates: coordsStage1,
            stageId: "stage-day-1",
            distanceKm: 52.0
        )
        let ds450Coords = try #require(StageManagerEngine.downsampleCoordinates(coordsStage1, maxPoints: 450))
        let ds250Coords = try #require(StageManagerEngine.downsampleCoordinates(coordsStage1, maxPoints: 250))
        let ds450AmenityKey = RouteCacheKey.routeHashKey(coordinates: ds450Coords, stageId: "stage-day-1", totalDistanceKm: 52.0)
        let ds250AmenityKey = RouteCacheKey.routeHashKey(coordinates: ds250Coords, stageId: "stage-day-1", totalDistanceKm: 52.0)
        let ds450SurfaceKey = RouteCacheKey.osmSurfaceRouteKey(coordinates: ds450Coords, distanceKm: 52.0)
        let ds250SurfaceKey = RouteCacheKey.osmSurfaceRouteKey(coordinates: ds250Coords, distanceKm: 52.0)

        #expect(([stage1Aliases.rawAmenityKey] + stage1Aliases.aliasAmenityKeys).contains(ds450AmenityKey))
        #expect(([stage1Aliases.rawAmenityKey] + stage1Aliases.aliasAmenityKeys).contains(ds250AmenityKey))
        #expect(([stage1Aliases.rawSurfaceKey] + stage1Aliases.aliasSurfaceKeys).contains(ds450SurfaceKey))
        #expect(([stage1Aliases.rawSurfaceKey] + stage1Aliases.aliasSurfaceKeys).contains(ds250SurfaceKey))

        // Advance clock by 8 days (+700_000s, past 6h corridor/weather TTL and 7d surface TTL)
        fixedNow.set(fixedNow.get().addingTimeInterval(700_000))
        await overpass.clearCachedScan()
        await surface.clearMemoryCache()

        // Raw & downsampled aliases MUST still hydrate from CadenceStore!
        let ds450Amenity = await overpass.getCachedScan(key: ds450AmenityKey)
        let ds250Amenity = await overpass.getCachedScan(key: ds250AmenityKey)
        #expect(ds450Amenity?.count == 1)
        #expect(ds250Amenity?.count == 1)

        let ds450Surface = await surface.getCachedOsmSurface(routeKey: ds450SurfaceKey)
        let ds250Surface = await surface.getCachedOsmSurface(routeKey: ds250SurfaceKey)
        #expect(ds450Surface?.ways.count == 1)
        #expect(ds250Surface?.ways.count == 1)

        // Raw departureTime ("10:30") sector weather alias MUST also survive TTL expiry
        let rawWeatherKey = try #require(RouteWeatherService.buildSectorCacheKey(
            trip: trip,
            targetDate: "2026-11-29",
            departureTime: "10:30",
            lang: .en,
            ftpWatts: 240
        ))
        let persistedRawWeather = try await store.fetchCachedWeather(
            kind: .sector,
            cacheKey: rawWeatherKey,
            as: RouteWeatherAnalysis.self,
            now: fixedNow.get(),
            allowExpired: false
        )
        #expect(persistedRawWeather != nil)
        #expect(persistedRawWeather?.source != .simulated)

        // Save a second pack sharing stage-day-1 raw amenity key, then delete first pack -> shared key stays pinned, unshared keys unpin!
        let sharedMeta = OfflinePackMeta(
            tripId: "other-pack",
            tripName: "Other",
            savedAt: fixedNow.get(),
            distanceKm: 52.0,
            amenitiesCount: 1,
            hasSurface: false,
            hasWeather: false,
            pinnedCacheKeys: [stage1Aliases.rawAmenityKey]
        )
        try await store.saveOfflinePack(sharedMeta, pinnedCacheKeys: [stage1Aliases.rawAmenityKey])

        try await packService.deleteExpeditionPack(tripId: "tour-loire-2d")
        #expect(try await packService.getExpeditionPackStatus(tripId: "tour-loire-2d") == nil)

        // Unshared alias key is now unpinned & expired -> returns nil
        let expiredUnshared = try await store.fetchCachedCorridorScan(
            cacheKey: stage1Aliases.aliasAmenityKeys[0],
            now: fixedNow.get(),
            allowExpired: false
        )
        #expect(expiredUnshared == nil)

        // Shared key pinned by "other-pack" survives expiry!
        let stillPinnedShared = try await store.fetchCachedCorridorScan(
            cacheKey: stage1Aliases.rawAmenityKey,
            now: fixedNow.get(),
            allowExpired: false
        )
        #expect(stillPinnedShared?.count == 1)
    }

    @Test("Simulated weather (>14d out) sets hasWeather = true without persisting rawTargetTime alias, and surface 503 is soft-failed")
    func simulatedGuardAndSoftFailureResilience() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let fixedNow = ISO8601DateFormatter().date(from: "2026-11-28T07:00:00Z")!

        let (mockID, session) = MockURLProtocol.registerSession { request, bodyData in
            let url = try #require(request.url)
            let queryText = OverpassTestSupport.decodeFormDataQuery(from: bodyData) ?? ""
            if queryText.contains("\"highway\"") {
                return (M4CTestSupport.makeHTTPResponse(url: url, statusCode: 503), Data("Service Unavailable".utf8))
            }
            return try M4CTestSupport.makeJSONResponse(url: url, object: [
                "elements": [[
                    "type": "node",
                    "id": 77,
                    "lat": 47.2184,
                    "lon": -1.5536,
                    "tags": ["amenity": "cafe", "name": "Café Cyclo"],
                ]],
            ])
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let utcTZ = TimeZone(secondsFromGMT: 0)!
        let overpass = OverpassCorridorService(
            urlSession: session,
            endpoints: [URL(string: "https://overpass-api.de/api/interpreter")!],
            store: store,
            nowProvider: { fixedNow }
        )
        let surface = OsmSurfaceService(
            urlSession: session,
            store: store,
            endpoints: [URL(string: "https://overpass-api.de/api/interpreter")!],
            nowProvider: { fixedNow }
        )
        let routeWeather = RouteWeatherService(
            urlSession: session,
            store: store,
            nowProvider: { fixedNow },
            timeZone: utcTZ
        )
        let packService = OfflinePackService(
            store: store,
            overpassService: overpass,
            surfaceService: surface,
            routeWeatherService: routeWeather,
            nowProvider: { fixedNow },
            timeZone: utcTZ
        )

        // > 14 days out triggers .simulated weather
        let trip = M4CTestSupport.makeSampleTrip(
            id: "sim-trip",
            coordinateCount: 15,
            distanceKm: 30.0,
            departureDate: "2027-03-15",
            departureTime: "10:00",
            arriveAtMode: true
        )

        let meta = try await packService.saveExpeditionPack(trip: trip, lang: .en, ftpWattsOverride: 220)
        #expect(meta.amenitiesCount == 1)
        #expect(meta.hasSurface == false) // soft failure from HTTP 503 did not fail pack
        #expect(meta.hasWeather == true)

        let rawKey = try #require(RouteWeatherService.buildSectorCacheKey(
            trip: trip,
            targetDate: "2027-03-15",
            departureTime: "10:00",
            lang: .en,
            ftpWatts: 220
        ))
        let simCached = try await store.fetchCachedWeather(
            kind: .sector,
            cacheKey: rawKey,
            as: RouteWeatherAnalysis.self,
            now: fixedNow,
            allowExpired: true
        )
        #expect(simCached == nil)
    }

    @Test("Outer Task cancellation aborts saveExpeditionPack promptly without waiting on slow network")
    func outerCancellationAbortsPromptly() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let (mockID, session) = M4CAsyncDelayURLProtocol.registerSession { request, _ in
            let url = try #require(request.url)
            return (0.9, M4CTestSupport.makeHTTPResponse(url: url, statusCode: 200), Data("{\"elements\":[]}".utf8))
        }
        defer { M4CAsyncDelayURLProtocol.unregister(id: mockID) }

        let overpass = OverpassCorridorService(
            urlSession: session,
            endpoints: [URL(string: "https://overpass-api.de/api/interpreter")!],
            store: store
        )
        let surface = OsmSurfaceService(
            urlSession: session,
            store: store,
            endpoints: [URL(string: "https://overpass-api.de/api/interpreter")!]
        )
        let routeWeather = RouteWeatherService(urlSession: session, store: store)
        let packService = OfflinePackService(
            store: store,
            overpassService: overpass,
            surfaceService: surface,
            routeWeatherService: routeWeather
        )

        let trip = M4CTestSupport.makeSampleTrip(id: "cancel-pack", coordinateCount: 12)
        let start = ContinuousClock.now
        let task = Task {
            try await packService.saveExpeditionPack(trip: trip)
        }
        try await Task.sleep(for: .milliseconds(50))
        task.cancel()

        await #expect(throws: CancellationError.self) {
            _ = try await task.value
        }
        let elapsed = start.duration(to: .now)
        #expect(elapsed < .milliseconds(450))
    }

    @Test("Cancelling saveExpeditionPack mid-warming after Stage 1 leaves zero orphaned pinned cache rows past TTL")
    func cancellationMidWarmingLeavesZeroOrphanedPinnedRows() async throws {
        struct SuspendingTilePrefetcher: OfflineTilePrefetching {
            let onEnter: @Sendable () -> Void

            func prefetchTiles(urls: [URL]) async -> Int {
                onEnter()
                try? await Task.sleep(for: .seconds(5))
                return 0
            }
        }

        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let fixedNow = BoxedValue(ISO8601DateFormatter().date(from: "2026-11-28T07:00:00Z")!)

        let (mockID, session) = MockURLProtocol.registerSession { request, bodyData in
            let url = try #require(request.url)
            let host = url.host ?? ""

            if host.contains("open-meteo.com") {
                let comps = URLComponents(url: url, resolvingAgainstBaseURL: false)
                let latParam = comps?.queryItems?.first(where: { $0.name == "latitude" })?.value ?? ""
                let sectorCount = max(1, latParam.split(separator: ",").count)
                let times = [
                    "2026-11-29T06:00", "2026-11-29T07:00", "2026-11-29T08:00",
                    "2026-11-29T09:00", "2026-11-29T10:00", "2026-11-29T11:00",
                ]
                let item: [String: Any] = [
                    "hourly": [
                        "time": times,
                        "temperature_2m": Array(repeating: 14.0, count: times.count),
                        "relative_humidity_2m": Array(repeating: 70.0, count: times.count),
                        "surface_pressure": Array(repeating: 1016.0, count: times.count),
                        "wind_speed_10m": Array(repeating: 12.0, count: times.count),
                        "wind_direction_10m": Array(repeating: 220.0, count: times.count),
                        "wind_gusts_10m": Array(repeating: 18.0, count: times.count),
                        "precipitation_probability": Array(repeating: 10.0, count: times.count),
                        "visibility": Array(repeating: 20000.0, count: times.count),
                        "is_day": Array(repeating: 1, count: times.count),
                        "weather_code": Array(repeating: 1, count: times.count),
                    ],
                ]
                return try M4CTestSupport.makeJSONResponse(url: url, object: Array(repeating: item, count: sectorCount))
            }

            let queryText = OverpassTestSupport.decodeFormDataQuery(from: bodyData) ?? ""
            if queryText.contains("\"highway\"") {
                return try M4CTestSupport.makeJSONResponse(url: url, object: [
                    "elements": [[
                        "type": "way",
                        "id": 9101,
                        "bounds": ["minlat": 47.2, "minlon": -1.6, "maxlat": 47.3, "maxlon": -1.4],
                        "geometry": [
                            ["lat": 47.2184, "lon": -1.5536],
                            ["lat": 47.2204, "lon": -1.5506],
                        ],
                        "tags": ["highway": "secondary", "surface": "asphalt"],
                    ]],
                ])
            }

            return try M4CTestSupport.makeJSONResponse(url: url, object: [
                "elements": [[
                    "type": "node",
                    "id": 5101,
                    "lat": 47.2,
                    "lon": -1.48,
                    "tags": ["amenity": "drinking_water", "name": "Fontaine Test"],
                ]],
            ])
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let nowClosure: @Sendable () -> Date = { fixedNow.get() }
        let utcTZ = TimeZone(secondsFromGMT: 0)!
        let overpass = OverpassCorridorService(
            urlSession: session,
            endpoints: [URL(string: "https://overpass-api.de/api/interpreter")!],
            store: store,
            nowProvider: nowClosure
        )
        let surface = OsmSurfaceService(
            urlSession: session,
            store: store,
            endpoints: [URL(string: "https://overpass-api.de/api/interpreter")!],
            nowProvider: nowClosure
        )
        let routeWeather = RouteWeatherService(
            urlSession: session,
            store: store,
            nowProvider: nowClosure,
            timeZone: utcTZ
        )

        let prefetchEntered = AsyncSignal()
        let tilePrefetcher = SuspendingTilePrefetcher {
            prefetchEntered.signal()
        }

        let packService = OfflinePackService(
            store: store,
            overpassService: overpass,
            surfaceService: surface,
            routeWeatherService: routeWeather,
            tilePrefetcher: tilePrefetcher,
            nowProvider: nowClosure,
            timeZone: utcTZ
        )

        let coords = M4CTestSupport.makeWavyCoordinates(count: 600)
        var trip = M4CTestSupport.makeSampleTrip(
            id: "orphan-pin-trip",
            name: "Orphan Pin Check",
            coordinateCount: 600,
            distanceKm: 52.0,
            departureDate: "2026-11-29",
            departureTime: "10:30",
            arriveAtMode: true
        )
        trip.route.coordinates = coords

        let task = Task {
            try await packService.saveExpeditionPack(trip: trip, lang: .en, ftpWattsOverride: 240)
        }

        await prefetchEntered.wait()
        task.cancel()

        await #expect(throws: CancellationError.self) {
            _ = try await task.value
        }

        #expect(try await packService.getExpeditionPackStatus(tripId: "orphan-pin-trip") == nil)

        // Advance past 6h corridor/weather TTL and 7d surface TTL
        let expiredNow = fixedNow.get().addingTimeInterval(800_000)
        fixedNow.set(expiredNow)

        let aliases = OfflinePackService.buildStageOfflineKeyAliases(
            coordinates: coords,
            stageId: "orphan-pin-trip",
            distanceKm: 52.0
        )
        for amenityKey in [aliases.rawAmenityKey] + aliases.aliasAmenityKeys {
            let cached = try await store.fetchCachedCorridorScan(
                cacheKey: amenityKey,
                now: expiredNow,
                allowExpired: false
            )
            #expect(cached == nil)
        }
        for surfaceKey in [aliases.rawSurfaceKey] + aliases.aliasSurfaceKeys {
            let cached = try await store.fetchCachedSurface(
                routeKey: surfaceKey,
                now: expiredNow,
                allowExpired: false
            )
            #expect(cached == nil)
        }
        if let rawWeatherKey = RouteWeatherService.buildSectorCacheKey(
            trip: trip,
            targetDate: "2026-11-29",
            departureTime: "10:30",
            lang: .en,
            ftpWatts: 240
        ) {
            let cachedWeather = try await store.fetchCachedWeather(
                kind: .sector,
                cacheKey: rawWeatherKey,
                as: RouteWeatherAnalysis.self,
                now: expiredNow,
                allowExpired: false
            )
            #expect(cachedWeather == nil)
        }
    }
}

private actor AsyncSignal {
    private var signaled = false
    private var waiters: [CheckedContinuation<Void, Never>] = []

    nonisolated func signal() {
        Task { await self._signal() }
    }

    private func _signal() {
        guard !signaled else { return }
        signaled = true
        let current = waiters
        waiters.removeAll()
        for waiter in current {
            waiter.resume()
        }
    }

    func wait() async {
        if signaled { return }
        await withCheckedContinuation { continuation in
            waiters.append(continuation)
        }
    }
}
