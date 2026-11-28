import Foundation
import CadenceCore

private struct BatchHourlyPointData: Decodable, Sendable {
    let time: [String]
    let temperature_2m: [Double?]?
    let relative_humidity_2m: [Double?]?
    let surface_pressure: [Double?]?
    let wind_speed_10m: [Double?]?
    let wind_direction_10m: [Double?]?
    let wind_gusts_10m: [Double?]?
    let precipitation_probability: [Double?]?
    let visibility: [Double?]?
    let is_day: [Int?]?
    let weather_code: [Int?]?
}

private struct OpenMeteoBatchPointResponse: Decodable, Sendable {
    let hourly: BatchHourlyPointData?
}

private struct RawSectorGeom: Sendable {
    var index: Int
    var startKm: Double
    var endKm: Double
    var distanceKm: Double
    var lat: Double
    var lon: Double
    var bearingDeg: Double
    var gradePct: Double
}

/// Samples Open-Meteo hourly forecasts along 4–8 route sectors, evaluates per-sector cycling
/// physics (watts, moving time, carbs, wind-chill), and compares forward vs. reverse direction
/// on loop routes (`clockwise` / `anticlockwise` / `out-and-back`).
/// Mirrors `src/services/routeWeatherService.ts`.
public actor RouteWeatherService {
    public static let sectorCacheTTLSeconds: TimeInterval = 21_600 // 6h default for SwiftData
    public static let requestTimeoutSeconds: TimeInterval = 6.0
    public static let defaultForecastURL = URL(string: "https://api.open-meteo.com/v1/forecast")!

    private let urlSession: URLSession
    private let forecastBaseURL: URL
    private let store: CadenceStore?
    private let nowProvider: @Sendable () -> Date
    private let timeZone: TimeZone
    private var sectorMemoryCache: [String: RouteWeatherAnalysis] = [:]

    public init(
        urlSession: URLSession = .shared,
        forecastBaseURL: URL = RouteWeatherService.defaultForecastURL,
        store: CadenceStore? = nil,
        nowProvider: @escaping @Sendable () -> Date = { Date() },
        timeZone: TimeZone = .current
    ) {
        self.urlSession = urlSession
        self.forecastBaseURL = forecastBaseURL
        self.store = store
        self.nowProvider = nowProvider
        self.timeZone = timeZone
    }

    // MARK: - Pure Static Helpers

    public nonisolated static func addMinutesHHMM(
        _ hhmm: String,
        addMin: Double
    ) -> (hhmm: String, hour: Int, dayOffset: Int) {
        let source = hhmm.isEmpty ? "09:00" : hhmm
        let parts = source.split(separator: ":")
        let hVal = parts.first.flatMap { Int($0) }
        let mVal = parts.count > 1 ? Int(parts[1]) : nil
        let h = hVal ?? 9
        let m = mVal ?? 0
        let totalMinutes = h * 60 + m + JSCompat.jsRoundInt(addMin)
        let dayOffset = Int(floor(Double(totalMinutes) / 1440.0))
        let norm = JSCompat.posMod(totalMinutes, 1440)
        let outH = norm / 60
        let outM = norm % 60
        let formatted = String(format: "%02d:%02d", outH, outM)
        return (formatted, outH, dayOffset)
    }

    public nonisolated static func detectLoopOrientation(
        _ coords: [LatLon]
    ) -> (isLoop: Bool, orientation: LoopDirection) {
        guard coords.count >= 4 else {
            return (false, .outAndBack)
        }
        let start = coords[0]
        let end = coords[coords.count - 1]
        let endGapM = OverpassWaterGapEngine.haversineDistanceMeters(
            lat1: start.lat,
            lon1: start.lon,
            lat2: end.lat,
            lon2: end.lon
        )

        var maxDistM = 0.0
        for i in 1..<(coords.count - 1) {
            let d = OverpassWaterGapEngine.haversineDistanceMeters(
                lat1: start.lat,
                lon1: start.lon,
                lat2: coords[i].lat,
                lon2: coords[i].lon
            )
            if d > maxDistM {
                maxDistM = d
            }
        }

        let isLoop = maxDistM > 500.0 && endGapM <= max(3500.0, maxDistM * 0.35)
        guard isLoop else {
            return (false, .outAndBack)
        }

        let cosLat = cos(JSCompat.toRad(start.lat))
        var signedArea = 0.0
        for i in 0..<(coords.count - 1) {
            let x1 = coords[i].lon * cosLat
            let y1 = coords[i].lat
            let x2 = coords[i + 1].lon * cosLat
            let y2 = coords[i + 1].lat
            signedArea += x1 * y2 - x2 * y1
        }

        if abs(signedArea) < 1e-6 {
            return (true, .outAndBack)
        }
        return (true, signedArea < 0 ? .clockwise : .anticlockwise)
    }

    public nonisolated static func buildSectorCacheKey(
        trip: TripProfile,
        targetDate: String,
        departureTime: String,
        lang: CadenceLang = .en,
        ftpWatts: Double? = nil
    ) -> String? {
        guard let coords = trip.route.coordinates, coords.count >= 2 else { return nil }
        let rawSpeed = trip.route.targetSpeedKmH
        let targetSpeedKmH = max(8.0, (rawSpeed.isFinite && rawSpeed != 0) ? rawSpeed : 24.0)
        let first = coords[0]
        let last = coords[coords.count - 1]
        let rawDist = trip.route.distanceKm
        let distVal = (rawDist.isFinite && rawDist != 0) ? rawDist : 0.0
        let distTag = JSCompat.jsRoundInt(distVal * 10.0)
        let ftpVal = (ftpWatts?.isFinite == true && (ftpWatts ?? 0) != 0) ? ftpWatts! : 0.0
        let ftpTag = JSCompat.jsRoundInt(ftpVal)
        let pacing = (trip.route.pacingMode?.isEmpty == false) ? trip.route.pacingMode! : "speed"
        return "\(trip.id):\(distTag):\(JSCompat.jsFixed(first.lat, decimals: 3)),\(JSCompat.jsFixed(first.lon, decimals: 3)):\(JSCompat.jsFixed(last.lat, decimals: 3)),\(JSCompat.jsFixed(last.lon, decimals: 3)):\(targetDate):\(departureTime):\(JSCompat.jsRoundInt(targetSpeedKmH)):\(pacing):\(lang.rawValue):\(ftpTag)"
    }

    // MARK: - Cache & Network Fetch

    public func getCachedRouteSectorForecast(
        trip: TripProfile,
        targetDate: String,
        departureTime: String,
        lang: CadenceLang = .en,
        ftpWatts: Double? = nil
    ) async -> RouteWeatherAnalysis? {
        guard let key = Self.buildSectorCacheKey(
            trip: trip,
            targetDate: targetDate,
            departureTime: departureTime,
            lang: lang,
            ftpWatts: ftpWatts
        ) else {
            return nil
        }
        if let mem = sectorMemoryCache[key] {
            return mem
        }
        if let store,
           let stored = try? await store.fetchCachedWeather(
               kind: .sector,
               cacheKey: key,
               as: RouteWeatherAnalysis.self,
               now: nowProvider(),
               allowExpired: false
           ) {
            sectorMemoryCache[key] = stored
            return stored
        }
        return nil
    }

    public func fetchRouteSectorForecast(
        trip: TripProfile,
        targetDate: String,
        departureTime: String,
        lang: CadenceLang = .en,
        ftpWatts: Double? = nil,
        isOffline: Bool = false
    ) async -> RouteWeatherAnalysis? {
        guard let coords = trip.route.coordinates, coords.count >= 2 else {
            return nil
        }
        guard let cacheKey = Self.buildSectorCacheKey(
            trip: trip,
            targetDate: targetDate,
            departureTime: departureTime,
            lang: lang,
            ftpWatts: ftpWatts
        ) else {
            return nil
        }

        if let cached = sectorMemoryCache[cacheKey] {
            return cached
        }

        let now = nowProvider()
        if isOffline, let store,
           let storedOffline = try? await store.fetchCachedWeather(
               kind: .sector,
               cacheKey: cacheKey,
               as: RouteWeatherAnalysis.self,
               now: now,
               allowExpired: true
           ) {
            sectorMemoryCache[cacheKey] = storedOffline
            return storedOffline
        }

        let rawSpeed = trip.route.targetSpeedKmH
        let targetSpeedKmH = max(8.0, (rawSpeed.isFinite && rawSpeed != 0) ? rawSpeed : 24.0)
        let defaultGrade = trip.physics.gradientPercent.isFinite ? trip.physics.gradientPercent : 0.5
        let sectorsGeom = Self.buildSectors(
            coordinates: coords,
            totalDistanceKm: trip.route.distanceKm,
            defaultGradePct: defaultGrade,
            elevationProfile: trip.route.elevationProfile
        )

        let horizon = WeatherService.checkForecastHorizon(
            targetDateStr: targetDate,
            now: now,
            timeZone: timeZone
        )

        var hourlyByIdx: [BatchHourlyPointData]? = nil
        var source: RouteWeatherSource = horizon.isAvailable
            ? (horizon.daysOffset == 0 ? .live : .planned)
            : .simulated

        if horizon.isAvailable {
            let lats = sectorsGeom.map { JSCompat.jsFixed($0.lat, decimals: 4) }.joined(separator: ",")
            let lons = sectorsGeom.map { JSCompat.jsFixed($0.lon, decimals: 4) }.joined(separator: ",")

            if var components = URLComponents(url: forecastBaseURL, resolvingAgainstBaseURL: false) {
                components.queryItems = [
                    URLQueryItem(name: "latitude", value: lats),
                    URLQueryItem(name: "longitude", value: lons),
                    URLQueryItem(
                        name: "hourly",
                        value: "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability,visibility,is_day,weather_code"
                    ),
                    URLQueryItem(name: "wind_speed_unit", value: "kmh"),
                    URLQueryItem(name: "timezone", value: "auto"),
                    URLQueryItem(name: "past_days", value: "2"),
                    URLQueryItem(name: "forecast_days", value: "14"),
                ]

                if let url = components.url {
                    var request = URLRequest(url: url, timeoutInterval: Self.requestTimeoutSeconds)
                    request.httpMethod = "GET"

                    do {
                        let (data, response) = try await urlSession.data(for: request)
                        if let http = response as? HTTPURLResponse,
                           (200...299).contains(http.statusCode) {
                            let items = Self.decodeBatchItems(from: data)
                            let extracted = items.compactMap(\.hourly)
                            if extracted.count == sectorsGeom.count {
                                hourlyByIdx = extracted
                            } else {
                                hourlyByIdx = nil
                                source = .simulated
                            }
                        } else {
                            source = .simulated
                        }
                    } catch {
                        hourlyByIdx = nil
                        source = .simulated
                    }
                } else {
                    source = .simulated
                }
            } else {
                source = .simulated
            }
        }

        let forwardSectors = Self.evaluateDirectionPhysics(
            sectorsGeom: sectorsGeom,
            hourlyByIdx: hourlyByIdx,
            trip: trip,
            targetDate: targetDate,
            departureTime: departureTime,
            targetSpeedKmH: targetSpeedKmH,
            lang: lang,
            ftpWatts: ftpWatts
        )

        let (isLoop, orientation) = Self.detectLoopOrientation(coords)
        let reverseSectorsGeom: [RawSectorGeom] = sectorsGeom.reversed().enumerated().map { idx, s in
            RawSectorGeom(
                index: idx,
                startKm: s.startKm,
                endKm: s.endKm,
                distanceKm: s.distanceKm,
                lat: s.lat,
                lon: s.lon,
                bearingDeg: Double((Int(s.bearingDeg) + 180) % 360),
                gradePct: -s.gradePct
            )
        }
        let reverseHourly: [BatchHourlyPointData]? = hourlyByIdx.map { Array($0.reversed()) }

        let reverseSectors = isLoop
            ? Self.evaluateDirectionPhysics(
                sectorsGeom: reverseSectorsGeom,
                hourlyByIdx: reverseHourly,
                trip: trip,
                targetDate: targetDate,
                departureTime: departureTime,
                targetSpeedKmH: targetSpeedKmH,
                lang: lang,
                ftpWatts: ftpWatts
            )
            : forwardSectors

        let forwardTotalMin = forwardSectors.reduce(0) { $0 + $1.durationMin }
        let reverseTotalMin = reverseSectors.reduce(0) { $0 + $1.durationMin }
        let forwardAvgWatts = JSCompat.jsRoundInt(
            Double(forwardSectors.reduce(0) { $0 + $1.legWatts }) / Double(max(1, forwardSectors.count))
        )
        let reverseAvgWatts = JSCompat.jsRoundInt(
            Double(reverseSectors.reduce(0) { $0 + $1.legWatts }) / Double(max(1, reverseSectors.count))
        )

        let minDiff = forwardTotalMin - reverseTotalMin
        let wattDiff = forwardAvgWatts - reverseAvgWatts

        var recommendedDirection: LoopRecommendedDirection = .neutral
        if isLoop {
            if minDiff >= 2 || wattDiff >= 5 {
                recommendedDirection = .reverse
            } else if minDiff <= -2 || wattDiff <= -5 {
                recommendedDirection = .forward
            }
        }

        let coldestSector = forwardSectors.dropFirst().reduce(forwardSectors[0]) { minS, s in
            s.windChillC < minS.windChillC ? s : minS
        }
        let wettestSector = forwardSectors.dropFirst().reduce(forwardSectors[0]) { maxS, s in
            s.precipitationRiskPercent > maxS.precipitationRiskPercent ? s : maxS
        }

        var worstCaseWeather = trip.weather
        worstCaseWeather.temperatureC = coldestSector.temperatureC
        worstCaseWeather.baseWindSpeedKmH = coldestSector.windSpeedKmH
        worstCaseWeather.effectiveHeadwindKmH = coldestSector.effectiveHeadwindKmH
        worstCaseWeather.isHeadwindActive = coldestSector.effectiveHeadwindKmH > 2.0
        worstCaseWeather.precipitationRiskPercent = max(
            trip.weather.precipitationRiskPercent,
            wettestSector.precipitationRiskPercent
        )
        worstCaseWeather.visibilityKm = min(
            trip.weather.visibilityKm > 0 ? trip.weather.visibilityKm : 15.0,
            coldestSector.visibilityKm
        )

        let sKm = Self.formatJsNumber(coldestSector.startKm)
        let eKm = Self.formatJsNumber(coldestSector.endKm)
        let tStr = Self.formatJsNumber(coldestSector.temperatureC)
        let wcStr = Self.formatJsNumber(coldestSector.windChillC)

        let coldestSectorLabel = lang == .fr
            ? "Secteur le plus frais : KM \(sKm)–\(eKm) (\(tStr)°C, ressenti \(wcStr)°C)"
            : "Coldest stretch: KM \(sKm)–\(eKm) (\(tStr)°C, feels \(wcStr)°C)"

        let analysis = RouteWeatherAnalysis(
            sectors: forwardSectors,
            loopComparison: LoopDirectionComparison(
                isLoop: isLoop,
                forwardOrientation: orientation,
                recommendedDirection: recommendedDirection,
                forwardTotalMin: forwardTotalMin,
                reverseTotalMin: reverseTotalMin,
                forwardAvgWatts: forwardAvgWatts,
                reverseAvgWatts: reverseAvgWatts,
                minutesSaved: abs(minDiff),
                wattsSaved: abs(wattDiff)
            ),
            coldestSector: coldestSector,
            wettestSector: wettestSector,
            worstCaseWeather: worstCaseWeather,
            coldestSectorLabel: coldestSectorLabel,
            source: source
        )

        if source == .simulated, let store,
           let persistedFallback = try? await store.fetchCachedWeather(
               kind: .sector,
               cacheKey: cacheKey,
               as: RouteWeatherAnalysis.self,
               now: now,
               allowExpired: true
           ) {
            sectorMemoryCache[cacheKey] = persistedFallback
            return persistedFallback
        }

        sectorMemoryCache[cacheKey] = analysis
        if source != .simulated, let store {
            try? await store.saveCachedWeather(
                kind: .sector,
                cacheKey: cacheKey,
                value: analysis,
                source: source.rawValue,
                ttlSeconds: Self.sectorCacheTTLSeconds,
                pinOffline: false,
                now: now
            )
        }
        return analysis
    }

    /// Convenience alias matching M4C `OfflinePackService` contract.
    public func analyzeRouteWeather(
        trip: TripProfile,
        targetDate: String,
        departureTime: String,
        lang: CadenceLang = .en,
        ftpWatts: Double? = nil,
        isOffline: Bool = false
    ) async -> RouteWeatherAnalysis? {
        await fetchRouteSectorForecast(
            trip: trip,
            targetDate: targetDate,
            departureTime: departureTime,
            lang: lang,
            ftpWatts: ftpWatts,
            isOffline: isOffline
        )
    }

    public func clearCache() {
        sectorMemoryCache.removeAll()
    }

    // MARK: - Private Geometry & Physics Helpers

    private nonisolated static func decodeBatchItems(from data: Data) -> [OpenMeteoBatchPointResponse] {
        let decoder = JSONDecoder()
        if let array = try? decoder.decode([OpenMeteoBatchPointResponse].self, from: data) {
            return array
        }
        if let single = try? decoder.decode(OpenMeteoBatchPointResponse.self, from: data) {
            return [single]
        }
        return []
    }

    private nonisolated static func computeBearingDeg(_ a: LatLon, _ b: LatLon) -> Double {
        if a.lat == b.lat && a.lon == b.lon { return 0 }
        let dLon = JSCompat.toRad(b.lon - a.lon)
        let phi1 = JSCompat.toRad(a.lat)
        let phi2 = JSCompat.toRad(b.lat)
        let y = sin(dLon) * cos(phi2)
        let x = cos(phi1) * sin(phi2) - sin(phi1) * cos(phi2) * cos(dLon)
        let rounded = JSCompat.jsRoundInt(JSCompat.toDeg(atan2(y, x)))
        return Double(JSCompat.posMod(rounded, 360))
    }

    private nonisolated static func computeCyclingWindChillC(
        tempC: Double,
        speedKmH: Double,
        headwindKmH: Double
    ) -> Double {
        let airflow = max(10.0, speedKmH + headwindKmH * 0.65)
        if tempC > 14.0 {
            return JSCompat.jsRound(tempC)
        }
        let airflowPow = pow(airflow, 0.16)
        let chill = 13.12 + 0.6215 * tempC - 11.37 * airflowPow + 0.3965 * tempC * airflowPow
        return JSCompat.jsRound(chill)
    }

    private nonisolated static func buildSectors(
        coordinates: [LatLon],
        totalDistanceKm: Double,
        defaultGradePct: Double,
        elevationProfile: [ElevationProfilePoint]?
    ) -> [RawSectorGeom] {
        let cumM = OverpassWaterGapEngine.computeCumulativeDistances(coordinates)
        let rawTotalM = (cumM.last ?? 0.0) > 0 ? cumM.last! : 1.0
        let resolvedDist = (totalDistanceKm.isFinite && totalDistanceKm > 0) ? totalDistanceKm : (rawTotalM / 1000.0)
        let distKm = max(2.0, resolvedDist)

        let sectorCount = max(4, min(8, JSCompat.jsRoundInt(distKm / 6.0)))
        var sectors: [RawSectorGeom] = []
        sectors.reserveCapacity(sectorCount)

        func coordAtFraction(_ frac: Double) -> LatLon {
            let targetM = max(0.0, min(1.0, frac)) * rawTotalM
            for i in 0..<(cumM.count - 1) {
                if cumM[i + 1] >= targetM {
                    let seg = cumM[i + 1] - cumM[i]
                    let t = seg > 0 ? (targetM - cumM[i]) / seg : 0.0
                    let p0 = coordinates[i]
                    let p1 = coordinates[i + 1]
                    return LatLon(
                        p0.lat + (p1.lat - p0.lat) * t,
                        p0.lon + (p1.lon - p0.lon) * t
                    )
                }
            }
            return coordinates[coordinates.count - 1]
        }

        func eleAtKm(_ km: Double) -> Double? {
            guard let elevationProfile, elevationProfile.count >= 2 else { return nil }
            var best = elevationProfile[0]
            var bestDiff = Double.infinity
            for p in elevationProfile {
                let diff = abs(p.distKm - km)
                if diff < bestDiff {
                    bestDiff = diff
                    best = p
                }
            }
            return best.eleM
        }

        for i in 0..<sectorCount {
            let f0 = Double(i) / Double(sectorCount)
            let f1 = Double(i + 1) / Double(sectorCount)
            let fMid = (f0 + f1) / 2.0
            let pStart = coordAtFraction(f0)
            let pMid = coordAtFraction(fMid)
            let pEnd = coordAtFraction(f1)

            let startKm = JSCompat.jsToFixedNumber(f0 * distKm, decimals: 1)
            let endKm = JSCompat.jsToFixedNumber(f1 * distKm, decimals: 1)
            let secKm = max(0.5, JSCompat.jsToFixedNumber(endKm - startKm, decimals: 1))
            let bearingDeg = computeBearingDeg(pStart, pEnd)

            var gradePct = defaultGradePct
            if let e0 = eleAtKm(startKm), let e1 = eleAtKm(endKm) {
                let rawGrade = ((e1 - e0) / (secKm * 1000.0)) * 100.0
                gradePct = JSCompat.jsToFixedNumber(max(-10.0, min(12.0, rawGrade)), decimals: 1)
            }

            sectors.append(RawSectorGeom(
                index: i,
                startKm: startKm,
                endKm: endKm,
                distanceKm: secKm,
                lat: pMid.lat,
                lon: pMid.lon,
                bearingDeg: bearingDeg,
                gradePct: gradePct
            ))
        }

        return sectors
    }

    private nonisolated static func evaluateDirectionPhysics(
        sectorsGeom: [RawSectorGeom],
        hourlyByIdx: [BatchHourlyPointData]?,
        trip: TripProfile,
        targetDate: String,
        departureTime: String,
        targetSpeedKmH: Double,
        lang: CadenceLang,
        ftpWatts: Double?
    ) -> [RouteSectorForecast] {
        var results: [RouteSectorForecast] = []
        results.reserveCapacity(sectorsGeom.count)
        var elapsedMin = 0.0

        for i in 0..<sectorsGeom.count {
            let g = sectorsGeom[i]
            let (etaHHMM, hour, dayOffset) = addMinutesHHMM(departureTime, addMin: elapsedMin)
            let sectorDate = dayOffset != 0
                ? StageManagerEngine.addDaysToIso(targetDate, days: dayOffset)
                : targetDate
            let targetHourStr = "\(sectorDate)T\(String(format: "%02d", hour)):00"

            var tempC = trip.weather.temperatureC.isFinite ? trip.weather.temperatureC : 14.0
            var windSpeedKmH = trip.weather.baseWindSpeedKmH.isFinite ? trip.weather.baseWindSpeedKmH : 12.0
            var windDirDeg = trip.weather.windDirectionDegrees.isFinite ? trip.weather.windDirectionDegrees : 245.0
            var pressureHpa = 1013.0
            var precipProb = trip.weather.precipitationRiskPercent.isFinite ? trip.weather.precipitationRiskPercent : 10.0
            var visKm = trip.weather.visibilityKm.isFinite ? trip.weather.visibilityKm : 15.0

            if let hData = hourlyByIdx?[safe: i], !hData.time.isEmpty {
                var idx = hData.time.firstIndex(where: { $0.hasPrefix(targetHourStr) }) ?? -1
                if idx == -1 {
                    idx = min(hour, hData.time.count - 1)
                }
                if idx >= 0 {
                    tempC = JSCompat.jsRound(finiteDouble(hData.temperature_2m, at: idx) ?? tempC)
                    windSpeedKmH = JSCompat.jsRound(finiteDouble(hData.wind_speed_10m, at: idx) ?? windSpeedKmH)
                    windDirDeg = JSCompat.jsRound(finiteDouble(hData.wind_direction_10m, at: idx) ?? windDirDeg)
                    pressureHpa = JSCompat.jsRound(finiteDouble(hData.surface_pressure, at: idx) ?? pressureHpa)
                    precipProb = JSCompat.jsRound(finiteDouble(hData.precipitation_probability, at: idx) ?? precipProb)
                    let rawVisM = finiteDouble(hData.visibility, at: idx) ?? (visKm * 1000.0)
                    visKm = JSCompat.roundTo(rawVisM / 1000.0, decimals: 1)
                }
            }

            let rho = WeatherService.calculateAirDensity(tempC: tempC, pressureHpa: pressureHpa)
            let angleDiffRad = JSCompat.toRad(windDirDeg - g.bearingDeg)
            let effectiveHeadwindKmH = JSCompat.jsToFixedNumber(windSpeedKmH * cos(angleDiffRad), decimals: 1)

            var sectorWeather = trip.weather
            sectorWeather.temperatureC = tempC
            sectorWeather.baseWindSpeedKmH = windSpeedKmH
            sectorWeather.windDirectionDegrees = windDirDeg
            sectorWeather.effectiveHeadwindKmH = effectiveHeadwindKmH
            sectorWeather.isHeadwindActive = effectiveHeadwindKmH > 2.0
            sectorWeather.windDirection = effectiveHeadwindKmH > 2.0
                ? "headwind"
                : (effectiveHeadwindKmH < -2.0 ? "tailwind" : "calm")
            sectorWeather.airDensityRho = rho
            sectorWeather.precipitationRiskPercent = precipProb
            sectorWeather.visibilityKm = visKm

            var sectorRoute = trip.route
            sectorRoute.distanceKm = g.distanceKm
            sectorRoute.targetSpeedKmH = targetSpeedKmH
            sectorRoute.elevationGainM = max(0.0, JSCompat.jsRound((g.gradePct / 100.0) * g.distanceKm * 1000.0))
            sectorRoute.elevationProfile = nil

            var sectorPhysics = trip.physics
            sectorPhysics.gradientPercent = g.gradePct
            sectorPhysics.rho = rho

            let phys = PhysicsEngine.calculatePhysics(
                physics: sectorPhysics,
                route: sectorRoute,
                weather: sectorWeather,
                lang: lang,
                ftpOverride: ftpWatts
            )

            let durationMin = max(1, JSCompat.jsRoundInt(phys.movingTimeSeconds / 60.0))
            elapsedMin += Double(durationMin)

            let windChillC = computeCyclingWindChillC(
                tempC: tempC,
                speedKmH: phys.effectiveSpeedKmH,
                headwindKmH: effectiveHeadwindKmH
            )

            results.append(RouteSectorForecast(
                index: i,
                startKm: g.startKm,
                endKm: g.endKm,
                distanceKm: g.distanceKm,
                lat: g.lat,
                lon: g.lon,
                bearingDeg: g.bearingDeg,
                etaHHMM: etaHHMM,
                temperatureC: tempC,
                windChillC: windChillC,
                windSpeedKmH: windSpeedKmH,
                windDirectionDegrees: windDirDeg,
                windCardinal: WeatherService.degreesToCompassCardinal(windDirDeg, lang: lang),
                effectiveHeadwindKmH: effectiveHeadwindKmH,
                precipitationRiskPercent: precipProb,
                visibilityKm: visKm,
                airDensityRho: rho,
                legWatts: JSCompat.jsRoundInt(phys.legWatts),
                aeroPenaltyWatts: JSCompat.jsRoundInt(phys.powerDeltaWatts),
                effectiveSpeedKmH: JSCompat.jsToFixedNumber(phys.effectiveSpeedKmH, decimals: 1),
                durationMin: durationMin,
                carbsG: JSCompat.jsRoundInt(phys.totalCarbsBurnedGrams)
            ))
        }

        return results
    }

    private nonisolated static func finiteDouble(_ array: [Double?]?, at index: Int) -> Double? {
        guard let array, index >= 0, index < array.count,
              let val = array[index], val.isFinite else {
            return nil
        }
        return val
    }

    private nonisolated static func formatJsNumber(_ value: Double) -> String {
        guard value.isFinite else { return "0" }
        if value == 0 { return "0" }
        if value.truncatingRemainder(dividingBy: 1) == 0, abs(value) < Double(Int64.max) {
            return String(Int64(value))
        }
        return String(value)
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
