import Foundation
import CadenceCore

public enum OsmFetchStatus: String, Codable, Sendable, Equatable {
    case idle
    case loading
    case ready
    case error
}

public struct ClassifiedOsmWay: Codable, Sendable, Equatable {
    public var surfaceType: SurfaceType
    public var technicality: SectorTechnicality
    public var suitability38c: String
    public var effectiveCrr: Double
    public var isInferredFromHighway: Bool
    public var detailEn: String
    public var detailFr: String
    public var riderNoteEn: String
    public var riderNoteFr: String

    public init(
        surfaceType: SurfaceType,
        technicality: SectorTechnicality,
        suitability38c: String,
        effectiveCrr: Double,
        isInferredFromHighway: Bool,
        detailEn: String,
        detailFr: String,
        riderNoteEn: String,
        riderNoteFr: String
    ) {
        self.surfaceType = surfaceType
        self.technicality = technicality
        self.suitability38c = suitability38c
        self.effectiveCrr = effectiveCrr
        self.isInferredFromHighway = isInferredFromHighway
        self.detailEn = detailEn
        self.detailFr = detailFr
        self.riderNoteEn = riderNoteEn
        self.riderNoteFr = riderNoteFr
    }
}

public struct EdgeOsmMatch: Sendable, Equatable {
    public var way: OsmWayElement
    public var classified: ClassifiedOsmWay
    public var distScoreM: Double

    public init(way: OsmWayElement, classified: ClassifiedOsmWay, distScoreM: Double) {
        self.way = way
        self.classified = classified
        self.distScoreM = distScoreM
    }
}

public enum OsmSurfaceServiceError: Error, Sendable, Equatable {
    case insufficientCoordinates
    case allMirrorsFailed(lastErrorDescription: String)
    case invalidResponse
}

private struct OsmOverpassCoord: Decodable, Sendable {
    let lat: Double?
    let lon: Double?
}

private struct OsmOverpassRawElement: Decodable, Sendable {
    let type: String?
    let id: Int?
    let bounds: OsmBounds?
    let geometry: [OsmOverpassCoord]?
    let tags: OsmWayTags?
}

private struct OsmOverpassResponse: Decodable, Sendable {
    let elements: [OsmOverpassRawElement]?
}

/// OpenStreetMap surface querying, tag classification, spatial edge matching,
/// and `SurfaceBreakdown` synthesis actor mirroring `src/services/osmSurfaceService.ts`
/// and `src/utils/surfaceProfile.ts` (lines 556–1331).
public actor OsmSurfaceService {
    public static let overpassEndpoints: [URL] = OverpassCorridorService.defaultEndpoints
    public static let maxChunkMeters: Double = 9500
    public static let maxChunkPoints: Int = 22
    public static let chunkBatchConcurrency: Int = 2
    public static let defaultTimeout: Duration = .milliseconds(9500)
    public static let fallbackMirrorCap: Duration = .milliseconds(6000)
    public static let defaultCacheTTLSeconds: TimeInterval = 604_800 // 7 days

    private struct CacheStateEntry: Sendable {
        var status: OsmFetchStatus
        var data: OsmSurfaceRouteData?
        var error: String?
        var activeRequestId: UUID? = nil
    }

    private let urlSession: URLSession
    private let store: CadenceStore?
    private let endpoints: [URL]
    private let primaryTimeout: Duration
    private let fallbackTimeoutCap: Duration
    private let cacheTTLSeconds: TimeInterval
    private let nowProvider: @Sendable () -> Date

    private var memoryCache: [String: CacheStateEntry] = [:]
    private var inFlight: [String: (id: UUID, flight: CoalescedFlight<OsmSurfaceRouteData>)] = [:]
    private var cacheEpoch: UInt64 = 0

    public init(
        urlSession: URLSession = .shared,
        store: CadenceStore? = nil,
        endpoints: [URL] = OsmSurfaceService.overpassEndpoints,
        primaryTimeout: Duration = OsmSurfaceService.defaultTimeout,
        fallbackTimeoutCap: Duration = OsmSurfaceService.fallbackMirrorCap,
        cacheTTLSeconds: TimeInterval = OsmSurfaceService.defaultCacheTTLSeconds,
        nowProvider: @escaping @Sendable () -> Date = Date.init
    ) {
        self.urlSession = urlSession
        self.store = store
        self.endpoints = endpoints
        self.primaryTimeout = primaryTimeout
        self.fallbackTimeoutCap = fallbackTimeoutCap
        self.cacheTTLSeconds = cacheTTLSeconds
        self.nowProvider = nowProvider
    }

    // MARK: - Primary Async Fetch & Cache APIs

    public func fetchOsmSurfaceForRoute(
        coordinates: [LatLon],
        distanceKm: Double? = nil,
        forceFresh: Bool = false
    ) async throws -> OsmSurfaceRouteData {
        try Task.checkCancellation()
        guard coordinates.count >= 2 else {
            throw OsmSurfaceServiceError.insufficientCoordinates
        }

        let routeKey = Self.routeKey(coordinates: coordinates, distanceKm: distanceKm)

        while true {
            try Task.checkCancellation()
            let existing = memoryCache[routeKey]

            if !forceFresh, existing?.status == .ready, let data = existing?.data {
                return data
            }

            if !forceFresh, let running = inFlight[routeKey] {
                if let waiterID = running.flight.tryReserveWaiter() {
                    switch try await running.flight.awaitResult(waiterID: waiterID) {
                    case .value(let data):
                        return data
                    case .abortedByCancellation:
                        clearInFlight(routeKey: routeKey, id: running.id)
                        continue
                    }
                } else {
                    clearInFlight(routeKey: routeKey, id: running.id)
                }
            }

            let requestId = UUID()
            let previousData = existing?.data
            memoryCache[routeKey] = CacheStateEntry(
                status: .loading,
                data: previousData,
                error: nil,
                activeRequestId: requestId
            )

            let session = self.urlSession
            let storeRef = self.store
            let endpointsRef = self.endpoints
            let primaryTimeoutSec = Self.durationToSeconds(self.primaryTimeout)
            let fallbackCapSec = Self.durationToSeconds(self.fallbackTimeoutCap)
            let ttl = self.cacheTTLSeconds
            let nowFn = self.nowProvider

            let flight = CoalescedFlight<OsmSurfaceRouteData>(onCancelFlight: { [weak self] in
                Task {
                    await self?.restorePreviousOrClearOnCancel(
                        routeKey: routeKey,
                        requestId: requestId,
                        previousData: previousData
                    )
                    await self?.clearInFlight(routeKey: routeKey, id: requestId)
                }
            })
            guard let initialWaiterID = flight.tryReserveWaiter() else {
                continue
            }
            inFlight[routeKey] = (id: requestId, flight: flight)

            flight.start { [weak self] in
                do {
                    if !forceFresh, let storeRef,
                       let stored = try? await storeRef.fetchCachedSurface(
                           routeKey: routeKey,
                           now: nowFn(),
                           allowExpired: false
                       ) {
                        await self?.setMemoryReady(routeKey: routeKey, requestId: requestId, data: stored)
                        await self?.clearInFlight(routeKey: routeKey, id: requestId)
                        return stored
                    }

                    try Task.checkCancellation()

                    let cumMeters = OverpassWaterGapEngine.computeCumulativeDistances(coordinates)
                    let bufferMeters = Self.computeQueryBufferMeters(coordinates: coordinates, cumMeters: cumMeters)
                    let chunks = Self.buildOverpassPolylineChunks(coordinates: coordinates, cumMeters: cumMeters)

                    var waysById: [Int: OsmWayElement] = [:]
                    var wayOrder: [Int] = []

                    var batchStart = 0
                    while batchStart < chunks.count {
                        try Task.checkCancellation()
                        let batchEnd = min(chunks.count, batchStart + Self.chunkBatchConcurrency)
                        let batch = Array(chunks[batchStart..<batchEnd])

                        let batchResponses: [(Int, OsmOverpassResponse)] = try await withThrowingTaskGroup(
                            of: (Int, OsmOverpassResponse).self
                        ) { group in
                            for (offset, chunk) in batch.enumerated() {
                                let query = Self.buildChunkOverpassQuery(chunk: chunk, bufferMeters: bufferMeters)
                                group.addTask {
                                    let decoded: OsmOverpassResponse = try await OverpassCorridorService.fetchOverpassWithFailover(
                                        query: query,
                                        timeoutSeconds: primaryTimeoutSec,
                                        secondaryTimeoutCapSeconds: fallbackCapSec,
                                        urlSession: session,
                                        endpoints: endpointsRef,
                                        as: OsmOverpassResponse.self
                                    )
                                    return (offset, decoded)
                                }
                            }

                            var collected: [(Int, OsmOverpassResponse)] = []
                            for try await item in group {
                                collected.append(item)
                            }
                            return collected.sorted { $0.0 < $1.0 }
                        }

                        for (_, response) in batchResponses {
                            for rawEl in response.elements ?? [] {
                                if let way = Self.normalizeOsmElement(rawEl) {
                                    if waysById[way.id] == nil {
                                        wayOrder.append(way.id)
                                    }
                                    waysById[way.id] = way
                                }
                            }
                        }

                        batchStart = batchEnd
                    }

                    try Task.checkCancellation()

                    let ways = wayOrder.compactMap { waysById[$0] }
                    let completedAt = nowFn()
                    let formatter = ISO8601DateFormatter()
                    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

                    let result = OsmSurfaceRouteData(
                        routeKey: routeKey,
                        ways: ways,
                        wayCount: ways.count,
                        chunkCount: chunks.count,
                        fetchedAt: formatter.string(from: completedAt)
                    )

                    let didCommit = await self?.setMemoryReady(routeKey: routeKey, requestId: requestId, data: result) ?? false
                    if didCommit, let storeRef {
                        try? await storeRef.saveCachedSurface(
                            result,
                            ttlSeconds: ttl,
                            pinOffline: false,
                            now: completedAt
                        )
                    }
                    await self?.clearInFlight(routeKey: routeKey, id: requestId)
                    return result
                } catch is CancellationError {
                    await self?.restorePreviousOrClearOnCancel(
                        routeKey: routeKey,
                        requestId: requestId,
                        previousData: previousData
                    )
                    await self?.clearInFlight(routeKey: routeKey, id: requestId)
                    throw CancellationError()
                } catch {
                    if Task.isCancelled {
                        await self?.restorePreviousOrClearOnCancel(
                            routeKey: routeKey,
                            requestId: requestId,
                            previousData: previousData
                        )
                        await self?.clearInFlight(routeKey: routeKey, id: requestId)
                        throw CancellationError()
                    }
                    if let storeRef,
                       let fallback = try? await storeRef.fetchCachedSurface(
                           routeKey: routeKey,
                           now: nowFn(),
                           allowExpired: true
                       ) {
                        await self?.setMemoryReady(routeKey: routeKey, requestId: requestId, data: fallback)
                        await self?.clearInFlight(routeKey: routeKey, id: requestId)
                        return fallback
                    }
                    let errMessage = String(describing: error)
                    await self?.setMemoryError(
                        routeKey: routeKey,
                        requestId: requestId,
                        previousData: previousData,
                        message: errMessage
                    )
                    await self?.clearInFlight(routeKey: routeKey, id: requestId)
                    if let surfaceErr = error as? OsmSurfaceServiceError {
                        throw surfaceErr
                    }
                    throw OsmSurfaceServiceError.allMirrorsFailed(lastErrorDescription: errMessage)
                }
            }

            switch try await flight.awaitResult(waiterID: initialWaiterID) {
            case .value(let data):
                return data
            case .abortedByCancellation:
                restorePreviousOrClearOnCancel(
                    routeKey: routeKey,
                    requestId: requestId,
                    previousData: previousData
                )
                clearInFlight(routeKey: routeKey, id: requestId)
                continue
            }
        }
    }

    public func getCachedOsmSurface(routeKey: String) async -> OsmSurfaceRouteData? {
        if let mem = memoryCache[routeKey]?.data {
            return mem
        }
        let epochBeforeStoreRead = cacheEpoch
        if let store,
           let stored = try? await store.fetchCachedSurface(
               routeKey: routeKey,
               now: nowProvider(),
               allowExpired: false
           ) {
            if cacheEpoch == epochBeforeStoreRead,
               memoryCache[routeKey]?.status != .loading,
               memoryCache[routeKey]?.activeRequestId == nil,
               memoryCache[routeKey]?.data == nil {
                memoryCache[routeKey] = CacheStateEntry(status: .ready, data: stored, error: nil)
                return stored
            }
            if let newerMem = memoryCache[routeKey]?.data {
                return newerMem
            }
            return stored
        }
        return nil
    }

    public func getCachedOsmSurface(
        coordinates: [LatLon],
        distanceKm: Double? = nil
    ) async -> OsmSurfaceRouteData? {
        let key = Self.routeKey(coordinates: coordinates, distanceKm: distanceKm)
        guard key != "empty" else { return nil }
        return await getCachedOsmSurface(routeKey: key)
    }

    public func clearMemoryCache() {
        cacheEpoch &+= 1
        memoryCache.removeAll()
    }

    // MARK: - Pure Nonisolated Helpers

    public nonisolated static func routeKey(
        coordinates: [LatLon]?,
        distanceKm: Double? = nil
    ) -> String {
        RouteCacheKey.osmSurfaceRouteKey(coordinates: coordinates, distanceKm: distanceKm)
    }

    public nonisolated static func computeQueryBufferMeters(
        coordinates: [LatLon],
        cumMeters: [Double]
    ) -> Int {
        let totalM = cumMeters.last ?? 0.0
        let avgStepM = totalM / Double(max(1, coordinates.count - 1))
        if avgStepM > 400.0 { return 55 }
        if avgStepM > 180.0 { return 40 }
        return 28
    }

    public nonisolated static func buildOverpassPolylineChunks(
        coordinates: [LatLon],
        cumMeters: [Double]
    ) -> [[LatLon]] {
        guard coordinates.count >= 2 else { return [] }

        var chunks: [[LatLon]] = []
        var chunkStartIdx = 0

        while chunkStartIdx < coordinates.count - 1 {
            let startMeters = chunkStartIdx < cumMeters.count ? cumMeters[chunkStartIdx] : 0.0
            var rawSlice: [LatLon] = [coordinates[chunkStartIdx]]
            var endIdx = chunkStartIdx + 1

            while endIdx < coordinates.count {
                rawSlice.append(coordinates[endIdx])
                let endMeters = endIdx < cumMeters.count ? cumMeters[endIdx] : startMeters
                let spanMeters = endMeters - startMeters
                if spanMeters >= maxChunkMeters || rawSlice.count >= maxChunkPoints * 3 {
                    break
                }
                endIdx += 1
            }

            var chunkPoints = rawSlice
            if rawSlice.count > maxChunkPoints {
                chunkPoints = []
                chunkPoints.reserveCapacity(maxChunkPoints)
                for i in 0..<maxChunkPoints {
                    let idx = JSCompat.jsRoundInt(
                        (Double(i) / Double(maxChunkPoints - 1)) * Double(rawSlice.count - 1)
                    )
                    chunkPoints.append(rawSlice[idx])
                }
            }

            if chunkPoints.count >= 2 {
                chunks.append(chunkPoints)
            }

            if endIdx >= coordinates.count - 1 {
                break
            }
            chunkStartIdx = endIdx
        }

        return chunks
    }

    public nonisolated static func buildChunkOverpassQuery(
        chunk: [LatLon],
        bufferMeters: Int
    ) -> String {
        let flatCoords = chunk
            .map { "\(JSCompat.jsFixed($0.lat, decimals: 5)),\(JSCompat.jsFixed($0.lon, decimals: 5))" }
            .joined(separator: ",")
        return [
            "[out:json][timeout:10];",
            "way(around:\(bufferMeters),\(flatCoords))",
            "[\"highway\"]",
            "[\"highway\"!~\"motorway|motorway_link|trunk|trunk_link|steps|corridor|elevator|construction|proposed\"]",
            "[\"service\"!~\"driveway|parking_aisle\"]",
            "[\"footway\"!~\"crossing|sidewalk\"]",
            "[\"area\"!=\"yes\"];",
            "out tags geom;",
        ].joined()
    }

    private nonisolated static func normalizeOsmElement(_ raw: OsmOverpassRawElement) -> OsmWayElement? {
        guard raw.type == "way",
              let id = raw.id,
              let rawGeometry = raw.geometry,
              rawGeometry.count >= 2 else {
            return nil
        }

        let geometry: [OsmCoordinate] = rawGeometry.compactMap { pt in
            guard let lat = pt.lat, let lon = pt.lon, lat.isFinite, lon.isFinite else {
                return nil
            }
            return OsmCoordinate(lat: lat, lon: lon)
        }
        guard geometry.count >= 2 else { return nil }

        let bounds: OsmBounds
        if let rawBounds = raw.bounds {
            bounds = rawBounds
        } else {
            var minlat = Double.infinity
            var minlon = Double.infinity
            var maxlat = -Double.infinity
            var maxlon = -Double.infinity
            for pt in geometry {
                if pt.lat < minlat { minlat = pt.lat }
                if pt.lat > maxlat { maxlat = pt.lat }
                if pt.lon < minlon { minlon = pt.lon }
                if pt.lon > maxlon { maxlon = pt.lon }
            }
            bounds = OsmBounds(minlat: minlat, minlon: minlon, maxlat: maxlat, maxlon: maxlon)
        }

        return OsmWayElement(
            id: id,
            bounds: bounds,
            geometry: geometry,
            tags: raw.tags ?? OsmWayTags()
        )
    }

    // MARK: - Tag Classification (1:1 parity with osmSurfaceService.ts:396-730)

    private nonisolated static let pavedSurfaces: Set<String> = [
        "asphalt", "paved", "concrete", "concrete:lanes", "concrete:plates",
        "paving_stones", "chipseal", "tarmac", "metal", "brick", "bricks",
    ]

    private nonisolated static let gravelSurfaces: Set<String> = [
        "compacted", "fine_gravel", "gravel", "pebblestone", "unpaved",
        "crushed_limestone", "shells", "slag", "laterite",
    ]

    private nonisolated static let singletrackSurfaces: Set<String> = [
        "dirt", "earth", "ground", "mud", "sand", "grass",
        "rock", "stone", "roots", "woodchips", "clay",
    ]

    private nonisolated static let osmSurfaceLabels: [String: (en: String, fr: String)] = [
        "asphalt": ("Asphalt", "Bitume / Enrobé"),
        "paved": ("Paved Tarmac", "Chaussée revêtue"),
        "concrete": ("Concrete", "Béton"),
        "concrete:lanes": ("Concrete Strips", "Bandes bétonnées"),
        "concrete:plates": ("Concrete Slabs", "Dalles béton"),
        "paving_stones": ("Paving Stones", "Pavés joints serrés"),
        "chipseal": ("Chipseal Tarmac", "Gravillonné routier"),
        "sett": ("Stone Setts / Cobbles", "Pavés anciens"),
        "cobblestone": ("Cobblestones", "Pavés irréguliers"),
        "unhewn_cobblestone": ("Rough Cobbles", "Pavés disjoints"),
        "wood": ("Timber Boardwalk", "Caillebotis / Ponton bois"),
        "metal": ("Metal Bridge Deck", "Tablier métallique"),
        "compacted": ("Compacted Hardpack", "Stabilisé compacté"),
        "fine_gravel": ("Fine Rolled Gravel", "Gravillon fin roulant"),
        "gravel": ("Loose Gravel", "Gravier / Chemin empierré"),
        "pebblestone": ("Cobbled Shingle / Pebbles", "Galets / Cailloutis"),
        "unpaved": ("Unpaved Lane", "Voie non revêtue"),
        "crushed_limestone": ("Crushed Limestone", "Calcaire concassé"),
        "shells": ("Shells & Marl", "Coquillages compactés"),
        "dirt": ("Natural Dirt Trail", "Chemin de terre"),
        "earth": ("Earth Track", "Sentier en terre"),
        "ground": ("Unprepared Ground", "Sol naturel"),
        "mud": ("Muddy / Soft Soil", "Zone humide / Boue"),
        "sand": ("Sandy Track", "Sol sableux"),
        "grass": ("Grassy Field Track", "Piste enherbée"),
        "rock": ("Rocky Outcrop / Slate", "Dalles rocheuses"),
        "woodchips": ("Woodchip Forest Path", "Sentier copeaux forestiers"),
    ]

    private nonisolated static let highwayFallbackLabels: [String: (en: String, fr: String)] = [
        "cycleway": ("Dedicated Cycleway", "Piste / Voie cyclable"),
        "primary": ("Primary Road", "Route principale"),
        "secondary": ("Secondary Road", "Route départementale"),
        "tertiary": ("Country Road", "Route communale / D-road"),
        "unclassified": ("Rural Minor Lane", "Petite route rurale"),
        "residential": ("Residential Street", "Rue résidentielle"),
        "living_street": ("Shared Low-Speed Street", "Zone de rencontre"),
        "service": ("Service / Canal Access", "Voie de service / Halage"),
        "pedestrian": ("Pedestrian Precinct", "Zone piétonne"),
        "track": ("Agricultural / Forest Track", "Chemin agricole / forestier"),
        "path": ("Narrow Path / Singletrack", "Sentier / Monotrace"),
        "bridleway": ("Bridleway / Bridle Path", "Chemin cavalier / rural"),
        "footway": ("Park / Embankment Path", "Allée / Promenade"),
    ]

    private nonisolated static func parseMtbScaleNumeric(_ raw: String?) -> Int? {
        guard let raw, !raw.isEmpty else { return nil }
        guard let range = raw.range(of: #"\d+"#, options: .regularExpression) else {
            return nil
        }
        return Int(raw[range])
    }

    public nonisolated static func classifyOsmWay(_ tags: OsmWayTags) -> ClassifiedOsmWay {
        let rawSurface = (tags.surface ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let rawHighway = (tags.highway ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let highway = rawHighway.isEmpty ? "unclassified" : rawHighway
        let tracktype = (tags.tracktype ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let smoothness = (tags.smoothness ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let mtbScale = parseMtbScaleNumeric(tags.mtbScale)
        let sacScale = (tags.sacScale ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

        let surfaceMeta = rawSurface.isEmpty ? nil : osmSurfaceLabels[rawSurface]
        let hwMeta = highwayFallbackLabels[highway] ?? ("OSM \(highway)", "Voie OSM (\(highway))")

        let isRoughSmoothness = smoothness.range(
            of: "very_bad|horrible|very_horrible|impassable",
            options: .regularExpression
        ) != nil
        let isBadSmoothness = smoothness.range(
            of: "bad|intermediate",
            options: .regularExpression
        ) != nil || isRoughSmoothness

        // 1. Mountain-bike technical trail or Alpine hiking path override
        if !sacScale.isEmpty ||
            (mtbScale != nil && (mtbScale! >= 1 || (rawSurface.isEmpty && highway == "path"))) {
            let isTechnical = (mtbScale != nil && mtbScale! >= 2) || !sacScale.isEmpty || isRoughSmoothness
            return ClassifiedOsmWay(
                surfaceType: .singletrack,
                technicality: isTechnical ? .technical : .moderate,
                suitability38c: isTechnical ? "caution" : "capable",
                effectiveCrr: isTechnical ? 0.0155 : 0.0118,
                isInferredFromHighway: rawSurface.isEmpty,
                detailEn: surfaceMeta?.en ?? "\(hwMeta.en) (Technical)",
                detailFr: surfaceMeta?.fr ?? "\(hwMeta.fr) (Technique)",
                riderNoteEn: isTechnical
                    ? "Technical narrow trail with roots or rocks — ride cautiously or walk steep steps."
                    : "Natural narrow trail — keep a steady line and relaxed grip.",
                riderNoteFr: isTechnical
                    ? "Sentier technique avec racines ou cailloux — restez vigilant ou mettez pied à terre si besoin."
                    : "Sentier naturel étroit — trajectoire propre et conduite souple."
            )
        }

        // 2. Explicit OSM surface=* tag rules
        if !rawSurface.isEmpty {
            // 2a. Cobbles & sett
            if rawSurface == "sett" || rawSurface == "cobblestone" || rawSurface == "unhewn_cobblestone" {
                let roughCobble = rawSurface == "unhewn_cobblestone" || isBadSmoothness
                return ClassifiedOsmWay(
                    surfaceType: rawSurface == "unhewn_cobblestone" ? .gravel : .paved,
                    technicality: roughCobble ? .moderate : .smooth,
                    suitability38c: roughCobble ? "capable" : "ideal",
                    effectiveCrr: roughCobble ? 0.0095 : 0.0068,
                    isInferredFromHighway: false,
                    detailEn: surfaceMeta?.en ?? rawSurface,
                    detailFr: surfaceMeta?.fr ?? rawSurface,
                    riderNoteEn: "38c tubeless setup absorbs cobblestone buzz smoothly without harsh pinch-flat risk.",
                    riderNoteFr: "Les 38c absorbent très bien les vibrations des pavés sans fatigue excessive."
                )
            }

            // 2b. Wood boardwalks / bridges
            if rawSurface == "wood" {
                return ClassifiedOsmWay(
                    surfaceType: (highway == "path" || highway == "footway") ? .gravel : .paved,
                    technicality: .smooth,
                    suitability38c: "capable",
                    effectiveCrr: 0.0065,
                    isInferredFromHighway: false,
                    detailEn: surfaceMeta?.en ?? "Timber Deck",
                    detailFr: surfaceMeta?.fr ?? "Platelage bois",
                    riderNoteEn: "Timber deck / boardwalk — watch grip carefully when damp or dewy.",
                    riderNoteFr: "Platelage bois — vigilance sur l’adhérence s’il est humide le matin."
                )
            }

            // 2c. Paved surfaces
            if pavedSurfaces.contains(rawSurface) {
                let cracked = isRoughSmoothness
                return ClassifiedOsmWay(
                    surfaceType: .paved,
                    technicality: cracked ? .moderate : .smooth,
                    suitability38c: "ideal",
                    effectiveCrr: cracked ? 0.0056 : 0.0044,
                    isInferredFromHighway: false,
                    detailEn: surfaceMeta?.en ?? rawSurface,
                    detailFr: surfaceMeta?.fr ?? rawSurface,
                    riderNoteEn: cracked
                        ? "Paved road with weathered patches — wider tires smooth out the bumps."
                        : "Smooth paved road — fast, predictable rolling.",
                    riderNoteFr: cracked
                        ? "Enrobé dégradé — des pneus un peu larges gomment bien les irrégularités."
                        : "Revêtement roulant — rendement fluide et régulier."
                )
            }

            // 2d. Gravel / compacted / fine_gravel surfaces
            if gravelSurfaces.contains(rawSurface) {
                let coarseGravel =
                    rawSurface == "pebblestone" ||
                    rawSurface == "gravel" ||
                    rawSurface == "unpaved" ||
                    tracktype == "grade3" ||
                    tracktype == "grade4" ||
                    isRoughSmoothness
                let veryRough = tracktype == "grade4" || tracktype == "grade5" || isRoughSmoothness
                return ClassifiedOsmWay(
                    surfaceType: .gravel,
                    technicality: veryRough ? .technical : (coarseGravel ? .moderate : .smooth),
                    suitability38c: veryRough ? "caution" : (coarseGravel ? "capable" : "ideal"),
                    effectiveCrr: veryRough ? 0.0112 : (coarseGravel ? 0.0086 : 0.0068),
                    isInferredFromHighway: false,
                    detailEn: surfaceMeta?.en ?? rawSurface,
                    detailFr: surfaceMeta?.fr ?? rawSurface,
                    riderNoteEn: veryRough
                        ? "Coarse or rutted unpaved track — ease up slightly and pick your line."
                        : (coarseGravel
                            ? "Unpaved gravel sector — well suited for a steady touring pace."
                            : "Hardpacked fine gravel — fast, smooth gravel riding."),
                    riderNoteFr: veryRough
                        ? "Chemin empierré irrégulier — ralentissez légèrement et anticipez les ornières."
                        : (coarseGravel
                            ? "Secteur gravier — adapté pour rouler sereinement."
                            : "Chemin stabilisé fin — idéal et roulant.")
                )
            }

            // 2e. Singletrack / dirt / earth / mud / sand / rock
            if singletrackSurfaces.contains(rawSurface) {
                let demanding =
                    rawSurface == "mud" ||
                    rawSurface == "sand" ||
                    rawSurface == "rock" ||
                    rawSurface == "roots" ||
                    isRoughSmoothness
                return ClassifiedOsmWay(
                    surfaceType: .singletrack,
                    technicality: demanding ? .technical : .moderate,
                    suitability38c: demanding ? "caution" : "capable",
                    effectiveCrr: demanding ? 0.015 : 0.0115,
                    isInferredFromHighway: false,
                    detailEn: surfaceMeta?.en ?? rawSurface,
                    detailFr: surfaceMeta?.fr ?? rawSurface,
                    riderNoteEn: demanding
                        ? "Soft or rocky natural ground — watch grip closely after rain."
                        : "Natural earth track — keep an easy pace and enjoy the quiet track.",
                    riderNoteFr: demanding
                        ? "Sol naturel meuble ou pierreux — vigilance sur l’adhérence après la pluie."
                        : "Chemin naturel — gardez une cadence souple et profitez du calme."
                )
            }
        }

        // 3. No explicit surface tag -> infer from tracktype + highway tag
        if highway == "track" {
            if tracktype == "grade1" {
                return ClassifiedOsmWay(
                    surfaceType: .paved,
                    technicality: .smooth,
                    suitability38c: "ideal",
                    effectiveCrr: 0.0052,
                    isInferredFromHighway: false,
                    detailEn: "Farm Track (Firm Surface)",
                    detailFr: "Chemin agricole stabilisé",
                    riderNoteEn: "Firm agricultural lane with reliable, hard surface.",
                    riderNoteFr: "Chemin agricole dur et bien roulant."
                )
            }
            if tracktype == "grade4" || tracktype == "grade5" {
                return ClassifiedOsmWay(
                    surfaceType: .singletrack,
                    technicality: tracktype == "grade5" ? .technical : .moderate,
                    suitability38c: tracktype == "grade5" ? "caution" : "capable",
                    effectiveCrr: tracktype == "grade5" ? 0.0148 : 0.0118,
                    isInferredFromHighway: false,
                    detailEn: "Natural Unpaved Track",
                    detailFr: "Chemin naturel irrégulier",
                    riderNoteEn: "Soft soil or grassy ruts expected — take it steady.",
                    riderNoteFr: "Sol meuble ou herbeux — restez souple et attentif."
                )
            }
            let isGrade2 = tracktype == "grade2"
            let hasTracktype = !tracktype.isEmpty
            return ClassifiedOsmWay(
                surfaceType: .gravel,
                technicality: isGrade2 ? .smooth : .moderate,
                suitability38c: isGrade2 ? "ideal" : "capable",
                effectiveCrr: isGrade2 ? 0.0072 : 0.0092,
                isInferredFromHighway: !hasTracktype,
                detailEn: isGrade2 ? "Firm Gravel Track" : hwMeta.en,
                detailFr: isGrade2 ? "Piste gravel régulière" : hwMeta.fr,
                riderNoteEn: hasTracktype
                    ? "Dependable gravel track suitable for most bikes."
                    : "Rural farm track — expect mixed earth and loose gravel.",
                riderNoteFr: hasTracktype
                    ? "Piste gravillonnée régulière et praticable."
                    : "Chemin rural — attendez-vous à un sol mixte terre et gravier."
            )
        }

        if highway == "path" || highway == "bridleway" {
            return ClassifiedOsmWay(
                surfaceType: .singletrack,
                technicality: .moderate,
                suitability38c: "capable",
                effectiveCrr: 0.0116,
                isInferredFromHighway: true,
                detailEn: hwMeta.en,
                detailFr: hwMeta.fr,
                riderNoteEn: "Narrow natural path — expect dirt or grass singletrack.",
                riderNoteFr: "Sentier étroit — chemin naturel en terre ou en herbe probable."
            )
        }

        if highway == "footway" {
            return ClassifiedOsmWay(
                surfaceType: .gravel,
                technicality: .smooth,
                suitability38c: "capable",
                effectiveCrr: 0.0074,
                isInferredFromHighway: true,
                detailEn: hwMeta.en,
                detailFr: hwMeta.fr,
                riderNoteEn: "Shared embankment/park path in OSM — moderate pace around walkers.",
                riderNoteFr: "Allée ou chemin partagé dans OSM — allure modérée près des piétons."
            )
        }

        return ClassifiedOsmWay(
            surfaceType: .paved,
            technicality: .smooth,
            suitability38c: "ideal",
            effectiveCrr: 0.0046,
            isInferredFromHighway: true,
            detailEn: "\(hwMeta.en) (Inferred Paved)",
            detailFr: "\(hwMeta.fr) (Bitume présumé)",
            riderNoteEn: "Standard OSM \(highway) road (no explicit surface tag) — reliably paved.",
            riderNoteFr: "Voie OSM \(highway) (sans tag surface explicite) — bitume standard présumé."
        )
    }

    // MARK: - Spatial Edge Matching (1:1 parity with osmSurfaceService.ts:736-896)

    private nonisolated static func getHighwayMatchPenaltyMeters(_ tags: OsmWayTags) -> Double {
        let hw = (tags.highway ?? "").lowercased()
        let bicycle = (tags.bicycle ?? "").lowercased()
        let hasExplicitSurface = !(tags.surface ?? "").isEmpty || !(tags.tracktype ?? "").isEmpty
        var penalty: Double = hasExplicitSurface ? -3.0 : 0.0

        if hw == "footway" {
            penalty += (bicycle == "yes" || bicycle == "designated" || bicycle == "permissive") ? 4.0 : 14.0
        } else if hw == "service" {
            penalty += 7.0
        } else if hw == "pedestrian" {
            penalty += 5.0
        }

        if tags.access == "private" {
            penalty += 24.0
        }
        return penalty
    }

    private nonisolated static func scoreWayForEdge(
        midLat: Double,
        midLon: Double,
        cosLat: Double,
        routeUx: Double,
        routeUy: Double,
        way: OsmWayElement
    ) -> Double {
        let metersPerDegLat = 111_320.0
        let metersPerDegLon = 111_320.0 * cosLat

        let px = midLon * metersPerDegLon
        let py = midLat * metersPerDegLat

        var bestScore = Double.infinity
        let geom = way.geometry

        if geom.count >= 2 {
            for i in 1..<geom.count {
                let ax = geom[i - 1].lon * metersPerDegLon
                let ay = geom[i - 1].lat * metersPerDegLat
                let bx = geom[i].lon * metersPerDegLon
                let by = geom[i].lat * metersPerDegLat

                let abx = bx - ax
                let aby = by - ay
                let abLenSq = abx * abx + aby * aby
                if abLenSq < 1e-6 { continue }

                var t = ((px - ax) * abx + (py - ay) * aby) / abLenSq
                if t < 0 { t = 0 }
                else if t > 1 { t = 1 }

                let closestX = ax + t * abx
                let closestY = ay + t * aby
                let dx = px - closestX
                let dy = py - closestY
                let distM = sqrt(dx * dx + dy * dy)

                let abLen = sqrt(abLenSq)
                let cosTheta = abs((routeUx * abx + routeUy * aby) / abLen)
                let anglePenaltyM = (1.0 - cosTheta) * 24.0
                let score = distM + anglePenaltyM

                if score < bestScore {
                    bestScore = score
                }
            }
        }

        return bestScore + getHighwayMatchPenaltyMeters(way.tags)
    }

    public nonisolated static func matchPolylineEdgesToOsmWays(
        coordinates: [LatLon],
        ways: [OsmWayElement]
    ) -> [EdgeOsmMatch?] {
        let edgeCount = max(0, coordinates.count - 1)
        guard edgeCount > 0, !ways.isEmpty else {
            return Array(repeating: nil, count: edgeCount)
        }

        let cumMeters = OverpassWaterGapEngine.computeCumulativeDistances(coordinates)
        let avgStepM = (cumMeters.last ?? 0.0) / Double(max(1, edgeCount))
        let maxSnapScoreM: Double = avgStepM > 350.0 ? 105.0 : 85.0
        let bboxPadDeg: Double = avgStepM > 350.0 ? 0.0016 : 0.0014

        var classCache: [Int: ClassifiedOsmWay] = [:]
        func getClass(_ way: OsmWayElement) -> ClassifiedOsmWay {
            if let existing = classCache[way.id] {
                return existing
            }
            let c = classifyOsmWay(way.tags)
            classCache[way.id] = c
            return c
        }

        var results = Array<EdgeOsmMatch?>(repeating: nil, count: edgeCount)

        for i in 0..<edgeCount {
            let a = coordinates[i]
            let b = coordinates[i + 1]
            let midLat = (a.lat + b.lat) * 0.5
            let midLon = (a.lon + b.lon) * 0.5
            let cosLat = max(0.15, cos((midLat * .pi) / 180.0))

            let rx = (b.lon - a.lon) * cosLat
            let ry = b.lat - a.lat
            let rawRLen = sqrt(rx * rx + ry * ry)
            let rLen = rawRLen > 0 ? rawRLen : 1.0
            let routeUx = rx / rLen
            let routeUy = ry / rLen

            var bestWay: OsmWayElement?
            var bestScore = Double.infinity

            for way in ways {
                if let bnd = way.bounds {
                    if midLat < bnd.minlat - bboxPadDeg ||
                        midLat > bnd.maxlat + bboxPadDeg ||
                        midLon < bnd.minlon - bboxPadDeg ||
                        midLon > bnd.maxlon + bboxPadDeg {
                        continue
                    }
                }

                let score = scoreWayForEdge(
                    midLat: midLat,
                    midLon: midLon,
                    cosLat: cosLat,
                    routeUx: routeUx,
                    routeUy: routeUy,
                    way: way
                )
                if score < bestScore {
                    bestScore = score
                    bestWay = way
                }
            }

            if let bestWay, bestScore <= maxSnapScoreM {
                results[i] = EdgeOsmMatch(
                    way: bestWay,
                    classified: getClass(bestWay),
                    distScoreM: bestScore
                )
            }
        }

        return results
    }

    public nonisolated static func formatOsmSectorTagsSummary(_ tags: OsmWayTags) -> String {
        var parts: [String] = []
        if let surface = tags.surface, !surface.isEmpty {
            parts.append("surface=\(surface)")
        } else if let highway = tags.highway, !highway.isEmpty {
            parts.append("highway=\(highway)")
        }
        if let tracktype = tags.tracktype, !tracktype.isEmpty {
            parts.append("tracktype=\(tracktype)")
        }
        if let smoothness = tags.smoothness, !smoothness.isEmpty {
            parts.append("smoothness=\(smoothness)")
        }
        if let mtbScale = tags.mtbScale, !mtbScale.isEmpty {
            parts.append("mtb:scale=\(mtbScale)")
        }
        return parts.joined(separator: " · ")
    }

    // MARK: - SurfaceBreakdown Synthesis (1:1 parity with src/utils/surfaceProfile.ts:556-1331)

    private struct ResolvedEdge {
        var startCoordIdx: Int
        var endCoordIdx: Int
        var distKm: Double
        var cumStartKm: Double
        var cumEndKm: Double
        var matched: EdgeOsmMatch?
        var type: SurfaceType
        var technicality: SectorTechnicality
        var suitability38c: String
        var effectiveCrr: Double
        var isInferredFromHighway: Bool
        var detailEn: String
        var detailFr: String
        var riderNoteEn: String
        var riderNoteFr: String
    }

    private struct OsmEdgeBlock {
        var type: SurfaceType
        var edges: [ResolvedEdge]
    }

    private nonisolated static func haversineKm(_ a: LatLon, _ b: LatLon) -> Double {
        OverpassWaterGapEngine.haversineDistanceMeters(
            lat1: a.lat,
            lon1: a.lon,
            lat2: b.lat,
            lon2: b.lon
        ) / 1000.0
    }

    public nonisolated static func subdivideRouteForOsm(
        _ coords: [LatLon]?,
        maxEdgeKm: Double = 0.22
    ) -> [LatLon] {
        let source = (coords != nil && coords!.count >= 2) ? coords! : SurfaceProfileEngine.defaultCorridorCoords
        var result: [LatLon] = []

        for i in 0..<(source.count - 1) {
            let start = source[i]
            let end = source[i + 1]
            let dKm = haversineKm(start, end)
            let steps = dKm > maxEdgeKm ? min(18, max(2, Int(ceil(dKm / maxEdgeKm)))) : 1
            for s in 0..<steps {
                let t = Double(s) / Double(steps)
                result.append(LatLon(
                    lat: JSCompat.roundTo(start.lat + (end.lat - start.lat) * t, decimals: 6),
                    lon: JSCompat.roundTo(start.lon + (end.lon - start.lon) * t, decimals: 6)
                ))
            }
        }
        result.append(source[source.count - 1])
        return result
    }

    private nonisolated static func pickWeightedValue(
        _ edges: [ResolvedEdge],
        getter: (ResolvedEdge) -> String?
    ) -> String? {
        var weights: [String: Double] = [:]
        var order: [String] = []
        for e in edges {
            guard let val = getter(e), !val.isEmpty else { continue }
            if weights[val] == nil {
                order.append(val)
            }
            weights[val, default: 0.0] += max(0.01, e.distKm)
        }
        var bestVal: String?
        var bestWeight = 0.0
        for val in order {
            let w = weights[val] ?? 0.0
            if w > bestWeight {
                bestWeight = w
                bestVal = val
            }
        }
        return bestVal
    }

    private nonisolated static func collectTopRoadNames(_ edges: [ResolvedEdge], limit: Int = 2) -> [String] {
        var weights: [String: Double] = [:]
        var order: [String] = []
        for e in edges {
            let name = e.matched?.way.tags.name?.trimmingCharacters(in: .whitespacesAndNewlines)
            let ref = e.matched?.way.tags.ref?.trimmingCharacters(in: .whitespacesAndNewlines)
            let label = (name?.isEmpty == false ? name : nil) ?? (ref?.isEmpty == false ? ref : nil)
            guard let label else { continue }
            if weights[label] == nil {
                order.append(label)
            }
            weights[label, default: 0.0] += max(0.01, e.distKm)
        }
        return order
            .sorted { (weights[$0] ?? 0.0) > (weights[$1] ?? 0.0) }
            .prefix(limit)
            .map { $0 }
    }

    private nonisolated static func formatSectorTitleFromOsm(
        type: SurfaceType,
        edges: [ResolvedEdge],
        sectorNumber: Int,
        osmRef: String?
    ) -> (nameEn: String, nameFr: String) {
        let topNames = collectTopRoadNames(edges, limit: 2)
        if !topNames.isEmpty {
            let primary = topNames[0]
            let joined = (topNames.count > 1 && primary.count + topNames[1].count <= 34)
                ? "\(primary) · \(topNames[1])"
                : primary
            let prefixRef: String
            if let osmRef, !osmRef.isEmpty, !joined.contains(osmRef), joined.count <= 26 {
                prefixRef = "\(joined) (\(osmRef))"
            } else {
                prefixRef = joined
            }
            return (prefixRef, prefixRef)
        }

        if let osmRef, !osmRef.isEmpty {
            switch type {
            case .paved:
                return ("\(osmRef) Paved Road", "Route \(osmRef)")
            case .gravel:
                return ("\(osmRef) Gravel Track", "Piste gravel \(osmRef)")
            case .singletrack:
                return ("\(osmRef) Trail", "Sentier \(osmRef)")
            }
        }

        switch type {
        case .paved:
            return ("Paved Stretch #\(sectorNumber)", "Tronçon bitumé #\(sectorNumber)")
        case .gravel:
            return ("Rural Gravel Track #\(sectorNumber)", "Chemin gravier #\(sectorNumber)")
        case .singletrack:
            return ("Natural Path #\(sectorNumber)", "Sentier naturel #\(sectorNumber)")
        }
    }

    private nonisolated static func coalesceOsmBlocks(_ edges: [ResolvedEdge]) -> [OsmEdgeBlock] {
        guard !edges.isEmpty else { return [] }

        // Pass 1: group consecutive edges by SurfaceType
        var blocks: [OsmEdgeBlock] = []
        for edge in edges {
            if !blocks.isEmpty && blocks[blocks.count - 1].type == edge.type {
                blocks[blocks.count - 1].edges.append(edge)
            } else {
                blocks.append(OsmEdgeBlock(type: edge.type, edges: [edge]))
            }
        }

        func blockDist(_ b: OsmEdgeBlock) -> Double {
            b.edges.reduce(0.0) { $0 + $1.distKm }
        }

        let totalRouteKm = edges.reduce(0.0) { $0 + $1.distKm }
        let frameThresholdKm = totalRouteKm >= 25.0 ? 0.25 : 0.16

        // Pass 2: absorb tiny intersection slivers & micro-blips
        var pass = 0
        while pass < 2 && blocks.count >= 2 {
            var nextBlocks: [OsmEdgeBlock] = []
            for i in 0..<blocks.count {
                let curr = blocks[i]
                let d = blockDist(curr)
                let hasTech = curr.edges.contains { $0.technicality == .technical }
                let prev = nextBlocks.last
                let next = (i + 1 < blocks.count) ? blocks[i + 1] : nil

                let isFramedSliver =
                    d < frameThresholdKm && !hasTech && prev != nil && next != nil && prev!.type == next!.type
                let isTinyMicroBlip =
                    d < 0.15 && (prev != nil || next != nil)

                if isFramedSliver || isTinyMicroBlip {
                    if let p = prev,
                       next == nil || blockDist(p) >= blockDist(next!) || p.type == next!.type {
                        nextBlocks[nextBlocks.count - 1].edges.append(contentsOf: curr.edges)
                    } else if i + 1 < blocks.count {
                        blocks[i + 1].edges.insert(contentsOf: curr.edges, at: 0)
                    }
                    continue
                }

                if let p = prev, p.type == curr.type {
                    nextBlocks[nextBlocks.count - 1].edges.append(contentsOf: curr.edges)
                } else {
                    nextBlocks.append(OsmEdgeBlock(type: curr.type, edges: curr.edges))
                }
            }
            blocks = nextBlocks
            pass += 1
        }

        // Pass 3: split ultra-long uniform blocks (>= 12km) into thirds
        if blocks.count <= 2 {
            var splitBlocks: [OsmEdgeBlock] = []
            for block in blocks {
                let len = blockDist(block)
                if len >= 12.0 && block.edges.count >= 9 {
                    let thirdLen = len / 3.0
                    var currentChunk: [ResolvedEdge] = []
                    var accLen = 0.0
                    var partsCreated = 0

                    for i in 0..<block.edges.count {
                        let edge = block.edges[i]
                        currentChunk.append(edge)
                        accLen += edge.distKm

                        let nextEdge: ResolvedEdge? = (i + 1 < block.edges.count) ? block.edges[i + 1] : nil
                        let currLabel = edge.matched?.way.tags.name ?? edge.matched?.way.tags.ref
                        let nextLabel = nextEdge?.matched?.way.tags.name ?? nextEdge?.matched?.way.tags.ref
                        let labelChanged = (currLabel?.isEmpty == false) && (nextLabel?.isEmpty == false) && currLabel != nextLabel

                        if partsCreated < 2 &&
                            accLen >= thirdLen * 0.85 &&
                            (labelChanged || accLen >= thirdLen * 1.15) &&
                            i < block.edges.count - 2 {
                            splitBlocks.append(OsmEdgeBlock(type: block.type, edges: currentChunk))
                            currentChunk = []
                            accLen = 0.0
                            partsCreated += 1
                        }
                    }

                    if !currentChunk.isEmpty {
                        splitBlocks.append(OsmEdgeBlock(type: block.type, edges: currentChunk))
                    }
                } else {
                    splitBlocks.append(block)
                }
            }
            blocks = splitBlocks
        }

        return blocks
    }

    public nonisolated static func buildSurfaceBreakdown(
        route: RouteParams,
        osmData: OsmSurfaceRouteData? = nil,
        riderSpecs: RiderBikeSpecs = .defaultSpecs,
        crr: Double? = nil,
        tireWidthMm explicitTireWidthMm: Double? = nil,
        isTubeless explicitTubeless: Bool? = nil,
        riderWeightKg: Double? = nil,
        bikeWeightKg: Double? = nil,
        luggageWeightKg: Double? = nil,
        customChips: [String] = [],
        isLoadingOsm: Bool? = nil,
        osmError: String? = nil
    ) -> SurfaceBreakdown {
        var breakdown = SurfaceProfileEngine.computeSurfaceBreakdown(
            origin: route.origin,
            destination: route.destination,
            gpxFileName: route.gpxFileName,
            distanceKm: route.distanceKm,
            elevationGainM: route.elevationGainM,
            elevationProfile: route.elevationProfile,
            coordinates: route.coordinates,
            waypoints: route.waypoints,
            crr: crr,
            tireWidthMm: explicitTireWidthMm,
            isTubeless: explicitTubeless,
            riderWeightKg: riderWeightKg,
            bikeWeightKg: bikeWeightKg,
            luggageWeightKg: luggageWeightKg,
            customChips: customChips,
            riderSpecs: riderSpecs
        )

        breakdown.isLoadingOsm = isLoadingOsm
        breakdown.osmError = osmError

        guard let osmData,
              let coordinates = route.coordinates,
              coordinates.count >= 2,
              !osmData.ways.isEmpty else {
            return breakdown
        }

        let totalDistKm = max(0.1, route.distanceKm > 0 ? route.distanceKm : 22.0)
        let profilePoints = route.elevationProfile ?? []
        let denseCoords = subdivideRouteForOsm(coordinates, maxEdgeKm: 0.22)
        guard denseCoords.count >= 2 else {
            return breakdown
        }

        let rawEdgeMatches = matchPolylineEdgesToOsmWays(coordinates: denseCoords, ways: osmData.ways)
        let edgeCount = denseCoords.count - 1

        var edgeDistsKm: [Double] = []
        edgeDistsKm.reserveCapacity(edgeCount)
        var rawTotalKm = 0.0
        var directMatchedKm = 0.0
        var explicitTaggedKm = 0.0

        for i in 0..<edgeCount {
            let d = max(0.005, haversineKm(denseCoords[i], denseCoords[i + 1]))
            edgeDistsKm.append(d)
            rawTotalKm += d
            if let m = rawEdgeMatches[i] {
                directMatchedKm += d
                if !m.classified.isInferredFromHighway {
                    explicitTaggedKm += d
                }
            }
        }

        let osmCoveragePctInt = rawTotalKm > 0 ? JSCompat.jsRoundInt((directMatchedKm / rawTotalKm) * 100.0) : 0
        if osmCoveragePctInt < 15 || rawTotalKm <= 0 {
            return breakdown
        }

        let explicitTagPctInt = directMatchedKm > 0 ? JSCompat.jsRoundInt((explicitTaggedKm / directMatchedKm) * 100.0) : 0

        var cumKm = 0.0
        var resolvedEdges: [ResolvedEdge] = []
        resolvedEdges.reserveCapacity(edgeCount)

        for i in 0..<edgeCount {
            var match = rawEdgeMatches[i]
            if match == nil {
                for offset in 1...5 {
                    if i - offset >= 0, let leftMatch = rawEdgeMatches[i - offset] {
                        match = leftMatch
                        break
                    }
                    if i + offset < edgeCount, let rightMatch = rawEdgeMatches[i + offset] {
                        match = rightMatch
                        break
                    }
                }
            }

            let segDist = (edgeDistsKm[i] / rawTotalKm) * totalDistKm
            let cumStartKm = (cumKm / rawTotalKm) * totalDistKm
            cumKm += edgeDistsKm[i]
            let cumEndKm = (cumKm / rawTotalKm) * totalDistKm

            let c = match?.classified
            resolvedEdges.append(ResolvedEdge(
                startCoordIdx: i,
                endCoordIdx: i + 1,
                distKm: segDist,
                cumStartKm: cumStartKm,
                cumEndKm: cumEndKm,
                matched: match,
                type: c?.surfaceType ?? .paved,
                technicality: c?.technicality ?? .smooth,
                suitability38c: c?.suitability38c ?? "ideal",
                effectiveCrr: c?.effectiveCrr ?? 0.0046,
                isInferredFromHighway: c?.isInferredFromHighway ?? true,
                detailEn: c?.detailEn ?? "Paved Road",
                detailFr: c?.detailFr ?? "Route bitumée",
                riderNoteEn: c?.riderNoteEn ?? "Smooth paved road — steady rhythm on all-road tires.",
                riderNoteFr: c?.riderNoteFr ?? "Route bitumée roulante — rythme fluide sans à-coups."
            ))
        }

        let blocks = coalesceOsmBlocks(resolvedEdges)
        guard !blocks.isEmpty, let segmentTemplate = breakdown.segments.first else {
            return breakdown
        }

        func techRank(_ t: SectorTechnicality) -> Int {
            switch t {
            case .smooth: return 0
            case .moderate: return 1
            case .technical: return 2
            }
        }
        func suitRank(_ s: String) -> Int {
            switch s {
            case "ideal": return 0
            case "capable": return 1
            default: return 2
            }
        }

        var cursorPct = 0.0
        let segments: [SurfaceSegment] = blocks.enumerated().map { idx, block in
            let isLast = idx == blocks.count - 1
            let firstEdge = block.edges[0]
            let lastEdge = block.edges[block.edges.count - 1]

            let rawStartKm = firstEdge.cumStartKm
            let rawEndKm = isLast ? totalDistKm : lastEdge.cumEndKm
            let blockDistKm = max(0.05, rawEndKm - rawStartKm)

            let startPct = cursorPct
            let sharePct = totalDistKm > 0 ? (blockDistKm / totalDistKm) * 100.0 : (100.0 / Double(blocks.count))
            let endPct = isLast ? 100.0 : min(100.0, cursorPct + sharePct)
            cursorPct = endPct

            let startKm = JSCompat.roundTo(rawStartKm, decimals: 1)
            let endKm = JSCompat.roundTo(isLast ? totalDistKm : rawEndKm, decimals: 1)
            let distanceKm = JSCompat.roundTo(max(0.1, endKm - startKm), decimals: 1)

            let startCoordIdx = firstEdge.startCoordIdx
            let endCoordIdx = lastEdge.endCoordIdx
            let segCoords = Array(denseCoords[startCoordIdx...endCoordIdx])

            let matchingPoints = profilePoints.filter { pt in
                let ptPct = totalDistKm > 0 ? (pt.distKm / totalDistKm) * 100.0 : 0.0
                return ptPct >= startPct - 1.0 && ptPct <= endPct + 1.0
            }
            let grades = matchingPoints.isEmpty ? [1.2] : matchingPoints.map { abs($0.gradePct) }
            let avgGradePct = JSCompat.roundTo(grades.reduce(0.0, +) / Double(grades.count), decimals: 1)
            let maxGradePct = JSCompat.roundTo(max(1.5, grades.max() ?? 1.5), decimals: 1)

            var crrWeightedSum = 0.0
            var totalBlockWeight = 0.0
            var inferredWeight = 0.0
            var worstTech: SectorTechnicality = .smooth
            var worstSuit = "ideal"
            var dominantDetailEn = firstEdge.detailEn
            var dominantDetailFr = firstEdge.detailFr
            var dominantNoteEn = firstEdge.riderNoteEn
            var dominantNoteFr = firstEdge.riderNoteFr
            var longestSingleEdge = -1.0

            var wayIdsSet: Set<Int> = []
            var wayIdsOrder: [Int] = []

            for e in block.edges {
                let w = max(0.01, e.distKm)
                crrWeightedSum += e.effectiveCrr * w
                totalBlockWeight += w
                if e.isInferredFromHighway { inferredWeight += w }
                if techRank(e.technicality) > techRank(worstTech) { worstTech = e.technicality }
                if suitRank(e.suitability38c) > suitRank(worstSuit) { worstSuit = e.suitability38c }
                if let wayId = e.matched?.way.id, wayIdsSet.insert(wayId).inserted {
                    wayIdsOrder.append(wayId)
                }
                if w > longestSingleEdge {
                    longestSingleEdge = w
                    dominantDetailEn = e.detailEn
                    dominantDetailFr = e.detailFr
                    dominantNoteEn = e.riderNoteEn
                    dominantNoteFr = e.riderNoteFr
                }
            }

            let osmHighway = pickWeightedValue(block.edges) { $0.matched?.way.tags.highway }
            let osmSurfaceTag = pickWeightedValue(block.edges) { $0.matched?.way.tags.surface }
            let osmTrackType = pickWeightedValue(block.edges) { $0.matched?.way.tags.tracktype }
            let osmSmoothness = pickWeightedValue(block.edges) { $0.matched?.way.tags.smoothness }
            let osmMtbScale = pickWeightedValue(block.edges) { $0.matched?.way.tags.mtbScale }
            let osmSacScale = pickWeightedValue(block.edges) { $0.matched?.way.tags.sacScale }
            let osmName = pickWeightedValue(block.edges) { $0.matched?.way.tags.name }
            let osmRef = pickWeightedValue(block.edges) { $0.matched?.way.tags.ref }

            let (nameEn, nameFr) = formatSectorTitleFromOsm(
                type: block.type,
                edges: block.edges,
                sectorNumber: idx + 1,
                osmRef: osmRef
            )
            let isInferredFromHighway = totalBlockWeight > 0 ? (inferredWeight / totalBlockWeight) > 0.65 : true

            var seg = segmentTemplate
            seg.id = "surf-seg-\(idx + 1)"
            seg.type = block.type
            seg.startKm = startKm
            seg.endKm = endKm
            seg.distanceKm = distanceKm
            seg.startPct = Double(JSCompat.jsRoundInt(startPct))
            seg.endPct = isLast ? 100.0 : Double(JSCompat.jsRoundInt(endPct))
            seg.startCoordIdx = startCoordIdx
            seg.endCoordIdx = endCoordIdx
            seg.coordinates = segCoords.count >= 2 ? segCoords : [denseCoords[0], denseCoords[denseCoords.count - 1]]
            seg.nameEn = nameEn
            seg.nameFr = nameFr
            seg.surfaceDetailEn = dominantDetailEn
            seg.surfaceDetailFr = dominantDetailFr
            seg.avgGradePct = avgGradePct
            seg.maxGradePct = maxGradePct
            seg.effectiveCrr = JSCompat.roundTo(totalBlockWeight > 0 ? crrWeightedSum / totalBlockWeight : 0.0052, decimals: 4)
            seg.technicality = worstTech
            seg.suitability38c = worstSuit
            seg.riderNoteEn = dominantNoteEn
            seg.riderNoteFr = dominantNoteFr
            seg.osmWayIds = wayIdsOrder
            seg.osmHighway = osmHighway
            seg.osmSurfaceTag = osmSurfaceTag
            seg.osmTrackType = osmTrackType
            seg.osmSmoothness = osmSmoothness
            seg.osmMtbScale = osmMtbScale
            seg.osmSacScale = osmSacScale
            seg.osmName = osmName
            seg.osmRef = osmRef
            seg.isInferredFromHighway = isInferredFromHighway
            return seg
        }

        let segLenSum = segments.reduce(0.0) { $0 + max(0.05, $1.endKm - $1.startKm) }
        let actualSegTotalKm = segLenSum > 0 ? segLenSum : totalDistKm

        var rawGravel = 0.0
        var rawSingle = 0.0
        var weightedCrrSum = 0.0

        for s in segments {
            let segLen = max(0.05, s.endKm - s.startKm)
            let pctSpan = (segLen / actualSegTotalKm) * 100.0
            weightedCrrSum += s.effectiveCrr * (segLen / actualSegTotalKm)
            switch s.type {
            case .paved: break
            case .gravel: rawGravel += pctSpan
            case .singletrack: rawSingle += pctSpan
            }
        }

        var singletrackPct = max(0.0, JSCompat.jsRound(rawSingle))
        let gravelPct = max(0.0, JSCompat.jsRound(rawGravel))
        if singletrackPct + gravelPct > 100.0 {
            singletrackPct = max(0.0, 100.0 - gravelPct)
        }
        let pavedPct = max(0.0, 100.0 - gravelPct - singletrackPct)

        let pavedKm = JSCompat.roundTo((pavedPct / 100.0) * totalDistKm, decimals: 1)
        let gravelKm = JSCompat.roundTo((gravelPct / 100.0) * totalDistKm, decimals: 1)
        let singletrackKm = JSCompat.roundTo(max(0.0, totalDistKm - pavedKm - gravelKm), decimals: 1)
        let weightedCrr = JSCompat.roundTo(weightedCrrSum, decimals: 4)

        let sampleCount = profilePoints.isEmpty ? 49 : profilePoints.count
        let pointSurfaces: [SurfaceType] = (0..<sampleCount).map { i in
            let km = !profilePoints.isEmpty
                ? profilePoints[i].distKm
                : (Double(i) / Double(max(1, sampleCount - 1))) * totalDistKm
            let found = segments.first { km >= $0.startKm - 0.05 && km <= $0.endKm + 0.05 } ?? segments.last
            return found?.type ?? .paved
        }

        let activeBike = riderSpecs.bikes.first(where: { $0.id == riderSpecs.activeBikeId }) ?? riderSpecs.bikes.first
        let effectiveCrr = crr ?? activeBike?.crr ?? 0.0055
        let tireWidthMm = SurfaceProfileEngine.inferTireWidthMm(
            crr: effectiveCrr,
            explicitWidthMm: explicitTireWidthMm ?? activeBike?.tireWidthMm
        )
        let isTubeless = explicitTubeless ?? activeBike?.isTubeless ?? true
        let systemMassKg = (riderWeightKg ?? riderSpecs.riderWeightKg) +
            (bikeWeightKg ?? activeBike?.weightKg ?? 10.9) +
            (luggageWeightKg ?? 2.0)

        let unpavedRatio = (gravelPct + singletrackPct) / 100.0
        let tyrePressure = TyrePressureEngine.calculate(TyrePressureInput(
            systemMassKg: systemMassKg,
            tireWidthMm: tireWidthMm,
            isTubeless: isTubeless,
            pavedPct: pavedPct,
            gravelPct: gravelPct,
            singletrackPct: singletrackPct,
            gearWeightKg: luggageWeightKg ?? 2.0,
            bikeCategory: activeBike?.bikeCategory,
            casingType: activeBike?.casingType,
            isHookless: activeBike?.isHookless,
            bikeName: activeBike?.name
        ))

        let recommendedFrontBar = tyrePressure.frontBar
        let recommendedRearBar = tyrePressure.rearBar
        let pressureUnit = riderSpecs.pressureUnit ?? .bar
        let pressureLabelEn = TyrePressureEngine.formatPair(
            frontBar: recommendedFrontBar,
            rearBar: recommendedRearBar,
            unit: pressureUnit,
            lang: .en
        )
        let pressureLabelFr = TyrePressureEngine.formatPair(
            frontBar: recommendedFrontBar,
            rearBar: recommendedRearBar,
            unit: pressureUnit,
            lang: .fr
        )

        let unpavedSegments = segments.filter { $0.type != .paved }
        let technicalSegments = segments.filter { $0.technicality == .technical || $0.suitability38c == "caution" }
        let maxUnpavedStretchKm = unpavedSegments.isEmpty
            ? 0.0
            : JSCompat.roundTo(unpavedSegments.map(\.distanceKm).max() ?? 0.0, decimals: 1)

        var overallLevel: GravelSuitabilityLevel = .ideal
        var scorePct = 95.0

        if tireWidthMm <= 30 && unpavedRatio > 0.15 {
            overallLevel = .technicalCaution
            scorePct = 58
        } else if singletrackPct >= 10 || !technicalSegments.isEmpty {
            overallLevel = (singletrackPct >= 12 || technicalSegments.count >= 3) ? .technicalCaution : .goodWithCare
            scorePct = overallLevel == .technicalCaution ? 76 : 88
        } else {
            overallLevel = .ideal
            scorePct = (unpavedRatio == 0 && tireWidthMm <= 30) ? 98 : 95
        }

        let firstTech = technicalSegments.first ?? unpavedSegments.first
        let techRangeStr = firstTech.map { "km \(formatJSNumber($0.startKm))–\(formatJSNumber($0.endKm))" } ?? ""
        let watchCount = !technicalSegments.isEmpty ? technicalSegments.count : unpavedSegments.count

        let wStr = formatJSNumber(tireWidthMm)
        let pavedStr = formatJSNumber(pavedPct)
        let gravelStr = formatJSNumber(gravelPct)
        let singleStr = formatJSNumber(singletrackPct)
        let gravelKmStr = formatJSNumber(gravelKm)
        let singleKmStr = formatJSNumber(singletrackKm)
        let unpavedTotalStr = formatJSNumber(gravelPct + singletrackPct)
        let smoothTotalStr = formatJSNumber(pavedPct + gravelPct)

        var headlineEn = "Ideal for \(wStr)c Gravel Setup"
        var headlineFr = "Idéal pour montage Gravel \(wStr)c"
        var summaryEn = (gravelPct + singletrackPct == 0)
            ? "100% paved route rolls fast and effortlessly on \(wStr)c tires (\(pressureLabelEn))."
            : "\(pavedStr)% paved and \(gravelStr)% compacted gravel roll smoothly on \(wStr)c tires (\(pressureLabelEn))."
        var summaryFr = (gravelPct + singletrackPct == 0)
            ? "Parcours 100 % bitumé très fluide en pneus \(wStr)c (\(pressureLabelFr))."
            : "\(pavedStr) % de bitume et \(gravelStr) % de chemin compacté passent avec fluidité en pneus \(wStr)c (\(pressureLabelFr))."

        if tireWidthMm <= 30 && unpavedRatio > 0.15 {
            headlineEn = "Caution on \(wStr)c Road Slicks · 38c+ Gravel Tires Advised"
            headlineFr = "Attention en pneus route \(wStr)c · Pneus Gravel 38c+ conseillés"
            summaryEn = "\(unpavedTotalStr)% of this route is unpaved (\(unpavedSegments.count) sectors). Switch to 38c gravel tires for puncture protection and grip."
            summaryFr = "\(unpavedTotalStr) % du parcours est non-revêtu (\(unpavedSegments.count) secteurs). Privilégiez des pneus gravel 38c pour l’adhérence et éviter les crevaisons."
        } else if overallLevel == .goodWithCare {
            headlineEn = "Great for \(wStr)c Gravel · \(watchCount) Trail Sector\(watchCount > 1 ? "s" : "") to Watch (\(techRangeStr))"
            headlineFr = "Adapté au Gravel \(wStr)c · \(watchCount) secteur\(watchCount > 1 ? "s" : "") à surveiller (\(techRangeStr))"
            summaryEn = "Gravel sectors (\(gravelKmStr) km) are confidence-inspiring on \(wStr)c tires. Ease off slightly on natural trail sectors (\(techRangeStr)) for clean line choice."
            summaryFr = "Les secteurs gravel (\(gravelKmStr) km) sont rassurants en \(wStr)c. Réduisez simplement l’allure sur les passages naturels (\(techRangeStr)) pour choisir une belle trace."
        } else if overallLevel == .technicalCaution {
            headlineEn = "Technical Trail Sectors (\(singleStr)%) · Line Care Needed on \(wStr)c"
            headlineFr = "Sentiers techniques (\(singleStr) %) · Vigilance requise en \(wStr)c"
            summaryEn = "While \(smoothTotalStr)% is smoother tarmac & gravel, \(singleKmStr) km (\(techRangeStr)) features uneven trail. Run \(pressureLabelEn) and stay light on the bars."
            summaryFr = "Si \(smoothTotalStr) % du tracé est roulant, \(singleKmStr) km (\(techRangeStr)) empruntent un sentier irrégulier. Gonflez à \(pressureLabelFr) et relâchez les bras."
        }

        var suitability = breakdown.suitability
        suitability.overallLevel = overallLevel
        suitability.scorePct = scorePct
        suitability.tireWidthMm = tireWidthMm
        suitability.isTubeless = isTubeless
        suitability.recommendedFrontBar = recommendedFrontBar
        suitability.recommendedRearBar = recommendedRearBar
        suitability.frontLoadPct = Double(tyrePressure.frontLoadPct)
        suitability.rearLoadPct = Double(tyrePressure.rearLoadPct)
        suitability.hooklessCapped = tyrePressure.hooklessCapped
        suitability.headlineEn = headlineEn
        suitability.headlineFr = headlineFr
        suitability.summaryEn = summaryEn
        suitability.summaryFr = summaryFr
        suitability.unpavedCount = unpavedSegments.count
        suitability.technicalCount = technicalSegments.count
        suitability.maxUnpavedStretchKm = maxUnpavedStretchKm

        breakdown.pavedPct = pavedPct
        breakdown.gravelPct = gravelPct
        breakdown.singletrackPct = singletrackPct
        breakdown.pavedKm = pavedKm
        breakdown.gravelKm = gravelKm
        breakdown.singletrackKm = singletrackKm
        breakdown.weightedCrr = weightedCrr
        breakdown.segments = segments
        breakdown.pointSurfaces = pointSurfaces
        breakdown.suitability = suitability
        breakdown.dataSource = "osm-overpass"
        breakdown.isLoadingOsm = isLoadingOsm
        breakdown.osmCoveragePct = Double(osmCoveragePctInt)
        breakdown.explicitTagPct = Double(explicitTagPctInt)
        breakdown.osmWayCount = osmData.wayCount
        breakdown.osmError = osmError
        breakdown.osmFetchedAt = osmData.fetchedAt
        return breakdown
    }

    // MARK: - Private Actor Helpers

    private nonisolated static func formatJSNumber(_ v: Double) -> String {
        if v == v.rounded() {
            return String(Int(v))
        }
        return String(v)
    }

    private nonisolated static func durationToSeconds(_ d: Duration) -> TimeInterval {
        Double(d.components.seconds) + Double(d.components.attoseconds) / 1e18
    }

    @discardableResult
    private func setMemoryReady(routeKey: String, requestId: UUID, data: OsmSurfaceRouteData) -> Bool {
        guard memoryCache[routeKey]?.activeRequestId == requestId else {
            return false
        }
        memoryCache[routeKey] = CacheStateEntry(status: .ready, data: data, error: nil, activeRequestId: nil)
        return true
    }

    private func setMemoryError(
        routeKey: String,
        requestId: UUID,
        previousData: OsmSurfaceRouteData?,
        message: String
    ) {
        guard memoryCache[routeKey]?.activeRequestId == requestId else { return }
        memoryCache[routeKey] = CacheStateEntry(
            status: previousData != nil ? .ready : .error,
            data: previousData,
            error: message,
            activeRequestId: nil
        )
    }

    private func restorePreviousOrClearOnCancel(
        routeKey: String,
        requestId: UUID,
        previousData: OsmSurfaceRouteData?
    ) {
        guard memoryCache[routeKey]?.activeRequestId == requestId else { return }
        if let previousData {
            memoryCache[routeKey] = CacheStateEntry(
                status: .ready,
                data: previousData,
                error: nil,
                activeRequestId: nil
            )
        } else {
            memoryCache.removeValue(forKey: routeKey)
        }
    }

    private func clearInFlight(routeKey: String, id: UUID) {
        if inFlight[routeKey]?.id == id {
            inFlight.removeValue(forKey: routeKey)
        }
    }
}
