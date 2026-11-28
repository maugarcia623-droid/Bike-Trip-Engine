import Foundation
import Testing
import CadenceCore
@testable import CadenceServices

private struct MockLocalSearchProvider: LocalSearchProviding {
    let calls: BoxedList<String>
    let results: [LocationSuggestion]

    func search(query: String, biasCoords: LatLon?, limit: Int) async throws -> [LocationSuggestion] {
        calls.append(query)
        return Array(results.prefix(limit))
    }
}

private final class VirtualClock: @unchecked Sendable {
    private let lock = NSLock()
    private var currentOffset: Duration = .zero
    private let base = ContinuousClock.now
    private var sleepLog: [Duration] = []

    func now() -> ContinuousClock.Instant {
        lock.withLock { base + currentOffset }
    }

    func sleep(_ duration: Duration) async throws {
        lock.withLock {
            sleepLog.append(duration)
            currentOffset += duration
        }
    }

    func recordedSleeps() -> [Duration] {
        lock.withLock { sleepLog }
    }
}

private final class AsyncDelayURLProtocol: URLProtocol, @unchecked Sendable {
    typealias Handler = @Sendable (URLRequest) throws -> (delay: TimeInterval, response: HTTPURLResponse, data: Data)

    private static let mockIDHeader = "X-Cadence-Async-Mock-ID"
    private static let lock = NSLock()
    private nonisolated(unsafe) static var handlers: [String: Handler] = [:]

    private let stateLock = NSLock()
    private var pendingWorkItem: DispatchWorkItem?
    private var stopped = false

    static func registerSession(handler: @escaping Handler) -> (id: String, session: URLSession) {
        let id = UUID().uuidString
        lock.withLock {
            handlers[id] = handler
        }
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [AsyncDelayURLProtocol.self]
        config.httpAdditionalHeaders = [mockIDHeader: id]
        return (id, URLSession(configuration: config))
    }

    static func unregister(id: String) {
        lock.withLock {
            _ = handlers.removeValue(forKey: id)
        }
    }

    private static func handler(for request: URLRequest) -> Handler? {
        guard let id = request.value(forHTTPHeaderField: mockIDHeader) else { return nil }
        return lock.withLock { handlers[id] }
    }

    override class func canInit(with request: URLRequest) -> Bool {
        request.value(forHTTPHeaderField: mockIDHeader) != nil
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        guard let handler = Self.handler(for: request) else {
            client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
            return
        }

        do {
            let (delay, response, data) = try handler(request)
            if delay <= 0 {
                let isStopped = stateLock.withLock { stopped }
                guard !isStopped else { return }
                client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                client?.urlProtocol(self, didLoad: data)
                client?.urlProtocolDidFinishLoading(self)
                return
            }

            let workItem = DispatchWorkItem { [weak self] in
                guard let self else { return }
                let isStopped = self.stateLock.withLock { self.stopped }
                guard !isStopped else { return }
                self.client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                self.client?.urlProtocol(self, didLoad: data)
                self.client?.urlProtocolDidFinishLoading(self)
            }
            let shouldSchedule = stateLock.withLock { () -> Bool in
                if stopped { return false }
                pendingWorkItem = workItem
                return true
            }
            if shouldSchedule {
                DispatchQueue.global(qos: .userInitiated).asyncAfter(deadline: .now() + delay, execute: workItem)
            }
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {
        let item = stateLock.withLock { () -> DispatchWorkItem? in
            stopped = true
            let current = pendingWorkItem
            pendingWorkItem = nil
            return current
        }
        item?.cancel()
    }
}

@Suite("LocationSearchService")
struct LocationSearchServiceTests {
    private static func makeHTTPResponse(url: URL, statusCode: Int = 200) -> HTTPURLResponse {
        HTTPURLResponse(
            url: url,
            statusCode: statusCode,
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": "application/json"]
        )!
    }

    private static func banFeature(id: String, name: String, city: String, lat: Double, lon: Double, type: String = "housenumber") -> [String: Any] {
        [
            "type": "Feature",
            "geometry": ["type": "Point", "coordinates": [lon, lat]],
            "properties": [
                "id": id,
                "name": name,
                "label": "\(name), 44000 \(city)",
                "city": city,
                "postcode": "44000",
                "context": "44, Loire-Atlantique, Pays de la Loire",
                "type": type,
            ],
        ]
    }

    private static func photonFeature(osmId: Int64, name: String, city: String, lat: Double, lon: Double, type: String = "station") -> [String: Any] {
        [
            "type": "Feature",
            "geometry": ["type": "Point", "coordinates": [lon, lat]],
            "properties": [
                "osm_type": "N",
                "osm_id": osmId,
                "name": name,
                "city": city,
                "postcode": "44000",
                "county": "Loire-Atlantique",
                "state": "Pays de la Loire",
                "country": "France",
                "type": type,
            ],
        ]
    }

    @Test("Short query < 2 chars returns empty with zero HTTP calls; 120-entry cache FIFO eviction")
    func shortQueryAndCacheEviction() async throws {
        let hitCount = BoxedValue(0)
        let (id, session) = MockURLProtocol.registerSession { request, _ in
            hitCount.mutate { $0 += 1 }
            let url = request.url!
            let host = url.host ?? ""
            if host.contains("data.geopf.fr") {
                let comp = URLComponents(url: url, resolvingAgainstBaseURL: false)!
                let q = comp.queryItems?.first(where: { $0.name == "q" })?.value ?? "Place"
                let idx = abs(q.hashValue % 100)
                let body = ["features": [Self.banFeature(id: "id-\(q)", name: q, city: "Nantes", lat: 47.0 + Double(idx) * 0.01, lon: -1.5)]]
                return (Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: body))
            }
            return (Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: ["features": [Any]()]))
        }
        defer { MockURLProtocol.unregister(id: id) }

        let service = LocationSearchService(urlSession: session, localSearchProvider: nil)

        // < 2 chars -> empty, 0 network calls
        #expect(try await service.searchLocationSuggestions("a").isEmpty)
        #expect(try await service.searchLocationSuggestions("   ").isEmpty)
        #expect(hitCount.get() == 0)

        // Insert 120 unique queries (0...119)
        for i in 0..<120 {
            let res = try await service.searchLocationSuggestions("Query\(i)")
            #expect(res.count == 1)
        }
        let hitsAfter120 = hitCount.get()

        // Query0 should hit cache (0 additional HTTP requests)
        _ = try await service.searchLocationSuggestions("query0")
        #expect(hitCount.get() == hitsAfter120)

        // Insert 121st query -> evicts Query0
        _ = try await service.searchLocationSuggestions("Query120")
        let hitsAfter121 = hitCount.get()
        #expect(hitsAfter121 > hitsAfter120)

        // Query1 is still cached
        _ = try await service.searchLocationSuggestions("Query1")
        #expect(hitCount.get() == hitsAfter121)

        // Query0 was evicted -> triggers HTTP request again
        _ = try await service.searchLocationSuggestions("Query0")
        #expect(hitCount.get() > hitsAfter121)
    }

    @Test("BAN + Photon smart ordering (address vs POI vs general), coordinate deduplication, and limit")
    func smartOrderingAndDeduplication() async throws {
        let (id, session) = MockURLProtocol.registerSession { request, _ in
            let url = request.url!
            let host = url.host ?? ""
            if host.contains("data.geopf.fr") {
                let body: [String: Any] = [
                    "features": [
                        Self.banFeature(id: "b1", name: "12 Rue de la Paix", city: "Nantes", lat: 47.2140, lon: -1.5520),
                        Self.banFeature(id: "b2", name: "Rue de la Paix Sud", city: "Nantes", lat: 47.2100, lon: -1.5500, type: "street"),
                    ],
                ]
                return (Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: body))
            }
            if host.contains("photon.komoot.io") {
                let body: [String: Any] = [
                    "features": [
                        // Shares toFixed(3) coordinate 47.214,-1.552 with b1 -> deduped when BAN comes first!
                        Self.photonFeature(osmId: 101, name: "12 Rue de la Paix Photon", city: "Nantes", lat: 47.2142, lon: -1.5521),
                        Self.photonFeature(osmId: 102, name: "Gare de Nantes", city: "Nantes", lat: 47.2174, lon: -1.5434),
                    ],
                ]
                return (Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: body))
            }
            return (Self.makeHTTPResponse(url: url), Data("[]".utf8))
        }
        defer { MockURLProtocol.unregister(id: id) }

        let service = LocationSearchService(urlSession: session, localSearchProvider: nil)

        // Address query -> BAN prioritized
        let addrResults = try await service.searchLocationSuggestions("12 rue de la paix", options: SearchLocationOptions(limit: 5))
        #expect(addrResults.first?.source == .ban)
        // Duplicate at 47.214,-1.552 was dropped -> b1, b2, and Gare de Nantes = 3 items
        #expect(addrResults.count == 3)

        // POI query -> Photon prioritized
        let poiResults = try await service.searchLocationSuggestions("Gare de Nantes", options: SearchLocationOptions(limit: 5))
        #expect(poiResults.first?.source == .photon)
        #expect(poiResults.count == 3)

        // General query -> [ban[0]] + photon + ban.dropFirst()
        let generalResults = try await service.searchLocationSuggestions("Nantes centre", options: SearchLocationOptions(limit: 2))
        #expect(generalResults.count == 2)
        #expect(generalResults[0].source == .ban)
        #expect(generalResults[1].source == .photon)
    }

    @Test("Photon 500ms grace window cuts off slow Photon promptly only when BAN has results")
    func photonGraceWindow() async throws {
        let banEmpty = BoxedValue(false)
        let photonDelaySeconds = BoxedValue(0.6)
        let (id, session) = AsyncDelayURLProtocol.registerSession { request in
            let url = request.url!
            let host = url.host ?? ""
            if host.contains("data.geopf.fr") {
                if banEmpty.get() {
                    return (0, Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: ["features": [Any]()]))
                }
                let body = ["features": [Self.banFeature(id: "b1", name: "Place Royale", city: "Nantes", lat: 47.214, lon: -1.558)]]
                return (0, Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: body))
            }
            if host.contains("photon.komoot.io") {
                let body = ["features": [Self.photonFeature(osmId: 202, name: "Slow Photon POI", city: "Nantes", lat: 47.220, lon: -1.560)]]
                return (photonDelaySeconds.get(), Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: body))
            }
            return (0, Self.makeHTTPResponse(url: url), Data("[]".utf8))
        }
        defer { AsyncDelayURLProtocol.unregister(id: id) }

        let service = LocationSearchService(
            urlSession: session,
            localSearchProvider: nil,
            photonGraceWindow: .milliseconds(50),
            photonTimeout: .seconds(2)
        )

        // BAN succeeds immediately, Photon delays 600ms (> 50ms grace) -> returns BAN promptly (< 250ms)
        banEmpty.set(false)
        photonDelaySeconds.set(0.6)
        let graceStart = ContinuousClock.now
        let fastBan = try await service.searchLocationSuggestions("Place Royale")
        let graceElapsed = ContinuousClock.now - graceStart
        #expect(fastBan.count == 1)
        #expect(fastBan[0].source == .ban)
        #expect(graceElapsed < .milliseconds(250))

        // BAN returns empty -> waits for slow Photon (< 2s timeout)
        banEmpty.set(true)
        photonDelaySeconds.set(0.15)
        let waitedPhoton = try await service.searchLocationSuggestions("Slow POI")
        #expect(waitedPhoton.count == 1)
        #expect(waitedPhoton[0].source == .photon)

        // Outer task cancellation while awaiting Photon in else branch (BAN empty) cancels promptly (< 250ms)
        photonDelaySeconds.set(0.6)
        let cancelStart = ContinuousClock.now
        let outerTask = Task {
            try await service.searchLocationSuggestions("Cancelled Slow POI")
        }
        try await Task.sleep(for: .milliseconds(30))
        outerTask.cancel()
        var didCancel = false
        do {
            _ = try await outerTask.value
        } catch is CancellationError {
            didCancel = true
        }
        let cancelElapsed = ContinuousClock.now - cancelStart
        #expect(didCancel)
        #expect(cancelElapsed < .milliseconds(250))
    }

    @Test("Nominatim fallback sends User-Agent & Accept-Language and enforces 1 req/sec actor-reentrancy-safe throttle")
    func nominatimFallbackHeadersAndThrottle() async throws {
        let capturedNominatimRequests = BoxedList<URLRequest>()
        let clock = VirtualClock()

        let (id, session) = MockURLProtocol.registerSession { request, _ in
            let url = request.url!
            let host = url.host ?? ""
            if host.contains("nominatim.openstreetmap.org") {
                capturedNominatimRequests.append(request)
                let item: [String: Any] = [
                    "place_id": 999,
                    "lat": "47.2186",
                    "lon": "-1.5541",
                    "name": "Nantes",
                    "display_name": "Nantes, Loire-Atlantique, Pays de la Loire, France",
                    "type": "city",
                    "address": ["city": "Nantes", "county": "Loire-Atlantique"],
                ]
                return (Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: [item]))
            }
            return (Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: ["features": [Any]()]))
        }
        defer { MockURLProtocol.unregister(id: id) }

        let service = LocationSearchService(
            urlSession: session,
            userAgent: "CadenceTest/1.0 (https://ridecadence.cc)",
            localSearchProvider: nil,
            nominatimMinInterval: .seconds(1),
            now: { clock.now() },
            sleeper: { try await clock.sleep($0) }
        )

        // Fire 2 sequential Nominatim searches -> 2nd must trigger 1.0s throttle sleep
        let r1 = try await service.searchLocationSuggestions("UnknownAlpha", options: SearchLocationOptions(lang: .fr))
        let r2 = try await service.searchLocationSuggestions("UnknownBeta", options: SearchLocationOptions(lang: .en))
        #expect(r1.first?.source == .nominatim)
        #expect(r2.first?.source == .nominatim)

        // Fire 2 concurrent Nominatim searches -> actor re-entrancy reserves distinct >= 1.0s slots
        async let c1 = service.searchLocationSuggestions("UnknownGamma", options: SearchLocationOptions(lang: .fr))
        async let c2 = service.searchLocationSuggestions("UnknownDelta", options: SearchLocationOptions(lang: .fr))
        _ = try await (c1, c2)

        let reqs = capturedNominatimRequests.snapshot()
        try #require(reqs.count == 4)
        #expect(reqs[0].value(forHTTPHeaderField: "User-Agent") == "CadenceTest/1.0 (https://ridecadence.cc)")
        #expect(reqs[0].value(forHTTPHeaderField: "Accept-Language") == "fr,en")
        #expect(reqs[1].value(forHTTPHeaderField: "Accept-Language") == "en,en")

        let sleeps = clock.recordedSleeps()
        #expect(sleeps.filter { $0 >= .seconds(1) }.count >= 3)
    }

    @Test("LocalSearchProviding (MKLocalSearch) hook runs only when all HTTP providers return empty")
    func localSearchFallbackHook() async throws {
        let mkCalls = BoxedList<String>()
        let mkProvider = MockLocalSearchProvider(
            calls: mkCalls,
            results: [
                LocationSuggestion(
                    id: "mk-1",
                    name: "Boulangerie Du Coin, Nantes",
                    secondaryText: "44000 Nantes",
                    fullDisplayName: "Boulangerie Du Coin, 44000 Nantes",
                    coordinates: LatLon(47.219, -1.555),
                    type: "bakery",
                    source: .mapkit
                ),
            ]
        )

        let returnBan = BoxedValue(true)
        let (id, session) = MockURLProtocol.registerSession { request, _ in
            let url = request.url!
            let host = url.host ?? ""
            if returnBan.get() && host.contains("data.geopf.fr") {
                let body = ["features": [Self.banFeature(id: "b1", name: "Nantes", city: "Nantes", lat: 47.218, lon: -1.554)]]
                return (Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: body))
            }
            if host.contains("nominatim.openstreetmap.org") {
                return (Self.makeHTTPResponse(url: url), Data("[]".utf8))
            }
            return (Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: ["features": [Any]()]))
        }
        defer { MockURLProtocol.unregister(id: id) }

        let service = LocationSearchService(urlSession: session, localSearchProvider: mkProvider)

        // BAN succeeds -> MKLocalSearch NOT called
        returnBan.set(true)
        let banHit = try await service.searchLocationSuggestions("Nantes")
        #expect(banHit.first?.source == .ban)
        #expect(mkCalls.snapshot().isEmpty)

        // All HTTP providers empty -> MKLocalSearch invoked
        returnBan.set(false)
        let mkHit = try await service.searchLocationSuggestions("Boulangerie Du Coin")
        #expect(mkHit.count == 1)
        #expect(mkHit.first?.source == .mapkit)
        #expect(mkCalls.snapshot() == ["Boulangerie Du Coin"])
    }

    @Test("Reverse geocoding waterfall (Photon -> BAN -> Nominatim -> coordinate fallback) & cycling hubs/badges")
    func reverseGeocodingAndPresets() async {
        let mode = BoxedValue("photon")
        let (id, session) = MockURLProtocol.registerSession { request, _ in
            let url = request.url!
            let host = url.host ?? ""
            switch mode.get() {
            case "photon" where host.contains("photon.komoot.io"):
                let body = [
                    "features": [[
                        "geometry": ["coordinates": [-1.5541, 47.2186]],
                        "properties": ["name": "Château des Ducs", "city": "Nantes"],
                    ]],
                ]
                return (Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: body))
            case "ban" where host.contains("data.geopf.fr"):
                let body = [
                    "features": [[
                        "geometry": ["coordinates": [-1.5541, 47.2186]],
                        "properties": ["name": "10 Rue Crébillon", "city": "Nantes"],
                    ]],
                ]
                return (Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: body))
            case "nominatim" where host.contains("nominatim.openstreetmap.org"):
                let body: [String: Any] = [
                    "address": ["village": "Rougiers", "county": "Var"],
                ]
                return (Self.makeHTTPResponse(url: url), try JSONSerialization.data(withJSONObject: body))
            default:
                return (Self.makeHTTPResponse(url: url, statusCode: 404), Data())
            }
        }
        defer { MockURLProtocol.unregister(id: id) }

        let service = LocationSearchService(
            urlSession: session,
            localSearchProvider: nil,
            nominatimMinInterval: .zero
        )

        mode.set("photon")
        #expect(await service.reverseGeocodeLocation(lat: 47.2186, lon: -1.5541) == "Château des Ducs (Nantes)")

        mode.set("ban")
        #expect(await service.reverseGeocodeLocation(lat: 47.2186, lon: -1.5541) == "10 Rue Crébillon, Nantes")

        mode.set("nominatim")
        #expect(await service.reverseGeocodeLocation(lat: 43.3925, lon: 5.8503) == "Rougiers (Var)")

        mode.set("none")
        #expect(await service.reverseGeocodeLocation(lat: 47.2186, lon: -1.5541) == "47.2186°N, -1.5541°E")

        #expect(LocationSearchService.popularCyclingHubs.count == 12)
        #expect(LocationSearchService.popularCyclingHubs.first?.id == "preset-rougiers")
        #expect(LocationSearchService.popularCyclingHubs.last?.id == "preset-gare-nantes")
        #expect(LocationSearchService.formatTypeBadge("station", lang: .fr) == "Gare")
        #expect(LocationSearchService.formatTypeBadge("station", lang: .en) == "Station")
        #expect(LocationSearchService.formatTypeBadge("peak", lang: .en) == "Peak")
        #expect(LocationSearchService.formatTypeBadge(nil, lang: .fr) == "Lieu")
    }
}
