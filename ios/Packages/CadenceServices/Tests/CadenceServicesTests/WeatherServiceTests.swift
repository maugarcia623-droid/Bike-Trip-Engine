import Foundation
import Testing
import CadenceCore
@testable import CadenceServices

@Suite("WeatherService")
struct WeatherServiceTests {
    private static let fixedTimeZone = TimeZone(identifier: "Europe/Paris")!

    private static func makeUTCDate(_ y: Int, _ m: Int, _ d: Int, _ h: Int = 10) -> Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = fixedTimeZone
        return cal.date(from: DateComponents(year: y, month: m, day: d, hour: h, minute: 0))!
    }

    private static func makeHTTPResponse(url: URL, statusCode: Int = 200) -> HTTPURLResponse {
        HTTPURLResponse(
            url: url,
            statusCode: statusCode,
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": "application/json"]
        )!
    }

    @Test("Pure helpers: computeRouteBearing (one-way, round-trip apex, fallback) & checkForecastHorizon")
    func pureHelpers() {
        // Fallback when < 2 coordinates
        #expect(WeatherService.computeRouteBearing(coordinates: nil) == 280)
        #expect(WeatherService.computeRouteBearing(coordinates: [LatLon(47.2, -1.5)]) == 280)

        // One-way due East
        let eastBearing = WeatherService.computeRouteBearing(coordinates: [
            LatLon(47.2186, -1.5541),
            LatLon(47.2186, -1.0000),
        ])
        #expect(eastBearing >= 89 && eastBearing <= 91)

        // Closed round-trip loop going North then returning to start -> uses apex (~0° North)
        let loopBearing = WeatherService.computeRouteBearing(coordinates: [
            LatLon(47.00, -1.50),
            LatLon(47.20, -1.50), // apex due North
            LatLon(47.10, -1.45),
            LatLon(47.001, -1.50),
        ])
        #expect(loopBearing == 0 || loopBearing == 360 || loopBearing <= 2)

        // Forecast horizon [-2, +14]
        let now = Self.makeUTCDate(2026, 6, 15)
        #expect(WeatherService.checkForecastHorizon(targetDateStr: "2026-06-13", now: now, timeZone: Self.fixedTimeZone) == ForecastHorizonResult(isAvailable: true, daysOffset: -2))
        #expect(WeatherService.checkForecastHorizon(targetDateStr: "2026-06-15", now: now, timeZone: Self.fixedTimeZone) == ForecastHorizonResult(isAvailable: true, daysOffset: 0))
        #expect(WeatherService.checkForecastHorizon(targetDateStr: "2026-06-29", now: now, timeZone: Self.fixedTimeZone) == ForecastHorizonResult(isAvailable: true, daysOffset: 14))
        #expect(WeatherService.checkForecastHorizon(targetDateStr: "2026-06-12", now: now, timeZone: Self.fixedTimeZone).isAvailable == false)
        #expect(WeatherService.checkForecastHorizon(targetDateStr: "2026-06-30", now: now, timeZone: Self.fixedTimeZone).isAvailable == false)
    }

    @Test("Hourly forecast parsing, 6h precipitation accumulation, live vs planned source, and WeatherCondition mapping")
    func hourlyForecastAndRecentPrecip() async throws {
        let capturedQuery = BoxedValue<[URLQueryItem]>([])
        let now = Self.makeUTCDate(2026, 6, 15, 8)
        let targetDate = "2026-06-15"

        let (id, session) = MockURLProtocol.registerSession { request, _ in
            let url = request.url!
            let comp = URLComponents(url: url, resolvingAgainstBaseURL: false)!
            capturedQuery.set(comp.queryItems ?? [])

            // 10 hourly slots 00:00...09:00 on 2026-06-15; target 08:00 is index 8.
            // Indices 2...8 (6h lookback) sum precip: 0.4 + 0.0 + 1.1 + 0.5 + 0.0 + 0.2 + 0.3 = 2.5
            let times = (0..<10).map { String(format: "\(targetDate)T%02d:00", $0) }
            let precip: [Double] = [9.0, 5.0, 0.4, 0.0, 1.1, 0.5, 0.0, 0.2, 0.3, 1.0]
            let payload: [String: Any] = [
                "hourly": [
                    "time": times,
                    "temperature_2m": Array(repeating: 18.4, count: 10),
                    "relative_humidity_2m": Array(repeating: 72.0, count: 10),
                    "precipitation": precip,
                    "surface_pressure": Array(repeating: 1016.2, count: 10),
                    "wind_speed_10m": Array(repeating: 20.0, count: 10),
                    "wind_direction_10m": Array(repeating: 270.0, count: 10),
                    "wind_gusts_10m": Array(repeating: 32.0, count: 10),
                    "visibility": Array(repeating: 18400.0, count: 10),
                    "is_day": Array(repeating: 1, count: 10),
                    "weather_code": Array(repeating: 61, count: 10),
                ],
                "daily": [
                    "time": [targetDate],
                    "sunrise": ["\(targetDate)T06:08"],
                    "sunset": ["\(targetDate)T21:58"],
                ],
            ]
            let data = try JSONSerialization.data(withJSONObject: payload)
            return (Self.makeHTTPResponse(url: url), data)
        }
        defer { MockURLProtocol.unregister(id: id) }

        let service = WeatherService(
            urlSession: session,
            nowProvider: { now },
            timeZone: Self.fixedTimeZone
        )

        let telemetry = try await service.fetchHourlyWeather(
            lat: 47.2186,
            lon: -1.5541,
            targetDate: targetDate,
            targetTime: "08:30",
            routeBearing: 270
        )

        let items = capturedQuery.get()
        #expect(items.first(where: { $0.name == "past_days" })?.value == "2")
        #expect(items.first(where: { $0.name == "forecast_days" })?.value == "14")

        #expect(telemetry.source == .live)
        #expect(telemetry.isBeyondForecastWindow == false)
        #expect(telemetry.temperatureC == 18.0)
        #expect(telemetry.surfacePressureHpa == 1016.0)
        #expect(telemetry.airDensityRho == WeatherService.calculateAirDensity(tempC: 18.0, pressureHpa: 1016.0))
        #expect(telemetry.recentPrecipitationMm == 2.5)
        #expect(telemetry.effectiveHeadwindKmH == 20.0)
        #expect(telemetry.isHeadwindActive == true)
        #expect(telemetry.visibilityKm == 18.4)
        #expect(telemetry.weatherCode == 61)
        #expect(telemetry.sunriseIso == "\(targetDate)T06:08")
        #expect(telemetry.sunsetIso == "\(targetDate)T21:58")

        let cond = telemetry.toWeatherCondition(precipitationRiskPercent: 55)
        #expect(cond.source == "live")
        #expect(cond.windDirection == "headwind")
        #expect(cond.precipitationRiskPercent == 55)
        #expect(cond.recentPrecipitationMm == 2.5)

        // Planned date (+3 days) uses .planned
        let planned = try await service.fetchHourlyWeather(
            lat: 47.2186,
            lon: -1.5541,
            targetDate: "2026-06-18",
            targetTime: "08:00",
            routeBearing: 270
        )
        #expect(planned.source == .planned)
    }

    @Test("Beyond-horizon simulation fallback makes zero HTTP calls and distinguishes winter vs summer")
    func beyondHorizonSimulationFallback() async throws {
        let requestCount = BoxedValue(0)
        let (id, session) = MockURLProtocol.registerSession { request, _ in
            requestCount.mutate { $0 += 1 }
            return (Self.makeHTTPResponse(url: request.url!), Data())
        }
        defer { MockURLProtocol.unregister(id: id) }

        let now = Self.makeUTCDate(2026, 6, 15, 9)
        let service = WeatherService(
            urlSession: session,
            nowProvider: { now },
            timeZone: Self.fixedTimeZone
        )

        let summerSim = try await service.fetchHourlyWeather(
            lat: 47.2186,
            lon: -1.5541,
            targetDate: "2026-07-20",
            targetTime: "10:00",
            routeBearing: 245
        )
        #expect(summerSim.source == .simulated)
        #expect(summerSim.isBeyondForecastWindow == true)
        #expect(summerSim.temperatureC == 19.0)
        #expect(summerSim.windSpeedKmH == 14.0)
        #expect(summerSim.weatherCode == 0)
        #expect(summerSim.sunriseIso != nil)
        #expect(summerSim.sunsetIso != nil)

        let winterSim = try await service.fetchHourlyWeather(
            lat: 47.2186,
            lon: -1.5541,
            targetDate: "2026-12-20",
            targetTime: "07:15",
            routeBearing: 245
        )
        #expect(winterSim.source == .simulated)
        #expect(winterSim.temperatureC == 4.0)
        #expect(winterSim.windSpeedKmH == 18.0)
        #expect(winterSim.weatherCode == 3)
        #expect(requestCount.get() == 0)
    }

    @Test("In-flight deduplication, SwiftData SDCachedWeather persistence, TTL expiry, and weekly forecast errors")
    func deduplicationPersistenceAndWeeklyErrors() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let currentNow = BoxedValue(Self.makeUTCDate(2026, 6, 15, 9))
        let hourlyHits = BoxedValue(0)
        let weeklyHits = BoxedValue(0)
        let weeklyMode = BoxedValue("ok")

        let (id, session) = MockURLProtocol.registerSession { request, _ in
            let url = request.url!
            let query = url.query ?? ""
            if query.contains("hourly=") {
                hourlyHits.mutate { $0 += 1 }
                Thread.sleep(forTimeInterval: 0.03)
                let payload: [String: Any] = [
                    "hourly": [
                        "time": ["2026-06-15T09:00"],
                        "temperature_2m": [16.0],
                        "relative_humidity_2m": [65.0],
                        "precipitation": [0.0],
                        "surface_pressure": [1015.0],
                        "wind_speed_10m": [12.0],
                        "wind_direction_10m": [200.0],
                        "wind_gusts_10m": [18.0],
                        "visibility": [20000.0],
                        "is_day": [1],
                        "weather_code": [1],
                    ],
                    "daily": [
                        "time": ["2026-06-15"],
                        "sunrise": ["2026-06-15T06:08"],
                        "sunset": ["2026-06-15T21:58"],
                    ],
                ]
                return (Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: payload))
            }

            weeklyHits.mutate { $0 += 1 }
            switch weeklyMode.get() {
            case "http500":
                return (Self.makeHTTPResponse(url: url, statusCode: 500), Data())
            case "emptyDaily":
                let payload = ["daily": ["time": [String]()]]
                return (Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: payload))
            default:
                let payload: [String: Any] = [
                    "daily": [
                        "time": ["2026-06-15", "2026-06-16"],
                        "weather_code": [1, 61],
                        "temperature_2m_max": [22.0, 17.0],
                        "temperature_2m_min": [12.0, 10.0],
                        "precipitation_sum": [0.0, 4.5],
                        "precipitation_probability_max": [10.0, 80.0],
                        "wind_speed_10m_max": [15.0, 28.0],
                    ],
                ]
                return (Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: payload))
            }
        }
        defer { MockURLProtocol.unregister(id: id) }

        let service1 = WeatherService(
            urlSession: session,
            store: store,
            nowProvider: { currentNow.get() },
            timeZone: Self.fixedTimeZone
        )

        // Concurrent hourly requests coalesce to 1 HTTP call
        async let a = service1.fetchHourlyWeather(lat: 47.2186, lon: -1.5541, targetDate: "2026-06-15", targetTime: "09:00")
        async let b = service1.fetchHourlyWeather(lat: 47.2186, lon: -1.5541, targetDate: "2026-06-15", targetTime: "09:00")
        let (resA, resB) = try await (a, b)
        #expect(resA == resB)
        #expect(hourlyHits.get() == 1)

        // Fresh WeatherService instance reads persisted .hourly cache from SwiftData without network
        let service2 = WeatherService(
            urlSession: session,
            store: store,
            nowProvider: { currentNow.get() },
            timeZone: Self.fixedTimeZone
        )
        let persistedHourly = try await service2.fetchHourlyWeather(lat: 47.2186, lon: -1.5541, targetDate: "2026-06-15", targetTime: "09:00")
        #expect(persistedHourly.temperatureC == 16.0)
        #expect(hourlyHits.get() == 1)

        // Advance past 600s TTL -> triggers refetch
        currentNow.set(Self.makeUTCDate(2026, 6, 15, 9).addingTimeInterval(605))
        _ = try await service2.fetchHourlyWeather(lat: 47.2186, lon: -1.5541, targetDate: "2026-06-15", targetTime: "09:00")
        #expect(hourlyHits.get() == 2)

        // Weekly fetch & SwiftData persistence
        let weekly = try await service1.fetchWeeklyWeather(lat: 47.2186, lon: -1.5541)
        #expect(weekly.days.count == 2)
        #expect(weekly.days[1].precipitationSumMm == 4.5)
        #expect(weeklyHits.get() == 1)
        #expect(await service2.getCachedWeeklyWeather(lat: 47.2186, lon: -1.5541)?.days.count == 2)

        // Advance past 3600s weekly TTL and test HTTP 500 + malformed response errors
        currentNow.set(Self.makeUTCDate(2026, 6, 15, 9).addingTimeInterval(5000))
        weeklyMode.set("http500")
        await #expect(throws: WeatherServiceError.httpError(statusCode: 500)) {
            _ = try await service2.fetchWeeklyWeather(lat: 47.2186, lon: -1.5541)
        }

        weeklyMode.set("emptyDaily")
        await #expect(throws: WeatherServiceError.malformedResponse("Malformed Open-Meteo daily forecast response")) {
            _ = try await service2.fetchWeeklyWeather(lat: 47.2186, lon: -1.5541)
        }
    }
}
