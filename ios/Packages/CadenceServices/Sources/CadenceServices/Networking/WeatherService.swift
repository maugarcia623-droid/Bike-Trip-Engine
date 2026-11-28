import Foundation
import CadenceCore

/// Meteorological telemetry payload mirroring `TelemetryWeather` in `src/services/weatherService.ts`.
public struct TelemetryWeather: Codable, Sendable, Equatable {
    public var temperatureC: Double
    public var relativeHumidity: Double
    public var recentPrecipitationMm: Double?
    public var surfacePressureHpa: Double
    public var airDensityRho: Double
    public var windSpeedKmH: Double
    public var windDirectionDegrees: Double
    public var windGustsKmH: Double
    public var routeBearingDegrees: Double
    public var effectiveHeadwindKmH: Double
    public var isHeadwindActive: Bool
    public var timestamp: String
    public var source: RouteWeatherSource
    public var isBeyondForecastWindow: Bool
    public var visibilityKm: Double
    public var isDay: Bool
    public var weatherCode: Int
    public var sunriseIso: String?
    public var sunsetIso: String?

    public init(
        temperatureC: Double,
        relativeHumidity: Double,
        recentPrecipitationMm: Double? = nil,
        surfacePressureHpa: Double,
        airDensityRho: Double,
        windSpeedKmH: Double,
        windDirectionDegrees: Double,
        windGustsKmH: Double,
        routeBearingDegrees: Double,
        effectiveHeadwindKmH: Double,
        isHeadwindActive: Bool,
        timestamp: String,
        source: RouteWeatherSource,
        isBeyondForecastWindow: Bool,
        visibilityKm: Double,
        isDay: Bool,
        weatherCode: Int,
        sunriseIso: String? = nil,
        sunsetIso: String? = nil
    ) {
        self.temperatureC = temperatureC
        self.relativeHumidity = relativeHumidity
        self.recentPrecipitationMm = recentPrecipitationMm
        self.surfacePressureHpa = surfacePressureHpa
        self.airDensityRho = airDensityRho
        self.windSpeedKmH = windSpeedKmH
        self.windDirectionDegrees = windDirectionDegrees
        self.windGustsKmH = windGustsKmH
        self.routeBearingDegrees = routeBearingDegrees
        self.effectiveHeadwindKmH = effectiveHeadwindKmH
        self.isHeadwindActive = isHeadwindActive
        self.timestamp = timestamp
        self.source = source
        self.isBeyondForecastWindow = isBeyondForecastWindow
        self.visibilityKm = visibilityKm
        self.isDay = isDay
        self.weatherCode = weatherCode
        self.sunriseIso = sunriseIso
        self.sunsetIso = sunsetIso
    }

    public func toWeatherCondition(
        precipitationRiskPercent: Double = 0,
        windDirectionOverride: String? = nil
    ) -> WeatherCondition {
        let dirLabel: String
        if let windDirectionOverride {
            dirLabel = windDirectionOverride
        } else if effectiveHeadwindKmH > 2 {
            dirLabel = "headwind"
        } else if effectiveHeadwindKmH < -2 {
            dirLabel = "tailwind"
        } else {
            dirLabel = "calm"
        }

        return WeatherCondition(
            source: source.rawValue,
            airDensityRho: airDensityRho,
            effectiveHeadwindKmH: effectiveHeadwindKmH,
            isBeyondForecastWindow: isBeyondForecastWindow,
            targetTimestampFormatted: timestamp,
            isHeadwindActive: isHeadwindActive,
            baseWindSpeedKmH: windSpeedKmH,
            windDirection: dirLabel,
            windDirectionDegrees: windDirectionDegrees,
            temperatureC: temperatureC,
            relativeHumidity: relativeHumidity,
            recentPrecipitationMm: recentPrecipitationMm,
            precipitationRiskPercent: precipitationRiskPercent,
            estuaryGustKmH: windGustsKmH,
            visibilityKm: visibilityKm,
            weatherCode: weatherCode,
            isDay: isDay,
            sunrise: sunriseIso,
            sunset: sunsetIso
        )
    }
}

public struct ForecastHorizonResult: Sendable, Equatable {
    public var isAvailable: Bool
    public var daysOffset: Int

    public init(isAvailable: Bool, daysOffset: Int) {
        self.isAvailable = isAvailable
        self.daysOffset = daysOffset
    }
}

public enum WeatherServiceError: Error, Sendable, Equatable {
    case invalidURL
    case httpError(statusCode: Int)
    case malformedResponse(String)
}

private struct OpenMeteoHourlyPayload: Codable, Sendable, Equatable {
    let time: [String]
    let temperature_2m: [Double?]?
    let relative_humidity_2m: [Double?]?
    let precipitation: [Double?]?
    let surface_pressure: [Double?]?
    let wind_speed_10m: [Double?]?
    let wind_direction_10m: [Double?]?
    let wind_gusts_10m: [Double?]?
    let visibility: [Double?]?
    let is_day: [Int?]?
    let weather_code: [Int?]?
}

private struct OpenMeteoDailySunrisePayload: Codable, Sendable, Equatable {
    let time: [String]?
    let sunrise: [String?]?
    let sunset: [String?]?
}

private struct OpenMeteoForecastPayload: Codable, Sendable, Equatable {
    let hourly: OpenMeteoHourlyPayload?
    let daily: OpenMeteoDailySunrisePayload?
}

private struct OpenMeteoWeeklyDailyPayload: Decodable {
    let time: [String]?
    let weather_code: [Int?]?
    let temperature_2m_max: [Double?]?
    let temperature_2m_min: [Double?]?
    let precipitation_sum: [Double?]?
    let precipitation_probability_max: [Double?]?
    let wind_speed_10m_max: [Double?]?
}

private struct OpenMeteoWeeklyResponse: Decodable {
    let daily: OpenMeteoWeeklyDailyPayload?
}

/// Open-Meteo hourly & 7-day forecast network actor mirroring `src/services/weatherService.ts`.
public actor WeatherService {
    public static let hourlyCacheTTLSeconds: TimeInterval = 600   // 10 minutes
    public static let weeklyCacheTTLSeconds: TimeInterval = 3600  // 60 minutes
    public static let requestTimeoutSeconds: TimeInterval = 6.0
    public static let maxHourlyMemoryEntries = 50
    public static let defaultForecastURL = URL(string: "https://api.open-meteo.com/v1/forecast")!

    private let urlSession: URLSession
    private let forecastBaseURL: URL
    private let store: CadenceStore?
    private let nowProvider: @Sendable () -> Date
    private let timeZone: TimeZone

    private var hourlyMemoryCache: [String: (data: OpenMeteoForecastPayload, expiresAt: Date)] = [:]
    private var hourlyCacheOrder: [String] = []
    private var hourlyInFlight: [String: (id: UUID, task: Task<OpenMeteoForecastPayload, Error>)] = [:]

    private var weeklyMemoryCache: [String: (forecast: WeeklyForecast, expiresAt: Date)] = [:]
    private var weeklyInFlight: [String: (id: UUID, task: Task<WeeklyForecast, Error>)] = [:]

    public init(
        urlSession: URLSession = .shared,
        forecastBaseURL: URL = WeatherService.defaultForecastURL,
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

    public nonisolated static func localTodayIso(
        now: Date = Date(),
        timeZone: TimeZone = .current
    ) -> String {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone
        let comps = cal.dateComponents([.year, .month, .day], from: now)
        let y = comps.year ?? 2026
        let m = comps.month ?? 1
        let d = comps.day ?? 1
        return String(format: "%04d-%02d-%02d", y, m, d)
    }

    public nonisolated static func computeRouteBearing(coordinates: [LatLon]?) -> Double {
        guard let coordinates, coordinates.count >= 2 else { return 280 }
        let lat1 = coordinates[0].lat
        let lon1 = coordinates[0].lon
        var lat2 = coordinates[coordinates.count - 1].lat
        var lon2 = coordinates[coordinates.count - 1].lon

        func approxDistSq(_ a: LatLon, _ b: LatLon) -> Double {
            let dLat = b.lat - a.lat
            let dLon = (b.lon - a.lon) * cos(JSCompat.toRad((a.lat + b.lat) / 2.0))
            return dLat * dLat + dLon * dLon
        }

        if coordinates.count >= 4 {
            var maxDistSq = 0.0
            var apex = coordinates[coordinates.count / 2]
            for i in 1..<(coordinates.count - 1) {
                let dSq = approxDistSq(coordinates[0], coordinates[i])
                if dSq > maxDistSq {
                    maxDistSq = dSq
                    apex = coordinates[i]
                }
            }
            let endDistSq = approxDistSq(coordinates[0], coordinates[coordinates.count - 1])
            if maxDistSq > 0 && endDistSq < maxDistSq * 0.0625 {
                lat2 = apex.lat
                lon2 = apex.lon
            }
        }

        if lat1 == lat2 && lon1 == lon2 { return 280 }

        let dLon = JSCompat.toRad(lon2 - lon1)
        let phi1 = JSCompat.toRad(lat1)
        let phi2 = JSCompat.toRad(lat2)

        let y = sin(dLon) * cos(phi2)
        let x = cos(phi1) * sin(phi2) - sin(phi1) * cos(phi2) * cos(dLon)
        let brng = JSCompat.posMod(JSCompat.toDeg(atan2(y, x)), 360.0)
        return JSCompat.jsRound(brng)
    }

    public nonisolated static func degreesToCompassCardinal(
        _ degrees: Double,
        lang: CadenceLang = .en
    ) -> String {
        PhysicsEngine.degreesToCompassCardinal(degrees, lang: lang)
    }

    public nonisolated static func checkForecastHorizon(
        targetDateStr: String,
        now: Date = Date(),
        timeZone: TimeZone = .current
    ) -> ForecastHorizonResult {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone

        let todayStart = cal.startOfDay(for: now)
        let targetStart = parseLocalDate(targetDateStr, timeZone: timeZone) ?? todayStart

        let diffSeconds = targetStart.timeIntervalSince(todayStart)
        let daysOffset = JSCompat.jsRoundInt(diffSeconds / 86_400.0)
        let isAvailable = daysOffset >= -2 && daysOffset <= 14
        return ForecastHorizonResult(isAvailable: isAvailable, daysOffset: daysOffset)
    }

    public nonisolated static func calculateAirDensity(
        tempC: Double,
        pressureHpa: Double
    ) -> Double {
        PhysicsEngine.calculateAirDensity(tempC: tempC, pressureHpa: pressureHpa)
    }

    // MARK: - Hourly Forecast

    public func fetchHourlyWeather(
        lat: Double,
        lon: Double,
        targetDate: String,
        targetTime: String,
        routeBearing: Double = 280
    ) async throws -> TelemetryWeather {
        let now = nowProvider()
        let horizon = Self.checkForecastHorizon(
            targetDateStr: targetDate,
            now: now,
            timeZone: timeZone
        )

        if !horizon.isAvailable {
            return buildSimulatedTelemetry(
                lat: lat,
                lon: lon,
                targetDate: targetDate,
                targetTime: targetTime,
                routeBearing: routeBearing
            )
        }

        let payload = try await fetchOpenMeteoForecast(lat: lat, lon: lon)
        guard let hourly = payload.hourly, !hourly.time.isEmpty else {
            throw WeatherServiceError.malformedResponse("Malformed Open-Meteo response")
        }

        let hourPrefix = targetTime.split(separator: ":").first.map(String.init) ?? "00"
        let targetHour = "\(targetDate)T\(hourPrefix):00"
        let index = hourly.time.firstIndex(where: { $0.hasPrefix(targetHour) }) ?? 0

        let tempC = JSCompat.jsRound(Self.finiteDouble(hourly.temperature_2m, at: index) ?? 12.0)
        let pressure = JSCompat.jsRound(Self.finiteDouble(hourly.surface_pressure, at: index) ?? 1013.0)
        let humidity = JSCompat.jsRound(Self.finiteDouble(hourly.relative_humidity_2m, at: index) ?? 75.0)
        let windSpeed = JSCompat.jsRound(Self.finiteDouble(hourly.wind_speed_10m, at: index) ?? 10.0)
        let windDir = JSCompat.jsRound(Self.finiteDouble(hourly.wind_direction_10m, at: index) ?? 240.0)
        let windGusts = JSCompat.jsRound(
            Self.finiteDouble(hourly.wind_gusts_10m, at: index) ?? (windSpeed * 1.5)
        )

        let rawVisM = Self.finiteDouble(hourly.visibility, at: index) ?? 15_000.0
        let visKm = JSCompat.roundTo(rawVisM / 1000.0, decimals: 1)
        let isDay = (Self.value(hourly.is_day, at: index) ?? 1) == 1
        let weatherCode = Self.value(hourly.weather_code, at: index) ?? 0

        var recentPrecipSum = 0.0
        if let precip = hourly.precipitation, !precip.isEmpty {
            let startIdx = max(0, index - 6)
            let endIdx = min(index, precip.count - 1)
            if startIdx <= endIdx {
                for i in startIdx...endIdx {
                    if let mm = precip[i], mm.isFinite, mm > 0 {
                        recentPrecipSum += mm
                    }
                }
            }
        }
        let recentPrecipitationMm = JSCompat.jsToFixedNumber(recentPrecipSum, decimals: 1)

        let dailyIndex = payload.daily?.time?.firstIndex(of: targetDate) ?? 0
        let sunriseIso = Self.stringValue(payload.daily?.sunrise, at: dailyIndex)
        let sunsetIso = Self.stringValue(payload.daily?.sunset, at: dailyIndex)

        let rho = Self.calculateAirDensity(tempC: tempC, pressureHpa: pressure)
        let angleDiffRad = JSCompat.toRad(windDir - routeBearing)
        let effectiveHeadwind = JSCompat.jsToFixedNumber(windSpeed * cos(angleDiffRad), decimals: 1)

        return TelemetryWeather(
            temperatureC: tempC,
            relativeHumidity: humidity,
            recentPrecipitationMm: recentPrecipitationMm,
            surfacePressureHpa: pressure,
            airDensityRho: rho,
            windSpeedKmH: windSpeed,
            windDirectionDegrees: windDir,
            windGustsKmH: windGusts,
            routeBearingDegrees: JSCompat.jsRound(routeBearing),
            effectiveHeadwindKmH: effectiveHeadwind,
            isHeadwindActive: effectiveHeadwind > 2.0,
            timestamp: hourly.time[index],
            source: horizon.daysOffset == 0 ? .live : .planned,
            isBeyondForecastWindow: false,
            visibilityKm: visKm,
            isDay: isDay,
            weatherCode: weatherCode,
            sunriseIso: sunriseIso,
            sunsetIso: sunsetIso
        )
    }

    // MARK: - Weekly Forecast

    public func getCachedWeeklyWeather(lat: Double, lon: Double) async -> WeeklyForecast? {
        let now = nowProvider()
        let key = weeklyCacheKey(lat: lat, lon: lon, now: now)

        if let mem = weeklyMemoryCache[key] {
            if now < mem.expiresAt {
                return mem.forecast
            }
            weeklyMemoryCache.removeValue(forKey: key)
        }

        if let store,
           let stored = try? await store.fetchCachedWeather(
               kind: .weekly,
               cacheKey: key,
               as: WeeklyForecast.self,
               now: now,
               allowExpired: false
           ),
           !stored.days.isEmpty {
            weeklyMemoryCache[key] = (
                forecast: stored,
                expiresAt: now.addingTimeInterval(Self.weeklyCacheTTLSeconds)
            )
            return stored
        }

        return nil
    }

    public func fetchWeeklyWeather(lat: Double, lon: Double) async throws -> WeeklyForecast {
        if let cached = await getCachedWeeklyWeather(lat: lat, lon: lon) {
            return cached
        }

        let now = nowProvider()
        let key = weeklyCacheKey(lat: lat, lon: lon, now: now)
        if let existing = weeklyInFlight[key] {
            return try await existing.task.value
        }

        guard var components = URLComponents(url: forecastBaseURL, resolvingAgainstBaseURL: false) else {
            throw WeatherServiceError.invalidURL
        }
        components.queryItems = [
            URLQueryItem(name: "latitude", value: Self.urlCoordString(lat)),
            URLQueryItem(name: "longitude", value: Self.urlCoordString(lon)),
            URLQueryItem(
                name: "daily",
                value: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max"
            ),
            URLQueryItem(name: "wind_speed_unit", value: "kmh"),
            URLQueryItem(name: "timezone", value: "auto"),
            URLQueryItem(name: "forecast_days", value: "7"),
        ]
        guard let url = components.url else {
            throw WeatherServiceError.invalidURL
        }

        let requestId = UUID()
        let session = self.urlSession
        let storeRef = self.store
        let nowFn = self.nowProvider

        let task = Task<WeeklyForecast, Error> { [weak self] in
            do {
                var request = URLRequest(url: url, timeoutInterval: Self.requestTimeoutSeconds)
                request.httpMethod = "GET"
                let (data, response) = try await session.data(for: request)
                guard let http = response as? HTTPURLResponse else {
                    throw WeatherServiceError.malformedResponse("Missing HTTP response")
                }
                guard (200...299).contains(http.statusCode) else {
                    throw WeatherServiceError.httpError(statusCode: http.statusCode)
                }

                let decoded = try JSONDecoder().decode(OpenMeteoWeeklyResponse.self, from: data)
                guard let daily = decoded.daily,
                      let dates = daily.time,
                      !dates.isEmpty else {
                    throw WeatherServiceError.malformedResponse("Malformed Open-Meteo daily forecast response")
                }

                let days: [DailyForecastDay] = dates.enumerated().map { idx, date in
                    DailyForecastDay(
                        date: date,
                        weatherCode: Self.value(daily.weather_code, at: idx) ?? 0,
                        tempMaxC: Self.finiteDouble(daily.temperature_2m_max, at: idx) ?? 15.0,
                        tempMinC: Self.finiteDouble(daily.temperature_2m_min, at: idx) ?? 8.0,
                        precipitationSumMm: Self.finiteDouble(daily.precipitation_sum, at: idx) ?? 0.0,
                        precipitationProbMax: Self.finiteDouble(daily.precipitation_probability_max, at: idx) ?? 0.0,
                        windSpeedMaxKmH: Self.finiteDouble(daily.wind_speed_10m_max, at: idx) ?? 10.0
                    )
                }

                let completedAt = nowFn()
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

                let forecast = WeeklyForecast(
                    latitude: lat,
                    longitude: lon,
                    fetchedAt: formatter.string(from: completedAt),
                    days: days
                )

                await self?.storeWeeklyCache(key: key, forecast: forecast, now: completedAt)
                if let storeRef {
                    try? await storeRef.saveCachedWeather(
                        kind: .weekly,
                        cacheKey: key,
                        value: forecast,
                        source: "live",
                        ttlSeconds: Self.weeklyCacheTTLSeconds,
                        pinOffline: false,
                        now: completedAt
                    )
                }
                await self?.clearWeeklyInFlight(key: key, id: requestId)
                return forecast
            } catch {
                await self?.clearWeeklyInFlight(key: key, id: requestId)
                throw error
            }
        }

        weeklyInFlight[key] = (id: requestId, task: task)
        return try await task.value
    }

    public func clearCaches() {
        hourlyMemoryCache.removeAll()
        hourlyCacheOrder.removeAll()
        weeklyMemoryCache.removeAll()
    }

    // MARK: - Private Network & Cache Helpers

    private func fetchOpenMeteoForecast(lat: Double, lon: Double) async throws -> OpenMeteoForecastPayload {
        let key = "\(JSCompat.jsFixed(lat, decimals: 3)):\(JSCompat.jsFixed(lon, decimals: 3))"
        let now = nowProvider()

        if let cached = hourlyMemoryCache[key] {
            if now < cached.expiresAt {
                return cached.data
            }
            hourlyMemoryCache.removeValue(forKey: key)
            hourlyCacheOrder.removeAll { $0 == key }
        }

        if let store,
           let stored = try? await store.fetchCachedWeather(
               kind: .hourly,
               cacheKey: key,
               as: OpenMeteoForecastPayload.self,
               now: now,
               allowExpired: false
           ),
           stored.hourly?.time.isEmpty == false {
            storeHourlyMemoryCache(key: key, payload: stored, now: now)
            return stored
        }

        if let existing = hourlyInFlight[key] {
            return try await existing.task.value
        }

        guard var components = URLComponents(url: forecastBaseURL, resolvingAgainstBaseURL: false) else {
            throw WeatherServiceError.invalidURL
        }
        components.queryItems = [
            URLQueryItem(name: "latitude", value: Self.urlCoordString(lat)),
            URLQueryItem(name: "longitude", value: Self.urlCoordString(lon)),
            URLQueryItem(
                name: "hourly",
                value: "temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,is_day,weather_code"
            ),
            URLQueryItem(name: "daily", value: "sunrise,sunset"),
            URLQueryItem(name: "wind_speed_unit", value: "kmh"),
            URLQueryItem(name: "timezone", value: "auto"),
            URLQueryItem(name: "past_days", value: "2"),
            URLQueryItem(name: "forecast_days", value: "14"),
        ]
        guard let url = components.url else {
            throw WeatherServiceError.invalidURL
        }

        let requestId = UUID()
        let session = self.urlSession
        let storeRef = self.store
        let nowFn = self.nowProvider

        let task = Task<OpenMeteoForecastPayload, Error> { [weak self] in
            do {
                var request = URLRequest(url: url, timeoutInterval: Self.requestTimeoutSeconds)
                request.httpMethod = "GET"
                let (data, response) = try await session.data(for: request)
                guard let http = response as? HTTPURLResponse else {
                    throw WeatherServiceError.malformedResponse("Missing HTTP response")
                }
                guard (200...299).contains(http.statusCode) else {
                    throw WeatherServiceError.httpError(statusCode: http.statusCode)
                }

                let decoded = try JSONDecoder().decode(OpenMeteoForecastPayload.self, from: data)
                guard let hourly = decoded.hourly, !hourly.time.isEmpty else {
                    throw WeatherServiceError.malformedResponse("Malformed Open-Meteo response")
                }

                let completedAt = nowFn()
                await self?.storeHourlyMemoryCache(key: key, payload: decoded, now: completedAt)
                if let storeRef {
                    try? await storeRef.saveCachedWeather(
                        kind: .hourly,
                        cacheKey: key,
                        value: decoded,
                        source: "live",
                        ttlSeconds: Self.hourlyCacheTTLSeconds,
                        pinOffline: false,
                        now: completedAt
                    )
                }
                await self?.clearHourlyInFlight(key: key, id: requestId)
                return decoded
            } catch {
                await self?.clearHourlyInFlight(key: key, id: requestId)
                throw error
            }
        }

        hourlyInFlight[key] = (id: requestId, task: task)
        return try await task.value
    }

    private func storeHourlyMemoryCache(
        key: String,
        payload: OpenMeteoForecastPayload,
        now: Date
    ) {
        if hourlyMemoryCache[key] == nil && hourlyMemoryCache.count >= Self.maxHourlyMemoryEntries {
            while hourlyCacheOrder.count >= Self.maxHourlyMemoryEntries {
                let oldest = hourlyCacheOrder.removeFirst()
                hourlyMemoryCache.removeValue(forKey: oldest)
            }
        }
        hourlyCacheOrder.removeAll { $0 == key }
        hourlyCacheOrder.append(key)
        hourlyMemoryCache[key] = (
            data: payload,
            expiresAt: now.addingTimeInterval(Self.hourlyCacheTTLSeconds)
        )
    }

    private func clearHourlyInFlight(key: String, id: UUID) {
        if hourlyInFlight[key]?.id == id {
            hourlyInFlight.removeValue(forKey: key)
        }
    }

    private func storeWeeklyCache(key: String, forecast: WeeklyForecast, now: Date) {
        weeklyMemoryCache[key] = (
            forecast: forecast,
            expiresAt: now.addingTimeInterval(Self.weeklyCacheTTLSeconds)
        )
    }

    private func clearWeeklyInFlight(key: String, id: UUID) {
        if weeklyInFlight[key]?.id == id {
            weeklyInFlight.removeValue(forKey: key)
        }
    }

    private func weeklyCacheKey(lat: Double, lon: Double, now: Date) -> String {
        let today = Self.localTodayIso(now: now, timeZone: timeZone)
        return "\(JSCompat.jsFixed(lat, decimals: 2)):\(JSCompat.jsFixed(lon, decimals: 2)):\(today)"
    }

    private func buildSimulatedTelemetry(
        lat: Double,
        lon: Double,
        targetDate: String,
        targetTime: String,
        routeBearing: Double
    ) -> TelemetryWeather {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone
        let parsedDate = Self.parseLocalDate(targetDate, timeZone: timeZone) ?? nowProvider()
        let month = cal.component(.month, from: parsedDate) // 1...12 (TS getMonth() is 0...11)
        let isSummer = (5...9).contains(month)
        let isWinter = month == 11 || month == 12 || month == 1 || month == 2

        let fallbackTemp = isWinter ? 4.0 : (isSummer ? 19.0 : 11.0)
        let fallbackWind = isWinter ? 18.0 : 14.0
        let fallbackDir = 245.0
        let fallbackPressure = 1015.0
        let rho = Self.calculateAirDensity(tempC: fallbackTemp, pressureHpa: fallbackPressure)

        let angleDiffRad = JSCompat.toRad(fallbackDir - routeBearing)
        let effectiveHeadwind = JSCompat.jsToFixedNumber(fallbackWind * cos(angleDiffRad), decimals: 1)

        let solar = SolarVisibilityEngine.getSolarEphemeris(
            lat: lat,
            lon: lon,
            dateStr: targetDate,
            timeZone: timeZone
        )
        let timeParts = targetTime.split(separator: ":")
        let rawH = timeParts.first.flatMap { Int($0) }
        let rawM = timeParts.count > 1 ? Int(timeParts[1]) : nil
        let h = (rawH == nil || rawH == 0) ? 7 : rawH!
        let m = (rawM == nil || rawM == 0) ? 30 : rawM!
        let targetMin = h * 60 + m
        let srMin = SolarVisibilityEngine.hhmmToMinutes(solar.sunrise)
        let ssMin = SolarVisibilityEngine.hhmmToMinutes(solar.sunset)
        let isDay = targetMin >= srMin && targetMin <= ssMin

        let fallbackVisKm = isWinter ? (targetMin < srMin + 60 ? 2.8 : 4.5) : 18.0

        return TelemetryWeather(
            temperatureC: fallbackTemp,
            relativeHumidity: isWinter ? 85.0 : 70.0,
            recentPrecipitationMm: nil,
            surfacePressureHpa: fallbackPressure,
            airDensityRho: rho,
            windSpeedKmH: fallbackWind,
            windDirectionDegrees: fallbackDir,
            windGustsKmH: JSCompat.jsRound(fallbackWind * 1.5),
            routeBearingDegrees: JSCompat.jsRound(routeBearing),
            effectiveHeadwindKmH: effectiveHeadwind,
            isHeadwindActive: effectiveHeadwind > 2.0,
            timestamp: "\(targetDate)T\(targetTime):00",
            source: .simulated,
            isBeyondForecastWindow: true,
            visibilityKm: fallbackVisKm,
            isDay: isDay,
            weatherCode: isWinter ? 3 : 0,
            sunriseIso: "\(targetDate)T\(solar.sunrise):00",
            sunsetIso: "\(targetDate)T\(solar.sunset):00"
        )
    }

    private nonisolated static func parseLocalDate(_ dateStr: String, timeZone: TimeZone) -> Date? {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone

        let parts = dateStr.split(separator: "-").compactMap { Int($0) }
        if parts.count == 3 {
            var comps = DateComponents()
            comps.year = parts[0]
            comps.month = parts[1]
            comps.day = parts[2]
            comps.hour = 0
            comps.minute = 0
            comps.second = 0
            if let date = cal.date(from: comps) {
                return date
            }
        }

        let isoFormatter = ISO8601DateFormatter()
        if let parsed = isoFormatter.date(from: dateStr) {
            return cal.startOfDay(for: parsed)
        }
        return nil
    }

    private nonisolated static func urlCoordString(_ value: Double) -> String {
        guard value.isFinite else { return "0" }
        if value.truncatingRemainder(dividingBy: 1) == 0, abs(value) < Double(Int64.max) {
            return String(Int64(value))
        }
        return String(value)
    }

    private nonisolated static func finiteDouble(_ array: [Double?]?, at index: Int) -> Double? {
        guard let array, index >= 0, index < array.count,
              let val = array[index], val.isFinite else {
            return nil
        }
        return val
    }

    private nonisolated static func value<T>(_ array: [T?]?, at index: Int) -> T? {
        guard let array, index >= 0, index < array.count else {
            return nil
        }
        return array[index]
    }

    private nonisolated static func stringValue(_ array: [String?]?, at index: Int) -> String? {
        guard let array, index >= 0, index < array.count else {
            return nil
        }
        return array[index]
    }
}
