import Foundation
import Testing
import CadenceCore
@testable import CadenceServices

@Suite("ElevationService")
struct ElevationServiceTests {
    private static func makeHTTPResponse(url: URL, statusCode: Int = 200) -> HTTPURLResponse {
        HTTPURLResponse(
            url: url,
            statusCode: statusCode,
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": "application/json"]
        )!
    }

    @Test("Query params, 5-decimal coordinate formatting, sample clamping (16...60), and totalDistanceKm override")
    func queryParamsAndSampleClamping() async throws {
        let capturedURL = BoxedValue<URL?>(nil)
        let (id, session) = MockURLProtocol.registerSession { request, _ in
            let url = request.url!
            capturedURL.set(url)
            let comp = URLComponents(url: url, resolvingAgainstBaseURL: false)!
            let lats = comp.queryItems?.first(where: { $0.name == "latitude" })?.value?
                .split(separator: ",") ?? []
            let elevations = Array(repeating: 42.0, count: lats.count)
            let data = try JSONSerialization.data(withJSONObject: ["elevation": elevations])
            return (Self.makeHTTPResponse(url: url), data)
        }
        defer { MockURLProtocol.unregister(id: id) }

        let service = ElevationService(urlSession: session)
        let coords = [
            LatLon(47.2186123, -1.5541234),
            LatLon(47.2734567, -2.2139876),
        ]
        // Short override: 5 km * 1.5 = 7.5 -> clamped to min 16 samples
        let shortResult = await service.fetchDemElevationProfile(
            coordinates: coords,
            totalDistanceKm: 5.0
        )
        let shortProfile = try #require(shortResult)
        #expect(shortProfile.elevationProfile.count == 16)
        #expect(shortProfile.elevationProfile.first?.distKm == 0.0)
        #expect(shortProfile.elevationProfile.last?.distKm == 5.0)

        let url = try #require(capturedURL.get())
        let comp = try #require(URLComponents(url: url, resolvingAgainstBaseURL: false))
        #expect(comp.path.hasSuffix("/v1/elevation"))
        let latList = comp.queryItems?.first(where: { $0.name == "latitude" })?.value?.split(separator: ",") ?? []
        let lonList = comp.queryItems?.first(where: { $0.name == "longitude" })?.value?.split(separator: ",") ?? []
        #expect(latList.count == 16)
        #expect(lonList.count == 16)
        #expect(String(latList.first!) == "47.21861")
        #expect(String(lonList.first!) == "-1.55412")

        // Long override: 80 km * 1.5 = 120 -> clamped to max 60 samples
        let longResult = await service.fetchDemElevationProfile(
            coordinates: [LatLon(47.10, -1.50), LatLon(47.50, -2.10)],
            totalDistanceKm: 80.0
        )
        #expect(longResult?.elevationProfile.count == 60)
        #expect(longResult?.elevationProfile.last?.distKm == 80.0)
    }

    @Test("3-point weighted smoothing, 2m hysteresis gain/loss, and [-25, 25]% grade clamp")
    func smoothingHysteresisAndGradeClamp() async throws {
        let (id, session) = MockURLProtocol.registerSession { request, _ in
            let url = request.url!
            // 16 samples: flat start with sub-2m ripples (100, 101.2, 100.3, 100.9, 100.2),
            // steep climb (+100m over ~133m -> ~37.5% after smoothing -> clamped to 25%),
            // peak at 200, steep drop back to 100
            let raw: [Double] = [
                100.0, 101.2, 100.3, 100.9, 100.2,
                100.0, 200.0, 200.0, 200.0, 100.0,
                100.0, 101.0, 100.1, 100.0, 100.0, 100.0,
            ]
            let data = try JSONSerialization.data(withJSONObject: ["elevation": raw])
            return (Self.makeHTTPResponse(url: url), data)
        }
        defer { MockURLProtocol.unregister(id: id) }

        let service = ElevationService(urlSession: session)
        let result = try #require(await service.fetchDemElevationProfile(
            coordinates: [LatLon(47.2000, -1.5000), LatLon(47.2180, -1.5000)],
            totalDistanceKm: 2.0
        ))

        // Verify 3-pt smoothing at endpoints & interior
        #expect(result.elevationProfile.count == 16)
        // index 0: 0.75 * 100 + 0.25 * 101.2 = 100.3
        #expect(result.elevationProfile[0].eleM == 100.3)
        // index 6: 0.25 * 100 + 0.5 * 200 + 0.25 * 200 = 175.0
        #expect(result.elevationProfile[6].eleM == 175.0)
        // index 7: 0.25 * 200 + 0.5 * 200 + 0.25 * 200 = 200.0
        #expect(result.elevationProfile[7].eleM == 200.0)

        // Sub-2m ripples are filtered by 2m hysteresis: net climb is 100 -> 200 = 100m
        #expect(result.elevationGainM == 100)
        #expect(result.elevationLossM == 100)

        // Check grade clamp [-25, 25]
        let maxGrade = result.elevationProfile.map(\.gradePct).max() ?? 0
        let minGrade = result.elevationProfile.map(\.gradePct).min() ?? 0
        #expect(maxGrade <= 25.0)
        #expect(minGrade >= -25.0)
        #expect(maxGrade == 25.0)
        #expect(minGrade == -25.0)
    }

    @Test("30-entry LRU cache hits and evicts oldest untouched route")
    func lruCacheBehavior() async throws {
        let requestCount = BoxedValue(0)
        let (id, session) = MockURLProtocol.registerSession { request, _ in
            requestCount.mutate { $0 += 1 }
            let url = request.url!
            let comp = URLComponents(url: url, resolvingAgainstBaseURL: false)!
            let count = comp.queryItems?.first(where: { $0.name == "latitude" })?.value?
                .split(separator: ",").count ?? 16
            let data = try JSONSerialization.data(
                withJSONObject: ["elevation": Array(repeating: 25.0, count: count)]
            )
            return (Self.makeHTTPResponse(url: url), data)
        }
        defer { MockURLProtocol.unregister(id: id) }

        let service = ElevationService(urlSession: session)

        func route(_ index: Int) -> [LatLon] {
            let latOffset = Double(index) * 0.01
            return [LatLon(47.0 + latOffset, -1.5), LatLon(47.0 + latOffset, -1.4)]
        }

        // Insert routes 0...29 (30 entries)
        for i in 0..<30 {
            let res = await service.fetchDemElevationProfile(coordinates: route(i), totalDistanceKm: 10)
            #expect(res != nil)
        }
        #expect(requestCount.get() == 30)

        // Touch route 0 (makes route 0 most recent; route 1 is now LRU)
        _ = await service.fetchDemElevationProfile(coordinates: route(0), totalDistanceKm: 10)
        #expect(requestCount.get() == 30)

        // Insert route 30 -> evicts route 1 (not route 0)
        _ = await service.fetchDemElevationProfile(coordinates: route(30), totalDistanceKm: 10)
        #expect(requestCount.get() == 31)

        // Route 0 should still be cached
        _ = await service.fetchDemElevationProfile(coordinates: route(0), totalDistanceKm: 10)
        #expect(requestCount.get() == 31)

        // Route 1 was evicted, so fetching it hits network again
        _ = await service.fetchDemElevationProfile(coordinates: route(1), totalDistanceKm: 10)
        #expect(requestCount.get() == 32)
    }

    @Test("Returns nil gracefully on <2 coords, HTTP 500, malformed/null elevation JSON, or timeout")
    func errorAndInvalidInputHandling() async {
        let mode = BoxedValue<String>("http500")
        let (id, session) = MockURLProtocol.registerSession { request, _ in
            let url = request.url!
            switch mode.get() {
            case "http500":
                return (Self.makeHTTPResponse(url: url, statusCode: 500), Data())
            case "malformed":
                return (Self.makeHTTPResponse(url: url), Data("not-json".utf8))
            case "mismatch":
                let data = try JSONSerialization.data(withJSONObject: ["elevation": [10.0, 20.0]])
                return (Self.makeHTTPResponse(url: url), data)
            case "nullElement":
                let arr: [Any] = Array(repeating: 10.0, count: 15) + [NSNull()]
                let data = try JSONSerialization.data(withJSONObject: ["elevation": arr])
                return (Self.makeHTTPResponse(url: url), data)
            default:
                throw URLError(.timedOut)
            }
        }
        defer { MockURLProtocol.unregister(id: id) }

        let service = ElevationService(urlSession: session)
        let coords = [LatLon(47.2186, -1.5541), LatLon(47.2734, -2.2139)]

        // < 2 coordinates
        #expect(await service.fetchDemElevationProfile(coordinates: [LatLon(47.2, -1.5)]) == nil)
        // Identical coordinates (zero distance)
        #expect(await service.fetchDemElevationProfile(coordinates: [LatLon(47.2, -1.5), LatLon(47.2, -1.5)]) == nil)

        mode.set("http500")
        #expect(await service.fetchDemElevationProfile(coordinates: coords, totalDistanceKm: 10) == nil)

        mode.set("malformed")
        #expect(await service.fetchDemElevationProfile(coordinates: coords, totalDistanceKm: 10) == nil)

        mode.set("mismatch")
        #expect(await service.fetchDemElevationProfile(coordinates: coords, totalDistanceKm: 10) == nil)

        mode.set("nullElement")
        #expect(await service.fetchDemElevationProfile(coordinates: coords, totalDistanceKm: 10) == nil)

        mode.set("timeout")
        #expect(await service.fetchDemElevationProfile(coordinates: coords, totalDistanceKm: 10) == nil)
    }
}
