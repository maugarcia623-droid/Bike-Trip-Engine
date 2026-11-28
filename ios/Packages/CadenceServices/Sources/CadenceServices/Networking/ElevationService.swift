import Foundation
import CadenceCore

/// Digital Elevation Model (DEM) profile result returned by `ElevationService`.
public struct DemElevationResult: Codable, Sendable, Equatable {
    public var elevationProfile: [ElevationProfilePoint]
    public var elevationGainM: Int
    public var elevationLossM: Int

    public init(
        elevationProfile: [ElevationProfilePoint],
        elevationGainM: Int,
        elevationLossM: Int
    ) {
        self.elevationProfile = elevationProfile
        self.elevationGainM = elevationGainM
        self.elevationLossM = elevationLossM
    }
}

public typealias ElevationResult = DemElevationResult

/// Protocol enabling dependency injection / mocking of DEM elevation fetching (e.g. in `RoutingService`).
public protocol ElevationFetching: Sendable {
    func fetchDemElevationProfile(
        coordinates: [LatLon],
        totalDistanceKm: Double?,
        timeoutSeconds: TimeInterval
    ) async -> ElevationResult?
}

public extension ElevationFetching {
    func fetchDemElevationProfile(
        coordinates: [LatLon],
        totalDistanceKm: Double? = nil
    ) async -> ElevationResult? {
        await fetchDemElevationProfile(
            coordinates: coordinates,
            totalDistanceKm: totalDistanceKm,
            timeoutSeconds: ElevationService.defaultTimeoutSeconds
        )
    }
}

private struct OpenMeteoElevationResponse: Decodable {
    let elevation: [Double?]?
}

/// Fetches Copernicus / SRTM DEM samples along a route polyline via Open-Meteo `/v1/elevation`.
/// Mirrors `src/services/elevationService.ts` with 3-point weighted moving average smoothing,
/// symmetrical 2.0 m hysteresis, [-25%, 25%] grade clamping, and a 30-entry in-memory LRU cache.
public actor ElevationService: ElevationFetching {
    public static let maxCacheEntries = 30
    public static let maxSamplePoints = 60
    public static let minSamplePoints = 16
    public static let elevationHysteresisMeters = 2.0
    public static let defaultTimeoutSeconds: TimeInterval = 5.0
    public static let defaultBaseURL = URL(string: "https://api.open-meteo.com/v1/elevation")!

    private let urlSession: URLSession
    private let baseURL: URL
    private var memoryCache: [String: DemElevationResult] = [:]
    private var lruKeys: [String] = []

    public init(
        urlSession: URLSession = .shared,
        baseURL: URL = ElevationService.defaultBaseURL
    ) {
        self.urlSession = urlSession
        self.baseURL = baseURL
    }

    public nonisolated static func buildCacheKey(coordinates: [LatLon]) -> String {
        guard !coordinates.isEmpty else { return "0" }
        let first = coordinates[0]
        let mid = coordinates[coordinates.count / 2]
        let last = coordinates[coordinates.count - 1]
        return "\(coordinates.count)_\(JSCompat.jsFixed(first.lat, decimals: 4)),\(JSCompat.jsFixed(first.lon, decimals: 4))_\(JSCompat.jsFixed(mid.lat, decimals: 4)),\(JSCompat.jsFixed(mid.lon, decimals: 4))_\(JSCompat.jsFixed(last.lat, decimals: 4)),\(JSCompat.jsFixed(last.lon, decimals: 4))"
    }

    public func clearCache() {
        memoryCache.removeAll()
        lruKeys.removeAll()
    }

    public func fetchDemElevationProfile(
        coordinates: [LatLon],
        totalDistanceKm: Double? = nil,
        timeoutSeconds: TimeInterval = ElevationService.defaultTimeoutSeconds
    ) async -> ElevationResult? {
        guard coordinates.count >= 2 else { return nil }

        let cacheKey = Self.buildCacheKey(coordinates: coordinates)
        if let cached = readCachedDem(cacheKey) {
            return cached
        }

        let cum = OverpassWaterGapEngine.computeCumulativeDistances(coordinates)
        let rawTotalMeters = cum.last ?? 0.0
        guard rawTotalMeters > 0 else { return nil }

        let rawKm = rawTotalMeters / 1000.0
        let distKm: Double
        if let totalDistanceKm, totalDistanceKm.isFinite, totalDistanceKm > 0 {
            distKm = totalDistanceKm
        } else {
            distKm = rawKm
        }

        let sampleCount = min(
            Self.maxSamplePoints,
            max(Self.minSamplePoints, JSCompat.jsRoundInt(distKm * 1.5))
        )

        let sampled = Self.samplePolylineEvenly(
            coordinates: coordinates,
            cumMeters: cum,
            rawTotalMeters: rawTotalMeters,
            sampleCount: sampleCount,
            targetDistanceKm: distKm
        )
        guard sampled.count >= 3 else { return nil }

        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            return nil
        }
        let latitudes = sampled.map { JSCompat.jsFixed($0.lat, decimals: 5) }.joined(separator: ",")
        let longitudes = sampled.map { JSCompat.jsFixed($0.lon, decimals: 5) }.joined(separator: ",")
        components.queryItems = [
            URLQueryItem(name: "latitude", value: latitudes),
            URLQueryItem(name: "longitude", value: longitudes),
        ]
        guard let url = components.url else { return nil }

        var request = URLRequest(url: url, timeoutInterval: max(0.1, timeoutSeconds))
        request.httpMethod = "GET"

        do {
            let (data, response) = try await urlSession.data(for: request)
            guard let http = response as? HTTPURLResponse,
                  (200...299).contains(http.statusCode) else {
                return nil
            }

            let decoded = try JSONDecoder().decode(OpenMeteoElevationResponse.self, from: data)
            guard let rawElevations = decoded.elevation,
                  rawElevations.count == sampled.count else {
                return nil
            }

            var numericElevations: [Double] = []
            numericElevations.reserveCapacity(rawElevations.count)
            for item in rawElevations {
                guard let value = item, value.isFinite else {
                    return nil
                }
                numericElevations.append(value)
            }

            let result = Self.smoothAndAccumulateDem(
                rawElevations: numericElevations,
                sampled: sampled
            )
            writeCachedDem(cacheKey, result: result)
            return result
        } catch {
            return nil
        }
    }

    // MARK: - Private Helpers

    private func readCachedDem(_ cacheKey: String) -> DemElevationResult? {
        guard let existing = memoryCache[cacheKey] else { return nil }
        if let idx = lruKeys.firstIndex(of: cacheKey) {
            lruKeys.remove(at: idx)
        }
        lruKeys.append(cacheKey)
        return existing
    }

    private func writeCachedDem(_ cacheKey: String, result: DemElevationResult) {
        if let idx = lruKeys.firstIndex(of: cacheKey) {
            lruKeys.remove(at: idx)
        }
        lruKeys.append(cacheKey)
        memoryCache[cacheKey] = result

        while lruKeys.count > Self.maxCacheEntries {
            let oldestKey = lruKeys.removeFirst()
            memoryCache.removeValue(forKey: oldestKey)
        }
    }

    private struct SampledPoint {
        let lat: Double
        let lon: Double
        let distKm: Double
    }

    private nonisolated static func samplePolylineEvenly(
        coordinates: [LatLon],
        cumMeters: [Double],
        rawTotalMeters: Double,
        sampleCount: Int,
        targetDistanceKm: Double?
    ) -> [SampledPoint] {
        guard rawTotalMeters > 0, sampleCount > 0 else { return [] }

        let displayTotalKm: Double
        if let targetDistanceKm, targetDistanceKm.isFinite, targetDistanceKm > 0 {
            displayTotalKm = targetDistanceKm
        } else {
            displayTotalKm = rawTotalMeters / 1000.0
        }

        var sampled: [SampledPoint] = []
        sampled.reserveCapacity(sampleCount)
        var cursor = 0

        for i in 0..<sampleCount {
            let frac = sampleCount > 1 ? Double(i) / Double(sampleCount - 1) : 0.0
            let targetMeters = frac * rawTotalMeters

            while cursor < cumMeters.count - 2 && cumMeters[cursor + 1] < targetMeters {
                cursor += 1
            }

            let d0 = cumMeters[cursor]
            let d1 = (cursor + 1 < cumMeters.count) ? cumMeters[cursor + 1] : d0
            let segLen = d1 - d0
            let t = segLen > 0 ? max(0.0, min(1.0, (targetMeters - d0) / segLen)) : 0.0
            let p0 = coordinates[cursor]
            let p1 = (cursor + 1 < coordinates.count) ? coordinates[cursor + 1] : p0

            sampled.append(SampledPoint(
                lat: p0.lat + (p1.lat - p0.lat) * t,
                lon: p0.lon + (p1.lon - p0.lon) * t,
                distKm: frac * displayTotalKm
            ))
        }

        return sampled
    }

    private nonisolated static func smoothAndAccumulateDem(
        rawElevations: [Double],
        sampled: [SampledPoint]
    ) -> DemElevationResult {
        let count = rawElevations.count
        let smoothed: [Double] = rawElevations.enumerated().map { idx, ele in
            if count < 3 { return ele }
            if idx == 0 {
                return 0.75 * ele + 0.25 * rawElevations[1]
            }
            if idx == count - 1 {
                return 0.75 * ele + 0.25 * rawElevations[idx - 1]
            }
            return 0.25 * rawElevations[idx - 1] + 0.5 * ele + 0.25 * rawElevations[idx + 1]
        }

        // Hysteresis gain accumulation (ignore sub-2m noise ripples)
        var totalGainM = 0.0
        var anchorLow = smoothed[0]
        var extremeHigh = smoothed[0]
        for i in 1..<smoothed.count {
            let e = smoothed[i]
            if e > extremeHigh {
                extremeHigh = e
            } else if extremeHigh - e >= elevationHysteresisMeters {
                let climb = extremeHigh - anchorLow
                if climb >= elevationHysteresisMeters {
                    totalGainM += climb
                }
                anchorLow = e
                extremeHigh = e
            }
            if e < anchorLow {
                anchorLow = e
                extremeHigh = e
            }
        }
        if extremeHigh - anchorLow >= elevationHysteresisMeters {
            totalGainM += extremeHigh - anchorLow
        }

        // Symmetrical hysteresis loss accumulation
        var totalLossM = 0.0
        var anchorHigh = smoothed[0]
        var extremeLow = smoothed[0]
        for i in 1..<smoothed.count {
            let e = smoothed[i]
            if e < extremeLow {
                extremeLow = e
            } else if e - extremeLow >= elevationHysteresisMeters {
                let drop = anchorHigh - extremeLow
                if drop >= elevationHysteresisMeters {
                    totalLossM += drop
                }
                anchorHigh = e
                extremeLow = e
            }
            if e > anchorHigh {
                anchorHigh = e
                extremeLow = e
            }
        }
        if anchorHigh - extremeLow >= elevationHysteresisMeters {
            totalLossM += anchorHigh - extremeLow
        }

        let elevationProfile: [ElevationProfilePoint] = sampled.enumerated().map { i, pt in
            let eleM = JSCompat.jsToFixedNumber(smoothed[i], decimals: 1)
            let distKm = JSCompat.jsToFixedNumber(pt.distKm, decimals: 2)
            var gradePct = 0.0
            if i > 0 {
                let prevDistKm = sampled[i - 1].distKm
                let dMeters = max(25.0, (pt.distKm - prevDistKm) * 1000.0)
                let rawGrade = ((smoothed[i] - smoothed[i - 1]) / dMeters) * 100.0
                let clamped = max(-25.0, min(25.0, rawGrade))
                gradePct = JSCompat.jsToFixedNumber(clamped, decimals: 1)
            }
            return ElevationProfilePoint(distKm: distKm, eleM: eleM, gradePct: gradePct)
        }

        return DemElevationResult(
            elevationProfile: elevationProfile,
            elevationGainM: max(0, JSCompat.jsRoundInt(totalGainM)),
            elevationLossM: max(0, JSCompat.jsRoundInt(totalLossM))
        )
    }
}
