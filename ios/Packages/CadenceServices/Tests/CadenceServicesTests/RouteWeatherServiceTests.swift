import Foundation
import Testing
import CadenceCore
@testable import CadenceServices

@Suite("RouteWeatherService")
struct RouteWeatherServiceTests {
    private static let fixedTimeZone = TimeZone(identifier: "Europe/Paris")!

    private static func makeUTCDate(_ y: Int, _ m: Int, _ d: Int, _ h: Int = 8) -> Date {
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

    private static func makeTrip(
        id: String = "trip-1",
        coordinates: [LatLon]?,
        distanceKm: Double = 30.0,
        targetSpeedKmH: Double = 24.0
    ) -> TripProfile {
        TripProfile(
            id: id,
            name: "Test Loop",
            tag: "loop",
            physics: PhysicsParams(gradientPercent: 0.5),
            route: RouteParams(
                distanceKm: distanceKm,
                targetSpeedKmH: targetSpeedKmH,
                pacingMode: "speed",
                coordinates: coordinates
            ),
            weather: WeatherCondition(
                isHeadwindActive: false,
                baseWindSpeedKmH: 12,
                windDirection: "calm",
                windDirectionDegrees: 270,
                temperatureC: 14,
                precipitationRiskPercent: 10,
                estuaryGustKmH: 18,
                visibilityKm: 15
            )
        )
    }

    @Test("buildSectorCacheKey parity with TS & addMinutesHHMM midnight rollover")
    func cacheKeyAndMidnightRollover() {
        let coords = [LatLon(47.2186, -1.5541), LatLon(47.2734, -2.2139)]
        let trip = Self.makeTrip(id: "stage-99", coordinates: coords, distanceKm: 36.44, targetSpeedKmH: 25.0)

        let keyNoFtp = RouteWeatherService.buildSectorCacheKey(
            trip: trip,
            targetDate: "2026-06-15",
            departureTime: "08:30",
            lang: .en
        )
        #expect(keyNoFtp == "stage-99:364:47.219,-1.554:47.273,-2.214:2026-06-15:08:30:25:speed:en:0")

        let keyWithFtp = RouteWeatherService.buildSectorCacheKey(
            trip: trip,
            targetDate: "2026-06-15",
            departureTime: "08:30",
            lang: .fr,
            ftpWatts: 245.4
        )
        #expect(keyWithFtp == "stage-99:364:47.219,-1.554:47.273,-2.214:2026-06-15:08:30:25:speed:fr:245")

        let invalidTrip = Self.makeTrip(coordinates: [LatLon(47.2, -1.5)])
        #expect(RouteWeatherService.buildSectorCacheKey(trip: invalidTrip, targetDate: "2026-06-15", departureTime: "08:30") == nil)

        // addMinutesHHMM midnight rollover parity
        let r1 = RouteWeatherService.addMinutesHHMM("22:15", addMin: 150)
        #expect(r1.hhmm == "00:45")
        #expect(r1.hour == 0)
        #expect(r1.dayOffset == 1)

        let r2 = RouteWeatherService.addMinutesHHMM("23:00", addMin: 1500)
        #expect(r2.hhmm == "00:00")
        #expect(r2.hour == 0)
        #expect(r2.dayOffset == 2)
    }

    @Test("Loop orientation detection: clockwise, anticlockwise, out-and-back, and linear")
    func loopOrientationDetection() {
        let cwSquare = [
            LatLon(47.20, -1.50),
            LatLon(47.25, -1.50),
            LatLon(47.25, -1.45),
            LatLon(47.20, -1.45),
            LatLon(47.20, -1.50),
        ]
        let cw = RouteWeatherService.detectLoopOrientation(cwSquare)
        #expect(cw.isLoop == true)
        #expect(cw.orientation == .clockwise)

        let ccw = RouteWeatherService.detectLoopOrientation(cwSquare.reversed())
        #expect(ccw.isLoop == true)
        #expect(ccw.orientation == .anticlockwise)

        let outAndBack = [
            LatLon(47.20, -1.50),
            LatLon(47.25, -1.50),
            LatLon(47.20, -1.50),
            LatLon(47.20, -1.50),
        ]
        let oab = RouteWeatherService.detectLoopOrientation(outAndBack)
        #expect(oab.isLoop == true)
        #expect(oab.orientation == .outAndBack)

        let linear = [
            LatLon(47.20, -1.50),
            LatLon(47.30, -1.50),
            LatLon(47.40, -1.50),
            LatLon(47.50, -1.50),
        ]
        let lin = RouteWeatherService.detectLoopOrientation(linear)
        #expect(lin.isLoop == false)
    }

    @Test("Batch Open-Meteo array vs single object, loop wind direction recommendation, and SwiftData sector caching")
    func batchAnalysisLoopWindAndPersistence() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let now = Self.makeUTCDate(2026, 6, 15, 8)
        let targetDate = "2026-06-15"
        let requestCount = BoxedValue(0)
        let responseMode = BoxedValue("array")

        // Construct a clockwise square loop with climbing grade on early legs:
        // Forward rides steep climb first vs reverse flips grades (-gradePct), creating clear wattage/time difference!
        let loopCoords = [
            LatLon(47.20, -1.50),
            LatLon(47.24, -1.50),
            LatLon(47.24, -1.44),
            LatLon(47.20, -1.44),
            LatLon(47.20, -1.50),
        ]
        let elevProfile = [
            ElevationProfilePoint(distKm: 0.0, eleM: 10.0, gradePct: 0),
            ElevationProfilePoint(distKm: 6.0, eleM: 310.0, gradePct: 5),
            ElevationProfilePoint(distKm: 12.0, eleM: 460.0, gradePct: 2.5),
            ElevationProfilePoint(distKm: 18.0, eleM: 250.0, gradePct: -3.5),
            ElevationProfilePoint(distKm: 24.0, eleM: 10.0, gradePct: -4),
        ]
        var trip = Self.makeTrip(id: "loop-wind-1", coordinates: loopCoords, distanceKm: 24.0, targetSpeedKmH: 24.0)
        trip.route.elevationProfile = elevProfile

        let (id, session) = MockURLProtocol.registerSession { request, _ in
            requestCount.mutate { $0 += 1 }
            let url = request.url!
            let comp = URLComponents(url: url, resolvingAgainstBaseURL: false)!
            let sectorPoints = comp.queryItems?.first(where: { $0.name == "latitude" })?.value?
                .split(separator: ",").count ?? 4

            func pointPayload(temp: Double, precipProb: Double, windDir: Double) -> [String: Any] {
                [
                    "hourly": [
                        "time": ["\(targetDate)T08:00", "\(targetDate)T09:00", "\(targetDate)T10:00"],
                        "temperature_2m": [temp, temp + 1.0, temp + 2.0],
                        "relative_humidity_2m": [80.0, 75.0, 70.0],
                        "surface_pressure": [1012.0, 1012.0, 1012.0],
                        "wind_speed_10m": [28.0, 28.0, 28.0],
                        "wind_direction_10m": [windDir, windDir, windDir],
                        "wind_gusts_10m": [38.0, 38.0, 38.0],
                        "precipitation_probability": [precipProb, precipProb, precipProb],
                        "visibility": [12000.0, 14000.0, 16000.0],
                        "is_day": [1, 1, 1],
                        "weather_code": [3, 2, 1],
                    ],
                ]
            }

            switch responseMode.get() {
            case "singleObjectMismatch":
                // Single JSON object when 4 sectors were requested -> count mismatch -> simulated
                let data = try JSONSerialization.data(withJSONObject: pointPayload(temp: 10, precipProb: 40, windDir: 270))
                return (Self.makeHTTPResponse(url: url), data)
            default:
                // Sector 0 cold & dry, Sector 2 warm & wettest, steady WNW wind
                let items = (0..<sectorPoints).map { idx in
                    pointPayload(
                        temp: idx == 0 ? 7.0 : 13.0,
                        precipProb: idx == 2 ? 75.0 : 15.0,
                        windDir: idx < 2 ? 0.0 : 180.0
                    )
                }
                let data = try JSONSerialization.data(withJSONObject: items)
                return (Self.makeHTTPResponse(url: url), data)
            }
        }
        defer { MockURLProtocol.unregister(id: id) }

        let service = RouteWeatherService(
            urlSession: session,
            store: store,
            nowProvider: { now },
            timeZone: Self.fixedTimeZone
        )

        let analysis = try #require(await service.analyzeRouteWeather(
            trip: trip,
            targetDate: targetDate,
            departureTime: "08:00",
            lang: .en
        ))

        #expect(requestCount.get() == 1)
        #expect(analysis.source == .live)
        #expect(analysis.sectors.count == 4)
        #expect(analysis.loopComparison.isLoop == true)
        #expect(analysis.loopComparison.forwardOrientation == .clockwise)
        #expect(analysis.coldestSector.index == 0)
        #expect(analysis.wettestSector.index == 2)
        #expect(analysis.worstCaseWeather.precipitationRiskPercent == 75.0)
        #expect(analysis.coldestSectorLabel.contains("Coldest stretch: KM 0–6"))

        // Verify persisted in SwiftData SDCachedWeather (.sector) and readable from fresh instance
        let key = try #require(RouteWeatherService.buildSectorCacheKey(
            trip: trip,
            targetDate: targetDate,
            departureTime: "08:00",
            lang: .en
        ))
        let freshService = RouteWeatherService(
            urlSession: session,
            store: store,
            nowProvider: { now },
            timeZone: Self.fixedTimeZone
        )
        let cachedFromStore = try #require(await freshService.getCachedRouteSectorForecast(
            trip: trip,
            targetDate: targetDate,
            departureTime: "08:00",
            lang: .en
        ))
        #expect(cachedFromStore == analysis)
        let directStoreRow = try await store.fetchCachedWeather(kind: .sector, cacheKey: key, as: RouteWeatherAnalysis.self, now: now)
        #expect(directStoreRow == analysis)

        // Single JSON object count mismatch falls back to .simulated (or persisted fallback if present)
        responseMode.set("singleObjectMismatch")
        let linearTrip = Self.makeTrip(
            id: "linear-mismatch",
            coordinates: [LatLon(47.20, -1.50), LatLon(47.40, -1.50)],
            distanceKm: 24.0
        )
        let mismatchAnalysis = try #require(await service.fetchRouteSectorForecast(
            trip: linearTrip,
            targetDate: targetDate,
            departureTime: "08:00",
            lang: .fr
        ))
        #expect(mismatchAnalysis.source == .simulated)
        #expect(mismatchAnalysis.coldestSectorLabel.hasPrefix("Secteur le plus frais"))

        // Offline fallback returns expired persisted .live forecast when allowExpired/offline
        let expiredNow = now.addingTimeInterval(30_000)
        let offlineService = RouteWeatherService(
            urlSession: session,
            store: store,
            nowProvider: { expiredNow },
            timeZone: Self.fixedTimeZone
        )
        let offlineHit = try #require(await offlineService.fetchRouteSectorForecast(
            trip: trip,
            targetDate: targetDate,
            departureTime: "08:00",
            lang: .en,
            isOffline: true
        ))
        #expect(offlineHit.source == .live)
    }
}
