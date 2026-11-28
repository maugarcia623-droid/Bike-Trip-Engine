import Foundation
import CadenceCore

public enum OverpassServiceError: Error, Sendable, Equatable {
    case invalidEndpoint
    case httpError(endpoint: String, statusCode: Int)
    case timeout(endpoint: String)
    case malformedResponse(endpoint: String, detail: String)
    case allMirrorsFailed(lastErrorDescription: String)
}

public struct OverpassElementCoordinate: Decodable, Sendable, Equatable {
    public let lat: Double
    public let lon: Double

    public init(lat: Double, lon: Double) {
        self.lat = lat
        self.lon = lon
    }
}

public struct OverpassRawElement: Decodable, Sendable, Equatable {
    public let type: String?
    public let id: Int64
    public let lat: Double?
    public let lon: Double?
    public let center: OverpassElementCoordinate?
    public let tags: [String: String]?

    public init(
        type: String? = "node",
        id: Int64,
        lat: Double? = nil,
        lon: Double? = nil,
        center: OverpassElementCoordinate? = nil,
        tags: [String: String]? = nil
    ) {
        self.type = type
        self.id = id
        self.lat = lat
        self.lon = lon
        self.center = center
        self.tags = tags
    }
}

public struct OverpassQueryResponse: Decodable, Sendable, Equatable {
    public let elements: [OverpassRawElement]?

    public init(elements: [OverpassRawElement]? = nil) {
        self.elements = elements
    }
}

/// Overpass corridor POI scanner & 4-mirror failover actor mirroring `src/services/overpassCorridor.ts`.
public actor OverpassCorridorService {
    public static let defaultEndpoints: [URL] = [
        URL(string: "https://ovp.dresel.systems/api/interpreter")!,
        URL(string: "https://overpass-api.de/api/interpreter")!,
        URL(string: "https://overpass.kumi.systems/api/interpreter")!,
        URL(string: "https://lz4.overpass-api.de/api/interpreter")!,
    ]

    public static let maxMemoryCacheEntries = 25
    public static let corridorCacheTTLSeconds: TimeInterval = 21_600 // 6 hours
    public static let chunkThresholdKm = 28.0
    public static let chunkDistanceMeters = 25_000.0
    public static let defaultTimeoutSeconds: TimeInterval = 10.0
    public static let secondaryMirrorTimeoutCapSeconds: TimeInterval = 6.0
    public static let chunkBatchConcurrency = 2

    private static let rfc3986Unreserved = CharacterSet(
        charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
    )

    private let urlSession: URLSession
    private let endpoints: [URL]
    private let store: CadenceStore?
    private let timeoutSeconds: TimeInterval
    private let secondaryMirrorTimeoutCapSeconds: TimeInterval
    private let nowProvider: @Sendable () -> Date

    private var scanCache: [String: [StageAmenity]] = [:]
    private var scanCacheOrder: [String] = []
    private var inFlightScans: [String: (id: UUID, flight: CoalescedFlight<[StageAmenity]>)] = [:]
    private var latestRequestIdByCacheKey: [String: UUID] = [:]
    private var cacheWriteVersion: [String: UInt64] = [:]
    private var cacheEpoch: UInt64 = 0

    public init(
        urlSession: URLSession = .shared,
        endpoints: [URL] = OverpassCorridorService.defaultEndpoints,
        store: CadenceStore? = nil,
        timeoutSeconds: TimeInterval = OverpassCorridorService.defaultTimeoutSeconds,
        secondaryMirrorTimeoutCapSeconds: TimeInterval = OverpassCorridorService.secondaryMirrorTimeoutCapSeconds,
        nowProvider: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.urlSession = urlSession
        self.endpoints = endpoints
        self.store = store
        self.timeoutSeconds = timeoutSeconds
        self.secondaryMirrorTimeoutCapSeconds = secondaryMirrorTimeoutCapSeconds
        self.nowProvider = nowProvider
    }

    // MARK: - Pure Static Helpers

    public nonisolated static func formEncodeDataBody(query: String) -> Data {
        let encoded = query.addingPercentEncoding(withAllowedCharacters: rfc3986Unreserved) ?? query
        return Data("data=\(encoded)".utf8)
    }

    public nonisolated static func samplePolylineSpine(
        coordinates: [LatLon],
        intervalMeters: Double = 6_000.0
    ) -> (sampledCoords: [LatLon], cumDistancesMeters: [Double]) {
        let cumDistancesMeters = OverpassWaterGapEngine.computeCumulativeDistances(coordinates)
        if coordinates.count <= 2 {
            return (coordinates, cumDistancesMeters)
        }

        var sampledCoords: [LatLon] = [coordinates[0]]
        var nextThreshold = intervalMeters

        for i in 1..<(coordinates.count - 1) {
            if cumDistancesMeters[i] >= nextThreshold {
                sampledCoords.append(coordinates[i])
                nextThreshold += intervalMeters
            }
        }

        if let last = coordinates.last, let lastSampled = sampledCoords.last {
            if lastSampled.lat != last.lat || lastSampled.lon != last.lon {
                sampledCoords.append(last)
            }
        }

        return (sampledCoords, cumDistancesMeters)
    }

    public nonisolated static func buildOverpassQuery(coordinates: [LatLon]) -> String {
        guard !coordinates.isEmpty else { return "" }

        var minLat = 90.0
        var maxLat = -90.0
        var minLon = 180.0
        var maxLon = -180.0

        for pt in coordinates {
            if pt.lat < minLat { minLat = pt.lat }
            if pt.lat > maxLat { maxLat = pt.lat }
            if pt.lon < minLon { minLon = pt.lon }
            if pt.lon > maxLon { maxLon = pt.lon }
        }

        // 1800m spatial buffer (~0.018 deg lat, ~0.025 deg lon)
        let padLat = 0.018
        let padLon = 0.025
        let south = JSCompat.jsFixed(minLat - padLat, decimals: 4)
        let west = JSCompat.jsFixed(minLon - padLon, decimals: 4)
        let north = JSCompat.jsFixed(maxLat + padLat, decimals: 4)
        let east = JSCompat.jsFixed(maxLon + padLon, decimals: 4)

        return """
        [out:json][timeout:15][bbox:\(south),\(west),\(north),\(east)];
        (
          node["amenity"~"^(drinking_water|toilets|fuel|pharmacy|cafe|bicycle_repair_station|shelter)$"];
          node["man_made"="water_tap"];
          node["natural"="spring"];
          nwr["landuse"="cemetery"];
          node["amenity"="grave_yard"];
          node["shop"~"^(bakery|supermarket|convenience|bicycle)$"];
          node["tourism"~"^(camp_site|alpine_hut)$"];
          node["railway"~"^(station|halt)$"];
        );
        out center qt 400;
        """
    }

    public nonisolated static func chunkPolylineForOverpass(
        coordinates: [LatLon],
        cumDistancesMeters: [Double],
        chunkDistanceMeters: Double = OverpassCorridorService.chunkDistanceMeters
    ) -> [[LatLon]] {
        guard coordinates.count >= 2 else { return [coordinates] }
        let resolvedCumDistances = cumDistancesMeters.count >= coordinates.count
            ? cumDistancesMeters
            : OverpassWaterGapEngine.computeCumulativeDistances(coordinates)
        let totalMeters = resolvedCumDistances[coordinates.count - 1]
        if totalMeters <= chunkDistanceMeters {
            return [coordinates]
        }

        var chunks: [[LatLon]] = []
        var startIdx = 0
        var nextBoundaryM = chunkDistanceMeters

        for i in 1..<coordinates.count {
            if resolvedCumDistances[i] >= nextBoundaryM || i == coordinates.count - 1 {
                let slice = Array(coordinates[startIdx...i])
                if slice.count >= 2 {
                    chunks.append(slice)
                }
                startIdx = i
                nextBoundaryM = resolvedCumDistances[i] + chunkDistanceMeters
            }
        }

        return chunks.isEmpty ? [coordinates] : chunks
    }

    public nonisolated static func parseOsmAmenity(
        element: OverpassRawElement,
        coordinates: [LatLon],
        cumDistancesMeters: [Double],
        elevationProfile: [ElevationProfilePoint]? = nil,
        lang: CadenceLang = .en
    ) -> StageAmenity? {
        let isFr = lang == .fr
        guard let lat = element.lat ?? element.center?.lat,
              let lon = element.lon ?? element.center?.lon,
              lat.isFinite, lon.isFinite else {
            return nil
        }

        let tags = element.tags ?? [:]
        let amenityTag = tags["amenity"]
        let manMadeTag = tags["man_made"]
        let naturalTag = tags["natural"]
        let landuseTag = tags["landuse"]
        let shopTag = tags["shop"]
        let tourismTag = tags["tourism"]
        let railwayTag = tags["railway"]

        let category: AmenityCategory
        let subType: String
        let fallbackName: String

        if amenityTag == "drinking_water" || manMadeTag == "water_tap" || naturalTag == "spring" {
            category = .water
            if naturalTag == "spring" {
                subType = "spring"
                fallbackName = isFr ? "Source naturelle" : "Natural Spring"
            } else if manMadeTag == "water_tap" {
                subType = "water_tap"
                fallbackName = isFr ? "Point d'eau / Borne" : "Public Water Tap"
            } else {
                subType = "drinking_water"
                fallbackName = isFr ? "Fontaine d'eau potable" : "Drinking Water Fountain"
            }
        } else if landuseTag == "cemetery" || amenityTag == "grave_yard" {
            category = .cemetery
            subType = landuseTag == "cemetery" ? "cemetery" : "grave_yard"
            fallbackName = isFr ? "Cimetière (Point d'eau garanti)" : "Cemetery (Water Spigot)"
        } else if shopTag == "bakery" || shopTag == "supermarket" || shopTag == "convenience" ||
            amenityTag == "cafe" || amenityTag == "restaurant" || amenityTag == "pub" {
            category = .food
            subType = shopTag ?? amenityTag ?? ""
            if subType == "bakery" {
                fallbackName = isFr ? "Boulangerie artisanale" : "Bakery"
            } else if subType == "cafe" {
                fallbackName = isFr ? "Café / Étape" : "Café / Bistro"
            } else if subType == "restaurant" || subType == "pub" {
                fallbackName = isFr ? "Auberge / Restaurant" : "Village Inn / Restaurant"
            } else {
                fallbackName = isFr ? "Alimentation / Épicerie" : "Supermarket / Grocery"
            }
        } else if shopTag == "bicycle" || amenityTag == "bicycle_repair_station" ||
            amenityTag == "shelter" || tourismTag == "camp_site" || tourismTag == "alpine_hut" {
            category = .mechanix
            subType = shopTag ?? amenityTag ?? tourismTag ?? ""
            if subType == "bicycle" {
                fallbackName = isFr ? "Magasin & Atelier vélo" : "Bicycle Shop"
            } else if subType == "bicycle_repair_station" {
                fallbackName = isFr ? "Station gonflage & outils" : "Bike Repair Station"
            } else if subType == "camp_site" || subType == "alpine_hut" {
                fallbackName = isFr ? "Bivouac / Refuge" : "Campsite / Refuge"
            } else {
                fallbackName = isFr ? "Abri & Refuge" : "Trail Shelter"
            }
        } else if amenityTag == "toilets" || amenityTag == "fuel" || amenityTag == "pharmacy" {
            category = .essentials
            subType = amenityTag ?? ""
            if subType == "toilets" {
                fallbackName = isFr ? "Toilettes publiques" : "Public Toilets"
            } else if subType == "fuel" {
                fallbackName = isFr ? "Station-service / Boutique" : "Petrol Station"
            } else {
                fallbackName = isFr ? "Pharmacie" : "Pharmacy"
            }
        } else if railwayTag == "station" || railwayTag == "halt" {
            category = .bailout
            subType = railwayTag ?? ""
            fallbackName = isFr ? "Gare / Halte (Repli)" : "Train Station (Bailout)"
        } else {
            return nil
        }

        let snapped = OverpassWaterGapEngine.snapToPolyline(
            lat: lat,
            lon: lon,
            coordinates: coordinates,
            cumDistancesMeters: cumDistancesMeters,
            elevationProfile: elevationProfile
        )

        let maxDetour = category == .bailout ? 1600 : 1200
        if snapped.detourMeters > maxDetour {
            return nil
        }

        let trimmedName = tags["name"]?.trimmingCharacters(in: .whitespacesAndNewlines)
        let resolvedName = (trimmedName?.isEmpty == false) ? trimmedName! : fallbackName
        let trimmedHours = tags["opening_hours"]?.trimmingCharacters(in: .whitespacesAndNewlines)
        let openingHours = (trimmedHours?.isEmpty == false) ? trimmedHours : nil

        let elementType = (element.type?.isEmpty == false) ? element.type! : "node"
        return StageAmenity(
            id: "\(elementType)/\(element.id)",
            category: category,
            subType: subType,
            name: resolvedName,
            lat: lat,
            lon: lon,
            routeKm: snapped.routeKm,
            detourMeters: Double(snapped.detourMeters),
            elevationMeters: snapped.elevationMeters.map(Double.init),
            openingHours: openingHours,
            isPinned: false
        )
    }

    public nonisolated static func deduplicateAmenities(_ amenities: [StageAmenity]) -> [StageAmenity] {
        var result: [StageAmenity] = []

        for item in amenities {
            if let duplicateIdx = result.firstIndex(where: { existing in
                existing.category == item.category &&
                OverpassWaterGapEngine.haversineDistanceMeters(
                    lat1: existing.lat,
                    lon1: existing.lon,
                    lat2: item.lat,
                    lon2: item.lon
                ) < 40.0
            }) {
                if item.detourMeters < result[duplicateIdx].detourMeters {
                    result[duplicateIdx] = item
                }
            } else {
                result.append(item)
            }
        }

        return result.sorted { $0.routeKm < $1.routeKm }
    }

    // MARK: - Shared 4-Mirror Overpass Failover

    public nonisolated static func fetchOverpassWithFailover<T: Decodable & Sendable>(
        query: String,
        timeoutSeconds: TimeInterval = OverpassCorridorService.defaultTimeoutSeconds,
        secondaryTimeoutCapSeconds: TimeInterval = OverpassCorridorService.secondaryMirrorTimeoutCapSeconds,
        urlSession: URLSession,
        endpoints: [URL] = OverpassCorridorService.defaultEndpoints,
        as type: T.Type = T.self
    ) async throws -> T {
        try Task.checkCancellation()
        guard !endpoints.isEmpty else {
            throw OverpassServiceError.invalidEndpoint
        }

        let bodyData = formEncodeDataBody(query: query)
        var lastError: Error?

        for (index, endpoint) in endpoints.enumerated() {
            try Task.checkCancellation()

            let perMirrorTimeout = index == 0 ? timeoutSeconds : min(timeoutSeconds, secondaryTimeoutCapSeconds)
            let clampedSeconds = max(0.005, perMirrorTimeout)
            let timeoutDuration: Duration = .nanoseconds(Int64(clampedSeconds * 1_000_000_000))

            var request = URLRequest(url: endpoint, timeoutInterval: max(0.1, clampedSeconds))
            request.httpMethod = "POST"
            request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
            request.httpBody = bodyData
            let finalRequest = request
            let endpointString = endpoint.absoluteString

            do {
                let result: T = try await withThrowingTaskGroup(of: T.self) { group in
                    group.addTask {
                        let (data, response) = try await urlSession.data(for: finalRequest)
                        try Task.checkCancellation()
                        guard let http = response as? HTTPURLResponse else {
                            throw OverpassServiceError.malformedResponse(
                                endpoint: endpointString,
                                detail: "Missing HTTPURLResponse"
                            )
                        }
                        guard (200...299).contains(http.statusCode) else {
                            throw OverpassServiceError.httpError(
                                endpoint: endpointString,
                                statusCode: http.statusCode
                            )
                        }
                        do {
                            return try JSONDecoder().decode(T.self, from: data)
                        } catch {
                            throw OverpassServiceError.malformedResponse(
                                endpoint: endpointString,
                                detail: error.localizedDescription
                            )
                        }
                    }

                    group.addTask {
                        try await Task.sleep(for: timeoutDuration)
                        throw OverpassServiceError.timeout(endpoint: endpointString)
                    }

                    guard let first = try await group.next() else {
                        throw OverpassServiceError.timeout(endpoint: endpointString)
                    }
                    group.cancelAll()
                    return first
                }

                try Task.checkCancellation()
                return result
            } catch is CancellationError {
                if Task.isCancelled {
                    throw CancellationError()
                }
                lastError = OverpassServiceError.timeout(endpoint: endpointString)
            } catch {
                if Task.isCancelled {
                    throw CancellationError()
                }
                lastError = error
            }
        }

        if let lastError {
            throw lastError
        }
        throw OverpassServiceError.allMirrorsFailed(
            lastErrorDescription: "All Overpass API mirrors failed or timed out."
        )
    }

    public func fetchOverpassWithFailover<T: Decodable & Sendable>(
        query: String,
        timeoutSeconds: TimeInterval? = nil,
        as type: T.Type = T.self
    ) async throws -> T {
        try await Self.fetchOverpassWithFailover(
            query: query,
            timeoutSeconds: timeoutSeconds ?? self.timeoutSeconds,
            secondaryTimeoutCapSeconds: self.secondaryMirrorTimeoutCapSeconds,
            urlSession: self.urlSession,
            endpoints: self.endpoints,
            as: type
        )
    }

    public func fetchOverpassWithFailover(
        query: String,
        timeoutSeconds: TimeInterval? = nil
    ) async throws -> OverpassQueryResponse {
        try await fetchOverpassWithFailover(
            query: query,
            timeoutSeconds: timeoutSeconds,
            as: OverpassQueryResponse.self
        )
    }

    // MARK: - Corridor Scan & Caching

    public func scanCorridorAmenities(
        coordinates: [LatLon],
        totalDistanceKm: Double? = nil,
        stageId: String? = nil,
        elevationProfile: [ElevationProfilePoint]? = nil,
        lang: CadenceLang = .en,
        forceFresh: Bool = false
    ) async throws -> [StageAmenity] {
        try Task.checkCancellation()
        guard coordinates.count >= 2 else {
            return []
        }

        let cacheKey = RouteCacheKey.routeHashKey(
            coordinates: coordinates,
            stageId: stageId,
            totalDistanceKm: totalDistanceKm
        )
        let inflightKey = "\(cacheKey):\(lang.rawValue)"

        while true {
            try Task.checkCancellation()

            if !forceFresh {
                if let memCached = readMemoryCache(key: cacheKey), !memCached.isEmpty {
                    return memCached
                }
                let epochBeforeStoreRead = cacheEpoch
                let latestBeforeStoreRead = latestRequestIdByCacheKey[cacheKey]
                let writeVersionBeforeStoreRead = cacheWriteVersion[cacheKey, default: 0]
                if let store,
                   let stored = try? await store.fetchCachedCorridorScan(
                       cacheKey: cacheKey,
                       now: nowProvider(),
                       allowExpired: false
                   ),
                   !stored.isEmpty {
                    if cacheEpoch == epochBeforeStoreRead,
                       latestRequestIdByCacheKey[cacheKey] == latestBeforeStoreRead,
                       cacheWriteVersion[cacheKey, default: 0] == writeVersionBeforeStoreRead {
                        setMemoryScanCache(key: cacheKey, results: stored)
                        return stored
                    }
                    if (cacheEpoch != epochBeforeStoreRead ||
                        cacheWriteVersion[cacheKey, default: 0] != writeVersionBeforeStoreRead),
                       let newerMem = readMemoryCache(key: cacheKey),
                       !newerMem.isEmpty {
                        return newerMem
                    }
                    return stored
                }
                try Task.checkCancellation()
            }

            if !forceFresh, let existing = inFlightScans[inflightKey] {
                if let waiterID = existing.flight.tryReserveWaiter() {
                    switch try await existing.flight.awaitResult(waiterID: waiterID) {
                    case .value(let amenities):
                        return amenities
                    case .abortedByCancellation:
                        clearInFlight(key: inflightKey, id: existing.id)
                        continue
                    }
                } else {
                    clearInFlight(key: inflightKey, id: existing.id)
                }
            }

            let requestId = UUID()
            let session = self.urlSession
            let endpoints = self.endpoints
            let storeRef = self.store
            let timeout = self.timeoutSeconds
            let secondaryCap = self.secondaryMirrorTimeoutCapSeconds
            let nowFn = self.nowProvider

            let flight = CoalescedFlight<[StageAmenity]>(onCancelFlight: { [weak self] in
                Task { await self?.clearInFlight(key: inflightKey, id: requestId) }
            })
            guard let initialWaiterID = flight.tryReserveWaiter() else {
                continue
            }
            inFlightScans[inflightKey] = (id: requestId, flight: flight)
            latestRequestIdByCacheKey[cacheKey] = requestId

            flight.start { [weak self] in
                let cumDistancesMeters = OverpassWaterGapEngine.computeCumulativeDistances(coordinates)

                do {
                    let rawElements = try await Self.fetchOverpassElementsForRoute(
                        coordinates: coordinates,
                        cumDistancesMeters: cumDistancesMeters,
                        totalDistanceKm: totalDistanceKm,
                        urlSession: session,
                        endpoints: endpoints,
                        timeoutSeconds: timeout,
                        secondaryTimeoutCapSeconds: secondaryCap
                    )

                    try Task.checkCancellation()

                    var parsedAmenities: [StageAmenity] = []
                    for el in rawElements {
                        if let parsed = Self.parseOsmAmenity(
                            element: el,
                            coordinates: coordinates,
                            cumDistancesMeters: cumDistancesMeters,
                            elevationProfile: elevationProfile,
                            lang: lang
                        ) {
                            parsedAmenities.append(parsed)
                        }
                    }

                    let cleanAmenities = Self.deduplicateAmenities(parsedAmenities)
                    let computedKm = (cumDistancesMeters.last ?? 0.0) / 1000.0
                    let resolvedDistanceKm = (totalDistanceKm ?? 0) > 0 ? totalDistanceKm! : computedKm
                    let resolvedStageId = (stageId?.isEmpty == false) ? stageId! : "s"

                    await self?.storeScanResults(
                        key: cacheKey,
                        results: cleanAmenities,
                        stageId: resolvedStageId,
                        distanceKm: resolvedDistanceKm,
                        requestId: requestId
                    )
                    await self?.clearInFlight(key: inflightKey, id: requestId)
                    return cleanAmenities
                } catch is CancellationError {
                    await self?.clearInFlight(key: inflightKey, id: requestId)
                    throw CancellationError()
                } catch {
                    if Task.isCancelled {
                        await self?.clearInFlight(key: inflightKey, id: requestId)
                        throw CancellationError()
                    }
                    if let storeRef,
                       let fallback = try? await storeRef.fetchCachedCorridorScan(
                           cacheKey: cacheKey,
                           now: nowFn(),
                           allowExpired: true
                       ),
                       !fallback.isEmpty {
                        await self?.promoteMemoryScanCache(key: cacheKey, results: fallback, requestId: requestId)
                        await self?.clearInFlight(key: inflightKey, id: requestId)
                        return fallback
                    }
                    await self?.clearInFlight(key: inflightKey, id: requestId)
                    throw error
                }
            }

            switch try await flight.awaitResult(waiterID: initialWaiterID) {
            case .value(let amenities):
                return amenities
            case .abortedByCancellation:
                clearInFlight(key: inflightKey, id: requestId)
                continue
            }
        }
    }

    public func getCachedScan(key: String) async -> [StageAmenity]? {
        if let mem = readMemoryCache(key: key) {
            return mem
        }
        let epochBeforeStoreRead = cacheEpoch
        let latestBeforeStoreRead = latestRequestIdByCacheKey[key]
        let writeVersionBeforeStoreRead = cacheWriteVersion[key, default: 0]
        if let store,
           let stored = try? await store.fetchCachedCorridorScan(
               cacheKey: key,
               now: nowProvider(),
               allowExpired: false
           ) {
            if cacheEpoch == epochBeforeStoreRead,
               latestRequestIdByCacheKey[key] == latestBeforeStoreRead,
               cacheWriteVersion[key, default: 0] == writeVersionBeforeStoreRead {
                setMemoryScanCache(key: key, results: stored)
                return stored
            }
            if (cacheEpoch != epochBeforeStoreRead ||
                cacheWriteVersion[key, default: 0] != writeVersionBeforeStoreRead),
               let newerMem = readMemoryCache(key: key) {
                return newerMem
            }
            return stored
        }
        return nil
    }

    public func setCachedScan(
        key: String,
        results: [StageAmenity],
        stageId: String = "s",
        distanceKm: Double = 0,
        pinOffline: Bool = false
    ) async {
        latestRequestIdByCacheKey.removeValue(forKey: key)
        cacheWriteVersion[key, default: 0] &+= 1
        setMemoryScanCache(key: key, results: results)
        if let store {
            try? await store.saveCachedCorridorScan(
                cacheKey: key,
                stageId: stageId,
                distanceKm: distanceKm,
                amenities: results,
                ttlSeconds: Self.corridorCacheTTLSeconds,
                pinOffline: pinOffline,
                now: nowProvider()
            )
        }
    }

    public func clearCachedScan() {
        cacheEpoch &+= 1
        scanCache.removeAll()
        scanCacheOrder.removeAll()
        latestRequestIdByCacheKey.removeAll()
        cacheWriteVersion.removeAll()
    }

    // MARK: - Private Helpers

    private nonisolated static func fetchOverpassElementsForRoute(
        coordinates: [LatLon],
        cumDistancesMeters: [Double],
        totalDistanceKm: Double?,
        urlSession: URLSession,
        endpoints: [URL],
        timeoutSeconds: TimeInterval,
        secondaryTimeoutCapSeconds: TimeInterval
    ) async throws -> [OverpassRawElement] {
        let computedKm = (cumDistancesMeters.last ?? 0.0) / 1000.0
        let effectiveKm = (totalDistanceKm ?? 0) > 0 ? totalDistanceKm! : computedKm

        if effectiveKm <= chunkThresholdKm {
            let query = buildOverpassQuery(coordinates: coordinates)
            let response: OverpassQueryResponse = try await fetchOverpassWithFailover(
                query: query,
                timeoutSeconds: timeoutSeconds,
                secondaryTimeoutCapSeconds: secondaryTimeoutCapSeconds,
                urlSession: urlSession,
                endpoints: endpoints,
                as: OverpassQueryResponse.self
            )
            return response.elements ?? []
        }

        let chunks = chunkPolylineForOverpass(
            coordinates: coordinates,
            cumDistancesMeters: cumDistancesMeters,
            chunkDistanceMeters: chunkDistanceMeters
        )

        var allElements: [OverpassRawElement] = []
        var seenOsmKeys: Set<String> = []
        var anySuccess = false
        var lastError: Error?

        var batchStart = 0
        while batchStart < chunks.count {
            try Task.checkCancellation()
            let batchEnd = min(chunks.count, batchStart + chunkBatchConcurrency)
            let batch = Array(chunks[batchStart..<batchEnd])

            let batchOutcomes: [Result<[OverpassRawElement], Error>] = await withTaskGroup(
                of: (Int, Result<[OverpassRawElement], Error>).self
            ) { group in
                for (offset, chunk) in batch.enumerated() {
                    let query = buildOverpassQuery(coordinates: chunk)
                    group.addTask {
                        do {
                            let response: OverpassQueryResponse = try await fetchOverpassWithFailover(
                                query: query,
                                timeoutSeconds: timeoutSeconds,
                                secondaryTimeoutCapSeconds: secondaryTimeoutCapSeconds,
                                urlSession: urlSession,
                                endpoints: endpoints,
                                as: OverpassQueryResponse.self
                            )
                            return (offset, .success(response.elements ?? []))
                        } catch {
                            return (offset, .failure(error))
                        }
                    }
                }

                var ordered = Array<Result<[OverpassRawElement], Error>?>(repeating: nil, count: batch.count)
                for await (offset, outcome) in group {
                    ordered[offset] = outcome
                }
                return ordered.compactMap { $0 }
            }

            if Task.isCancelled {
                throw CancellationError()
            }

            for outcome in batchOutcomes {
                switch outcome {
                case .success(let elements):
                    anySuccess = true
                    for el in elements {
                        let typeKey = (el.type?.isEmpty == false) ? el.type! : "node"
                        let osmKey = "\(typeKey)/\(el.id)"
                        if seenOsmKeys.insert(osmKey).inserted {
                            allElements.append(el)
                        }
                    }
                case .failure(let error):
                    if error is CancellationError {
                        throw CancellationError()
                    }
                    lastError = error
                }
            }

            batchStart = batchEnd
        }

        if !anySuccess, let lastError {
            throw lastError
        }

        return allElements
    }

    private func readMemoryCache(key: String) -> [StageAmenity]? {
        guard let cached = scanCache[key] else { return nil }
        scanCacheOrder.removeAll { $0 == key }
        scanCacheOrder.append(key)
        return cached
    }

    private func setMemoryScanCache(key: String, results: [StageAmenity]) {
        if scanCache[key] != nil {
            scanCacheOrder.removeAll { $0 == key }
        } else if scanCache.count >= Self.maxMemoryCacheEntries {
            while scanCacheOrder.count >= Self.maxMemoryCacheEntries {
                let oldest = scanCacheOrder.removeFirst()
                scanCache.removeValue(forKey: oldest)
            }
        }
        scanCacheOrder.append(key)
        scanCache[key] = results
    }

    private func promoteMemoryScanCache(key: String, results: [StageAmenity], requestId: UUID) {
        guard latestRequestIdByCacheKey[key] == requestId else { return }
        cacheWriteVersion[key, default: 0] &+= 1
        setMemoryScanCache(key: key, results: results)
    }

    private func storeScanResults(
        key: String,
        results: [StageAmenity],
        stageId: String,
        distanceKm: Double,
        requestId: UUID
    ) async {
        guard latestRequestIdByCacheKey[key] == requestId else { return }
        cacheWriteVersion[key, default: 0] &+= 1
        setMemoryScanCache(key: key, results: results)
        if let store {
            try? await store.saveCachedCorridorScan(
                cacheKey: key,
                stageId: stageId,
                distanceKm: distanceKm,
                amenities: results,
                ttlSeconds: Self.corridorCacheTTLSeconds,
                pinOffline: false,
                now: nowProvider()
            )
        }
    }

    private func clearInFlight(key: String, id: UUID) {
        if inFlightScans[key]?.id == id {
            inFlightScans.removeValue(forKey: key)
        }
    }
}

/// Thread-safe coalesced in-flight request supporting multiple concurrent awaiters
/// while propagating caller cancellation immediately and cancelling the underlying
/// task when all awaiters cancel.
final class CoalescedFlight<Value: Sendable>: @unchecked Sendable {
    enum JoinResult: Sendable {
        case value(Value)
        case abortedByCancellation
    }

    private let lock = NSLock()
    private var outcome: Result<Value, Error>?
    private var waiters: [UUID: CheckedContinuation<JoinResult, Error>] = [:]
    private var pendingWaiters: Set<UUID> = []
    private var cancelledWaiters: Set<UUID> = []
    private var task: Task<Void, Never>?
    private let onCancelFlight: @Sendable () -> Void

    init(onCancelFlight: @escaping @Sendable () -> Void = {}) {
        self.onCancelFlight = onCancelFlight
    }

    func tryReserveWaiter() -> UUID? {
        lock.withLock {
            if case .failure(let err) = outcome, err is CancellationError {
                return nil
            }
            let waiterID = UUID()
            pendingWaiters.insert(waiterID)
            return waiterID
        }
    }

    func start(_ operation: @escaping @Sendable () async throws -> Value) {
        let newTask = Task<Void, Never> { [weak self] in
            let result: Result<Value, Error>
            do {
                let value = try await operation()
                result = .success(value)
            } catch {
                result = .failure(error)
            }
            self?.finish(with: result)
        }
        let shouldCancelImmediately = lock.withLock { () -> Bool in
            if outcome != nil {
                return true
            }
            self.task = newTask
            return false
        }
        if shouldCancelImmediately {
            newTask.cancel()
        }
    }

    private func finish(with result: Result<Value, Error>) {
        let pendingContinuations: [CheckedContinuation<JoinResult, Error>] = lock.withLock {
            guard outcome == nil else { return [] }
            outcome = result
            let list = Array(waiters.values)
            waiters.removeAll()
            pendingWaiters.removeAll()
            return list
        }
        let mapped: Result<JoinResult, Error> = result.map { .value($0) }
        for cont in pendingContinuations {
            cont.resume(with: mapped)
        }
    }

    func awaitResult(waiterID: UUID) async throws -> JoinResult {
        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { continuation in
                var taskToCancel: Task<Void, Never>?
                var notifyCancel = false
                let immediateResult: Result<JoinResult, Error>? = lock.withLock {
                    pendingWaiters.remove(waiterID)
                    if let existingOutcome = outcome {
                        if case .failure(let err) = existingOutcome,
                           err is CancellationError,
                           !Task.isCancelled {
                            return .success(.abortedByCancellation)
                        }
                        return existingOutcome.map { .value($0) }
                    }
                    if cancelledWaiters.remove(waiterID) != nil || Task.isCancelled {
                        if waiters.isEmpty && pendingWaiters.isEmpty {
                            outcome = .failure(CancellationError())
                            taskToCancel = self.task
                            notifyCancel = true
                        }
                        return .failure(CancellationError())
                    }
                    waiters[waiterID] = continuation
                    return nil
                }
                if let immediateResult {
                    continuation.resume(with: immediateResult)
                }
                taskToCancel?.cancel()
                if notifyCancel {
                    onCancelFlight()
                }
            }
        } onCancel: {
            let (contToCancel, taskToCancel, shouldNotify): (CheckedContinuation<JoinResult, Error>?, Task<Void, Never>?, Bool) = lock.withLock {
                if outcome != nil {
                    return (nil, nil, false)
                }
                if let cont = waiters.removeValue(forKey: waiterID) {
                    if waiters.isEmpty && pendingWaiters.isEmpty {
                        outcome = .failure(CancellationError())
                        return (cont, self.task, true)
                    }
                    return (cont, nil, false)
                }
                if pendingWaiters.remove(waiterID) != nil {
                    cancelledWaiters.insert(waiterID)
                    if waiters.isEmpty && pendingWaiters.isEmpty {
                        outcome = .failure(CancellationError())
                        return (nil, self.task, true)
                    }
                }
                return (nil, nil, false)
            }
            contToCancel?.resume(throwing: CancellationError())
            taskToCancel?.cancel()
            if shouldNotify {
                onCancelFlight()
            }
        }
    }
}
