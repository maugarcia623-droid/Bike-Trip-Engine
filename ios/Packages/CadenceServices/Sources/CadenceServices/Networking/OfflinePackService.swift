import Foundation
import CadenceCore

public struct OfflinePackStageProgress: Sendable, Equatable {
    public enum Phase: String, Sendable, Equatable {
        case started
        case stageCompleted
        case tilesPrefetched
        case saved
    }

    public var phase: Phase
    public var completedStages: Int
    public var totalStages: Int
    public var stageId: String?

    public init(
        phase: Phase,
        completedStages: Int,
        totalStages: Int,
        stageId: String? = nil
    ) {
        self.phase = phase
        self.completedStages = completedStages
        self.totalStages = totalStages
        self.stageId = stageId
    }
}

public protocol OfflineTilePrefetching: Sendable {
    func prefetchTiles(urls: [URL]) async -> Int
}

public struct URLSessionOfflineTilePrefetcher: OfflineTilePrefetching {
    private let urlSession: URLSession
    private let batchSize: Int
    private let timeoutSeconds: TimeInterval

    public init(
        urlSession: URLSession = .shared,
        batchSize: Int = 4,
        timeoutSeconds: TimeInterval = 8.0
    ) {
        self.urlSession = urlSession
        self.batchSize = max(1, batchSize)
        self.timeoutSeconds = max(0.05, timeoutSeconds)
    }

    public func prefetchTiles(urls: [URL]) async -> Int {
        guard !urls.isEmpty else { return 0 }
        var fetchedCount = 0
        var idx = 0

        while idx < urls.count {
            if Task.isCancelled { break }
            let batchEnd = min(urls.count, idx + batchSize)
            let batch = Array(urls[idx..<batchEnd])
            let session = self.urlSession
            let timeout = self.timeoutSeconds

            let batchSuccess = await withTaskGroup(of: Bool.self) { group in
                for url in batch {
                    group.addTask {
                        var request = URLRequest(url: url, timeoutInterval: max(0.1, timeout))
                        request.httpMethod = "GET"
                        do {
                            let (_, http) = try await M4CRequestTimeoutRunner.perform(
                                request: request,
                                urlSession: session,
                                timeoutSeconds: timeout
                            )
                            return (200...299).contains(http.statusCode)
                        } catch {
                            return false
                        }
                    }
                }
                var count = 0
                for await ok in group where ok {
                    count += 1
                }
                return count
            }

            fetchedCount += batchSuccess
            idx = batchEnd
        }

        return fetchedCount
    }
}

public struct StageOfflineKeyAliases: Sendable, Equatable {
    public let rawAmenityKey: String
    public let aliasAmenityKeys: [String]
    public let rawSurfaceKey: String
    public let aliasSurfaceKeys: [String]

    public init(
        rawAmenityKey: String,
        aliasAmenityKeys: [String],
        rawSurfaceKey: String,
        aliasSurfaceKeys: [String]
    ) {
        self.rawAmenityKey = rawAmenityKey
        self.aliasAmenityKeys = aliasAmenityKeys
        self.rawSurfaceKey = rawSurfaceKey
        self.aliasSurfaceKeys = aliasSurfaceKeys
    }
}

private struct StageWarmResult: Sendable {
    let amenitiesCount: Int
    let hasSurface: Bool
    let hasWeather: Bool
    let pinnedKeys: [String]
}

private enum StageAssetFetchOutcome: Sendable {
    case amenities(Result<[StageAmenity], Error>)
    case surface(Result<OsmSurfaceRouteData, Error>)
    case weather(Result<RouteWeatherAnalysis?, Error>)
}

/// Orchestrates multi-stage offline expedition pack warming across `OverpassCorridorService`,
/// `OsmSurfaceService`, `RouteWeatherService`, optional `ElevationFetching`, map tile prefetching,
/// and reference-counted pinning in `CadenceStore`.
/// Mirrors `src/services/offlinePackService.ts` and `getChipsExtraBufferMinutes` from
/// `src/utils/archetypeChips.ts:1731-1815`.
public actor OfflinePackService {
    public static let defaultMaxTiles = 96

    private let store: CadenceStore
    private let overpassService: OverpassCorridorService
    private let surfaceService: OsmSurfaceService
    private let routeWeatherService: RouteWeatherService
    private let elevationService: (any ElevationFetching)?
    private let tilePrefetcher: (any OfflineTilePrefetching)?
    private let nowProvider: @Sendable () -> Date
    private let timeZone: TimeZone

    public init(
        store: CadenceStore,
        overpassService: OverpassCorridorService,
        surfaceService: OsmSurfaceService,
        routeWeatherService: RouteWeatherService,
        elevationService: (any ElevationFetching)? = nil,
        tilePrefetcher: (any OfflineTilePrefetching)? = nil,
        nowProvider: @escaping @Sendable () -> Date = Date.init,
        timeZone: TimeZone = .current
    ) {
        self.store = store
        self.overpassService = overpassService
        self.surfaceService = surfaceService
        self.routeWeatherService = routeWeatherService
        self.elevationService = elevationService
        self.tilePrefetcher = tilePrefetcher
        self.nowProvider = nowProvider
        self.timeZone = timeZone
    }

    // MARK: - Pack CRUD

    public func getExpeditionPackStatus(tripId: String) async throws -> OfflinePackMeta? {
        try await store.fetchOfflinePack(tripId: tripId)
    }

    public func listOfflinePacks() async throws -> [OfflinePackMeta] {
        try await store.fetchAllOfflinePacks()
    }

    public func deleteExpeditionPack(tripId: String) async throws {
        try await store.deleteOfflinePack(tripId: tripId)
    }

    // MARK: - Pure Helpers (1:1 TypeScript Parity)

    public nonisolated static func resolveActiveStageIndexForPack(_ trip: TripProfile) -> Int {
        guard let stages = trip.stages, !stages.isEmpty else {
            return -1
        }
        return max(0, min(trip.activeStageIndex ?? 0, stages.count - 1))
    }

    public nonisolated static func resolveActiveStageForPack(_ trip: TripProfile) -> TripStage? {
        let idx = resolveActiveStageIndexForPack(trip)
        guard idx >= 0, let stages = trip.stages, idx < stages.count else {
            return nil
        }
        return stages[idx]
    }

    public nonisolated static func buildStageOfflineKeyAliases(
        coordinates: [LatLon],
        stageId: String,
        distanceKm: Double
    ) -> StageOfflineKeyAliases {
        let rawAmenityKey = RouteCacheKey.routeHashKey(
            coordinates: coordinates,
            stageId: stageId,
            totalDistanceKm: distanceKm
        )
        let rawSurfaceKey = RouteCacheKey.osmSurfaceRouteKey(
            coordinates: coordinates,
            distanceKm: distanceKm
        )

        var aliasAmenityKeys: [String] = []
        var aliasAmenitySet = Set<String>()
        var aliasSurfaceKeys: [String] = []
        var aliasSurfaceSet = Set<String>()

        for maxPoints in [450, 250] {
            if coordinates.count > maxPoints,
               let ds = StageManagerEngine.downsampleCoordinates(coordinates, maxPoints: maxPoints),
               ds.count >= 2 {
                let dsAmenityKey = RouteCacheKey.routeHashKey(
                    coordinates: ds,
                    stageId: stageId,
                    totalDistanceKm: distanceKm
                )
                if dsAmenityKey != rawAmenityKey, aliasAmenitySet.insert(dsAmenityKey).inserted {
                    aliasAmenityKeys.append(dsAmenityKey)
                }

                let dsSurfaceKey = RouteCacheKey.osmSurfaceRouteKey(
                    coordinates: ds,
                    distanceKm: distanceKm
                )
                if dsSurfaceKey != rawSurfaceKey, aliasSurfaceSet.insert(dsSurfaceKey).inserted {
                    aliasSurfaceKeys.append(dsSurfaceKey)
                }
            }
        }

        return StageOfflineKeyAliases(
            rawAmenityKey: rawAmenityKey,
            aliasAmenityKeys: aliasAmenityKeys,
            rawSurfaceKey: rawSurfaceKey,
            aliasSurfaceKeys: aliasSurfaceKeys
        )
    }

    /// Mirrors `getChipsExtraBufferMinutes(trip)` from `src/utils/archetypeChips.ts:1731-1815`
    /// using `CadenceCore.StationaryRecoveryEngine`.
    nonisolated static func chipsExtraBufferMinutes(
        _ trip: TripProfile,
        now: Date = Date()
    ) -> Int {
        let ruleSettings = trip.ruleSettings
        let recoveryRule = StationaryRecoveryEngine.getStationaryRecoveryRuleForTrip(
            trip,
            now: now
        )

        var extra = StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(
            requestedMinutes: ruleSettings?.plannedLongStopMin ?? 0.0,
            rule: recoveryRule
        )

        let customChips = trip.customChips ?? []
        guard !customChips.isEmpty else {
            return extra
        }

        for chipId in customChips {
            switch chipId {
            case "coffee-stop":
                extra += StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(
                    requestedMinutes: ruleSettings?.coffeeDurationMin ?? 15.0,
                    rule: recoveryRule
                )
            case "night-ride", "night-transit":
                extra += 10
            case "hill-climb":
                extra += 8
            case "bad-weather-prep":
                extra += 6
            case "rush-hour-buffer":
                extra += 12
            case "historical-tour":
                extra += StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(
                    requestedMinutes: 30.0,
                    rule: recoveryRule
                )
            case "photography-spots":
                extra += StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(
                    requestedMinutes: 15.0,
                    rule: recoveryRule
                )
            case "scenic-route":
                extra += StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(
                    requestedMinutes: 30.0,
                    rule: recoveryRule
                )
            case "resupply-points":
                extra += StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(
                    requestedMinutes: 12.0,
                    rule: recoveryRule
                )
            case "spa-wellness":
                extra += StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(
                    requestedMinutes: 20.0,
                    rule: recoveryRule
                )
            case "gravel-trail-master":
                extra += 12
            case "climbing-kom-hunt":
                extra += 8
            case "cultural-audio-guide":
                extra += StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(
                    requestedMinutes: 15.0,
                    rule: recoveryRule
                )
            case "picnic-outing":
                extra += StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(
                    requestedMinutes: ruleSettings?.picnicDurationMin ?? 45.0,
                    rule: recoveryRule
                )
            case "local-gastronomy":
                extra += StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(
                    requestedMinutes: 10.0,
                    rule: recoveryRule
                )
            default:
                break
            }
        }

        return extra
    }

    public nonisolated static func resolveStageWeatherRolloutTime(
        tripForWeather: TripProfile,
        lang: CadenceLang = .en,
        ftpWatts: Double? = nil,
        riderSpecs: RiderBikeSpecs = .defaultSpecs,
        now: Date = Date()
    ) -> String {
        let fallbackTime = (tripForWeather.departureTime?.isEmpty == false)
            ? tripForWeather.departureTime!
            : "08:00"

        let physics = PhysicsEngine.calculatePhysics(
            physics: tripForWeather.physics,
            route: tripForWeather.route,
            weather: tripForWeather.weather,
            lang: lang,
            ftpOverride: ftpWatts,
            riderSpecs: riderSpecs
        )
        let extraBuffer = chipsExtraBufferMinutes(tripForWeather, now: now)
        let timeline = TimelineEngine.calculateReverseTimeline(
            route: tripForWeather.route,
            office: tripForWeather.office,
            weather: tripForWeather.weather,
            tripTag: tripForWeather.tag,
            destinationName: tripForWeather.route.destination ?? "",
            lang: lang,
            extraBufferMinutes: extraBuffer,
            customChips: tripForWeather.customChips ?? [],
            physicsSpeedOverride: ReverseTimelinePhysicsOverride(
                effectiveSpeedKmH: physics.effectiveSpeedKmH,
                calmSpeedKmH: physics.calmSpeedKmH,
                arriveAtMode: tripForWeather.arriveAtMode,
                departureTime: tripForWeather.departureTime,
                movingTimeSeconds: physics.movingTimeSeconds,
                logistics: tripForWeather.ruleSettings,
                pinnedAmenities: tripForWeather.pinnedAmenities,
                departureDate: tripForWeather.departureDate,
                isMultiDayTour: (tripForWeather.stages?.count ?? 0) > 1
            ),
            riderSpecs: riderSpecs,
            now: now
        )
        return !timeline.hardDepartureTime.isEmpty ? timeline.hardDepartureTime : fallbackTime
    }

    private nonisolated static func latLonToTile(lat: Double, lon: Double, zoom: Int) -> (x: Int, y: Int) {
        let n = pow(2.0, Double(zoom))
        let maxTile = max(0, Int(n) - 1)
        let clampedLat = max(-85.05112878, min(85.05112878, lat))
        let x = Int(floor(((lon + 180.0) / 360.0) * n))
        let latRad = (clampedLat * .pi) / 180.0
        let y = Int(floor(((1.0 - log(tan(latRad) + 1.0 / cos(latRad)) / .pi) / 2.0) * n))
        return (
            x: max(0, min(maxTile, x)),
            y: max(0, min(maxTile, y))
        )
    }

    public nonisolated static func buildRouteTileUrls(
        coordinates: [LatLon],
        maxTiles: Int = OfflinePackService.defaultMaxTiles
    ) -> [URL] {
        guard coordinates.count >= 2, maxTiles > 0 else { return [] }

        let zooms = [11, 12, 13]
        let styles = ["World_Light_Gray_Base", "World_Dark_Gray_Base"]
        let sampleCount = min(16, coordinates.count)
        var sampled: [LatLon] = []
        sampled.reserveCapacity(sampleCount)

        for i in 0..<sampleCount {
            let idx: Int
            if sampleCount == 1 {
                idx = 0
            } else {
                idx = min(
                    coordinates.count - 1,
                    JSCompat.jsRoundInt((Double(i) / Double(sampleCount - 1)) * Double(coordinates.count - 1))
                )
            }
            sampled.append(coordinates[idx])
        }

        var perZoomQueues: [Int: [String]] = [:]
        for z in zooms {
            let maxTile = max(0, Int(pow(2.0, Double(z))) - 1)
            var queue: [String] = []
            var zoomSeen = Set<String>()

            func pushTile(lat: Double, lon: Double, dx: Int, dy: Int) {
                let center = latLonToTile(lat: lat, lon: lon, zoom: z)
                let x = max(0, min(maxTile, center.x + dx))
                let y = max(0, min(maxTile, center.y + dy))
                for style in styles {
                    let urlStr = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/\(style)/MapServer/tile/\(z)/\(y)/\(x)"
                    if zoomSeen.insert(urlStr).inserted {
                        queue.append(urlStr)
                    }
                }
            }

            // Pass 1: corridor centerline tiles along the entire route
            for pt in sampled {
                pushTile(lat: pt.lat, lon: pt.lon, dx: 0, dy: 0)
            }
            // Pass 2: adjacent corridor halo tiles
            for pt in sampled {
                for dx in [-1, 0, 1] {
                    for dy in [-1, 0, 1] {
                        if dx == 0 && dy == 0 { continue }
                        pushTile(lat: pt.lat, lon: pt.lon, dx: dx, dy: dy)
                    }
                }
            }

            perZoomQueues[z] = queue
        }

        var urls: [URL] = []
        urls.reserveCapacity(maxTiles)
        var globalSeen = Set<String>()
        var cursors: [Int: Int] = Dictionary(uniqueKeysWithValues: zooms.map { ($0, 0) })
        var progressed = true

        while urls.count < maxTiles && progressed {
            progressed = false
            for z in zooms {
                if urls.count >= maxTiles { break }
                let queue = perZoomQueues[z] ?? []
                var cursor = cursors[z] ?? 0
                while cursor < queue.count && globalSeen.contains(queue[cursor]) {
                    cursor += 1
                }
                if cursor < queue.count {
                    let raw = queue[cursor]
                    globalSeen.insert(raw)
                    if let parsed = URL(string: raw) {
                        urls.append(parsed)
                    }
                    cursors[z] = cursor + 1
                    progressed = true
                } else {
                    cursors[z] = cursor
                }
            }
        }

        return urls
    }

    // MARK: - Pack Orchestration

    public func saveExpeditionPack(
        trip: TripProfile,
        lang: CadenceLang = .en,
        ftpWattsOverride: Double? = nil,
        onProgress: (@Sendable (OfflinePackStageProgress) -> Void)? = nil
    ) async throws -> OfflinePackMeta {
        try Task.checkCancellation()

        let coords = trip.route.coordinates ?? []
        let hasTrace = coords.count >= 2
        let activeStageIdx = Self.resolveActiveStageIndexForPack(trip)
        let activeStage = Self.resolveActiveStageForPack(trip)
        let stageId = activeStage?.id ?? trip.id

        let effectiveSpecs = try? await store.fetchEffectiveRiderSpecs()
        let riderSpecs = effectiveSpecs ?? .defaultSpecs
        let ftpWatts = ftpWattsOverride ?? riderSpecs.ftpWatts

        let stages = trip.stages ?? []
        let otherStages: [TripStage] = stages.count > 1
            ? stages.enumerated().compactMap { idx, stage in
                guard idx != activeStageIdx, (stage.route.coordinates?.count ?? 0) >= 2 else {
                    return nil
                }
                return stage
            }
            : []

        let totalStages = (hasTrace ? 1 : 0) + otherStages.count
        var completedStages = 0
        onProgress?(OfflinePackStageProgress(
            phase: .started,
            completedStages: 0,
            totalStages: totalStages,
            stageId: stageId
        ))

        var amenitiesCount = 0
        var hasSurface = false
        var hasWeather = false
        var collectedPinnedKeys: [String] = []
        var tileCoordinateBatches: [[LatLon]] = []

        if hasTrace {
            tileCoordinateBatches.append(coords)
            let todayIso = WeatherService.localTodayIso(now: nowProvider(), timeZone: timeZone)
            let targetDate = (activeStage?.departureDate.isEmpty == false)
                ? activeStage!.departureDate
                : ((trip.departureDate?.isEmpty == false) ? trip.departureDate! : todayIso)
            let rawTargetTime = (activeStage?.departureTime.isEmpty == false)
                ? activeStage!.departureTime
                : ((trip.departureTime?.isEmpty == false) ? trip.departureTime! : "08:00")

            var activeTripForWeather = trip
            activeTripForWeather.departureDate = targetDate
            activeTripForWeather.departureTime = rawTargetTime
            if let mode = activeStage?.targetMode {
                activeTripForWeather.arriveAtMode = (mode == "arrive")
            }

            let targetTime = Self.resolveStageWeatherRolloutTime(
                tripForWeather: activeTripForWeather,
                lang: lang,
                ftpWatts: ftpWatts,
                riderSpecs: riderSpecs,
                now: nowProvider()
            )

            let activeWarm = try await warmStageOfflineAssets(
                tripForWeather: activeTripForWeather,
                coordinates: coords,
                distanceKm: trip.route.distanceKm,
                stageId: stageId,
                elevationProfile: trip.route.elevationProfile,
                targetDate: targetDate,
                targetTime: targetTime,
                rawTargetTime: rawTargetTime,
                lang: lang,
                ftpWatts: ftpWatts
            )
            amenitiesCount = activeWarm.amenitiesCount
            hasSurface = activeWarm.hasSurface
            hasWeather = activeWarm.hasWeather
            collectedPinnedKeys.append(contentsOf: activeWarm.pinnedKeys)

            completedStages += 1
            onProgress?(OfflinePackStageProgress(
                phase: .stageCompleted,
                completedStages: completedStages,
                totalStages: totalStages,
                stageId: stageId
            ))
        }

        if !otherStages.isEmpty {
            for stage in otherStages {
                if let stageCoords = stage.route.coordinates, stageCoords.count >= 2 {
                    tileCoordinateBatches.append(stageCoords)
                }
            }

            let todayIso = WeatherService.localTodayIso(now: nowProvider(), timeZone: timeZone)
            let nowSnapshot = nowProvider()

            let extraPinned: [[String]] = try await withThrowingTaskGroup(of: (String, [String]).self) { group in
                for st in otherStages {
                    let stageCoords = st.route.coordinates ?? []
                    let stageDate = !st.departureDate.isEmpty
                        ? st.departureDate
                        : ((trip.departureDate?.isEmpty == false) ? trip.departureDate! : todayIso)
                    let rawStageTime = !st.departureTime.isEmpty
                        ? st.departureTime
                        : ((trip.departureTime?.isEmpty == false) ? trip.departureTime! : "08:00")

                    var stageTripForWeather = trip
                    stageTripForWeather.id = trip.id
                    stageTripForWeather.route = st.route
                    stageTripForWeather.departureDate = stageDate
                    stageTripForWeather.departureTime = rawStageTime
                    stageTripForWeather.customChips = st.customChips
                    stageTripForWeather.weather = st.weather
                    stageTripForWeather.office = st.office
                    if let mode = st.targetMode {
                        stageTripForWeather.arriveAtMode = (mode == "arrive")
                    }

                    let stageTime = Self.resolveStageWeatherRolloutTime(
                        tripForWeather: stageTripForWeather,
                        lang: lang,
                        ftpWatts: ftpWatts,
                        riderSpecs: riderSpecs,
                        now: nowSnapshot
                    )
                    let stageTripFinal = stageTripForWeather
                    let stageIdCopy = st.id
                    let distKm = st.route.distanceKm
                    let elevProfile = st.route.elevationProfile

                    group.addTask {
                        let res = try await self.warmStageOfflineAssets(
                            tripForWeather: stageTripFinal,
                            coordinates: stageCoords,
                            distanceKm: distKm,
                            stageId: stageIdCopy,
                            elevationProfile: elevProfile,
                            targetDate: stageDate,
                            targetTime: stageTime,
                            rawTargetTime: rawStageTime,
                            lang: lang,
                            ftpWatts: ftpWatts
                        )
                        return (stageIdCopy, res.pinnedKeys)
                    }
                }

                var keysByStage: [[String]] = []
                for try await (completedId, keys) in group {
                    keysByStage.append(keys)
                    completedStages += 1
                    onProgress?(OfflinePackStageProgress(
                        phase: .stageCompleted,
                        completedStages: completedStages,
                        totalStages: totalStages,
                        stageId: completedId
                    ))
                }
                return keysByStage
            }

            for keys in extraPinned {
                collectedPinnedKeys.append(contentsOf: keys)
            }
        }

        try Task.checkCancellation()

        var tilesPrefetched = 0
        if let tilePrefetcher {
            for coordsBatch in tileCoordinateBatches {
                try Task.checkCancellation()
                let urls = Self.buildRouteTileUrls(coordinates: coordsBatch, maxTiles: Self.defaultMaxTiles)
                if !urls.isEmpty {
                    tilesPrefetched += await tilePrefetcher.prefetchTiles(urls: urls)
                }
            }
        }

        try Task.checkCancellation()

        onProgress?(OfflinePackStageProgress(
            phase: .tilesPrefetched,
            completedStages: completedStages,
            totalStages: totalStages,
            stageId: stageId
        ))

        var seenPinned = Set<String>()
        var uniquePinnedKeys: [String] = []
        for key in collectedPinnedKeys where seenPinned.insert(key).inserted {
            uniquePinnedKeys.append(key)
        }

        let meta = OfflinePackMeta(
            tripId: trip.id,
            tripName: trip.name,
            savedAt: nowProvider(),
            distanceKm: trip.route.distanceKm,
            amenitiesCount: amenitiesCount,
            hasSurface: hasSurface,
            hasWeather: hasWeather,
            tilesPrefetched: tilesPrefetched,
            pinnedCacheKeys: uniquePinnedKeys
        )

        try await store.saveOfflinePack(meta, pinnedCacheKeys: uniquePinnedKeys)

        onProgress?(OfflinePackStageProgress(
            phase: .saved,
            completedStages: completedStages,
            totalStages: totalStages,
            stageId: stageId
        ))

        return meta
    }

    private func warmStageOfflineAssets(
        tripForWeather: TripProfile,
        coordinates: [LatLon],
        distanceKm: Double,
        stageId: String,
        elevationProfile: [ElevationProfilePoint]?,
        targetDate: String,
        targetTime: String,
        rawTargetTime: String?,
        lang: CadenceLang,
        ftpWatts: Double
    ) async throws -> StageWarmResult {
        try Task.checkCancellation()

        var resolvedElevationProfile = elevationProfile
        var hydratedTripForWeather = tripForWeather
        if (resolvedElevationProfile == nil || resolvedElevationProfile?.isEmpty == true),
           let elevationService {
            if let dem = await elevationService.fetchDemElevationProfile(
                coordinates: coordinates,
                totalDistanceKm: distanceKm
            ) {
                resolvedElevationProfile = dem.elevationProfile
                hydratedTripForWeather.route.elevationProfile = dem.elevationProfile
            }
            if Task.isCancelled {
                throw CancellationError()
            }
        }

        let overpass = self.overpassService
        let surface = self.surfaceService
        let routeWeather = self.routeWeatherService
        let elevCopy = resolvedElevationProfile
        let tripCopy = hydratedTripForWeather

        var amenitiesRes: Result<[StageAmenity], Error> = .failure(CancellationError())
        var surfaceRes: Result<OsmSurfaceRouteData, Error> = .failure(CancellationError())
        var weatherRes: Result<RouteWeatherAnalysis?, Error> = .failure(CancellationError())

        try await withThrowingTaskGroup(of: StageAssetFetchOutcome.self) { group in
            group.addTask {
                do {
                    let result = try await overpass.scanCorridorAmenities(
                        coordinates: coordinates,
                        totalDistanceKm: distanceKm,
                        stageId: stageId,
                        elevationProfile: elevCopy,
                        lang: lang
                    )
                    return .amenities(.success(result))
                } catch is CancellationError {
                    throw CancellationError()
                } catch {
                    if Task.isCancelled { throw CancellationError() }
                    return .amenities(.failure(error))
                }
            }

            group.addTask {
                do {
                    let result = try await surface.fetchOsmSurfaceForRoute(
                        coordinates: coordinates,
                        distanceKm: distanceKm
                    )
                    return .surface(.success(result))
                } catch is CancellationError {
                    throw CancellationError()
                } catch {
                    if Task.isCancelled { throw CancellationError() }
                    return .surface(.failure(error))
                }
            }

            group.addTask {
                let result = await routeWeather.fetchRouteSectorForecast(
                    trip: tripCopy,
                    targetDate: targetDate,
                    departureTime: targetTime,
                    lang: lang,
                    ftpWatts: ftpWatts
                )
                if Task.isCancelled {
                    throw CancellationError()
                }
                return .weather(.success(result))
            }

            for try await outcome in group {
                switch outcome {
                case .amenities(let res):
                    amenitiesRes = res
                case .surface(let res):
                    surfaceRes = res
                case .weather(let res):
                    weatherRes = res
                }
            }
        }

        try Task.checkCancellation()

        let aliases = Self.buildStageOfflineKeyAliases(
            coordinates: coordinates,
            stageId: stageId,
            distanceKm: distanceKm
        )

        var amenitiesCount = 0
        var hasSurface = false
        var hasWeather = false
        var pinnedKeys: [String] = []
        let now = nowProvider()

        if case .success(let amenities) = amenitiesRes {
            amenitiesCount = amenities.count
            pinnedKeys.append(aliases.rawAmenityKey)
            pinnedKeys.append(contentsOf: aliases.aliasAmenityKeys)
            for dsKey in aliases.aliasAmenityKeys {
                await overpass.setCachedScan(
                    key: dsKey,
                    results: amenities,
                    stageId: stageId,
                    distanceKm: distanceKm,
                    pinOffline: false
                )
            }
        }

        if case .success(let surfaceData) = surfaceRes {
            hasSurface = !surfaceData.ways.isEmpty
            pinnedKeys.append(aliases.rawSurfaceKey)
            pinnedKeys.append(contentsOf: aliases.aliasSurfaceKeys)
            for dsSurfKey in aliases.aliasSurfaceKeys {
                var aliased = surfaceData
                aliased.routeKey = dsSurfKey
                try? await store.saveCachedSurface(
                    aliased,
                    ttlSeconds: OsmSurfaceService.defaultCacheTTLSeconds,
                    pinOffline: false,
                    now: now
                )
            }
        }

        if case .success(let analysisOpt) = weatherRes, let analysis = analysisOpt {
            hasWeather = true
            if analysis.source != .simulated {
                if let primaryKey = RouteWeatherService.buildSectorCacheKey(
                    trip: hydratedTripForWeather,
                    targetDate: targetDate,
                    departureTime: targetTime,
                    lang: lang,
                    ftpWatts: ftpWatts
                ) {
                    pinnedKeys.append("sector:\(primaryKey)")
                }

                if let rawTargetTime, rawTargetTime != targetTime,
                   let rawWeatherKey = RouteWeatherService.buildSectorCacheKey(
                       trip: hydratedTripForWeather,
                       targetDate: targetDate,
                       departureTime: rawTargetTime,
                       lang: lang,
                       ftpWatts: ftpWatts
                   ) {
                    try? await store.saveCachedWeather(
                        kind: .sector,
                        cacheKey: rawWeatherKey,
                        value: analysis,
                        source: analysis.source.rawValue,
                        ttlSeconds: RouteWeatherService.sectorCacheTTLSeconds,
                        pinOffline: false,
                        now: now
                    )
                    pinnedKeys.append("sector:\(rawWeatherKey)")
                }
            }
        }

        return StageWarmResult(
            amenitiesCount: amenitiesCount,
            hasSurface: hasSurface,
            hasWeather: hasWeather,
            pinnedKeys: pinnedKeys
        )
    }
}
