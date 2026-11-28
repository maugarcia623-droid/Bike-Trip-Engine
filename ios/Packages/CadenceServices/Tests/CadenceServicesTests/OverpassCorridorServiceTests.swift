import Foundation
import Testing
import CadenceCore
@testable import CadenceServices

@Suite("OverpassCorridorService")
struct OverpassCorridorServiceTests {
    private static let sampleCoords: [LatLon] = [
        LatLon(47.2186, -1.5541),
        LatLon(47.2350, -1.6200),
        LatLon(47.2500, -1.7000),
    ]

    private static func makeOverpassJSON(elements: [[String: Any]]) throws -> Data {
        try JSONSerialization.data(withJSONObject: ["elements": elements])
    }

    private static func makeLongRoute(kmTarget: Double) -> [LatLon] {
        // ~0.009 deg latitude ≈ 1.0 km
        let steps = max(2, Int(kmTarget))
        return (0...steps).map { i in
            LatLon(47.0 + Double(i) * 0.009, -1.5)
        }
    }

    @Test("Happy path scan: POST form-encoding, bbox QL, all 6 categories EN/FR, elevation snapping")
    func happyPathScanAndTagParsing() async throws {
        let capturedRequests = BoxedList<(url: URL, method: String?, contentType: String?, rawBody: String?)>()

        let payloadData = try Self.makeOverpassJSON(elements: [
            ["type": "node", "id": 101, "lat": 47.2186, "lon": -1.5541, "tags": ["amenity": "drinking_water", "opening_hours": " 24/7 "]],
            ["type": "node", "id": 102, "lat": 47.2187, "lon": -1.5542, "tags": ["natural": "spring", "name": " Source Saint-Jean "]],
            ["type": "node", "id": 103, "lat": 47.2188, "lon": -1.5543, "tags": ["man_made": "water_tap"]],
            ["type": "way", "id": 201, "center": ["lat": 47.2350, "lon": -1.6200], "tags": ["landuse": "cemetery"]],
            ["type": "node", "id": 301, "lat": 47.2350, "lon": -1.6205, "tags": ["shop": "bakery"]],
            ["type": "node", "id": 302, "lat": 47.2360, "lon": -1.6210, "tags": ["amenity": "cafe", "name": "Le Petit Vélo"]],
            ["type": "node", "id": 303, "lat": 47.2365, "lon": -1.6215, "tags": ["amenity": "pub"]],
            ["type": "node", "id": 304, "lat": 47.2370, "lon": -1.6220, "tags": ["shop": "supermarket"]],
            ["type": "node", "id": 401, "lat": 47.2350, "lon": -1.6225, "tags": ["shop": "bicycle"]],
            ["type": "node", "id": 402, "lat": 47.2350, "lon": -1.6235, "tags": ["amenity": "bicycle_repair_station"]],
            ["type": "node", "id": 403, "lat": 47.2350, "lon": -1.6245, "tags": ["tourism": "camp_site"]],
            ["type": "node", "id": 404, "lat": 47.2350, "lon": -1.6255, "tags": ["amenity": "shelter"]],
            ["type": "node", "id": 501, "lat": 47.2500, "lon": -1.6960, "tags": ["amenity": "toilets"]],
            ["type": "node", "id": 502, "lat": 47.2500, "lon": -1.6970, "tags": ["amenity": "fuel"]],
            ["type": "node", "id": 503, "lat": 47.2500, "lon": -1.6980, "tags": ["amenity": "pharmacy"]],
            ["type": "node", "id": 601, "lat": 47.2500, "lon": -1.7000, "tags": ["railway": "station"]],
        ])

        let (mockID, session) = MockURLProtocol.registerSession { request, body in
            let bodyStr = body.flatMap { String(data: $0, encoding: .utf8) }
            capturedRequests.append((
                url: request.url!,
                method: request.httpMethod,
                contentType: request.value(forHTTPHeaderField: "Content-Type"),
                rawBody: bodyStr
            ))
            return (OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), payloadData)
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let service = OverpassCorridorService(urlSession: session)
        let elevProfile = [
            ElevationProfilePoint(distKm: 0.0, eleM: 12.4, gradePct: 0.0),
            ElevationProfilePoint(distKm: 5.3, eleM: 48.7, gradePct: 1.5),
            ElevationProfilePoint(distKm: 11.6, eleM: 95.2, gradePct: 2.0),
        ]

        let enResults = try await service.scanCorridorAmenities(
            coordinates: Self.sampleCoords,
            totalDistanceKm: 11.6,
            stageId: "s1",
            elevationProfile: elevProfile,
            lang: .en
        )

        let requests = capturedRequests.snapshot()
        #expect(requests.count == 1)
        #expect(requests[0].url == OverpassCorridorService.defaultEndpoints[0])
        #expect(requests[0].method == "POST")
        #expect(requests[0].contentType == "application/x-www-form-urlencoded")

        let rawBody = try #require(requests[0].rawBody)
        #expect(rawBody.hasPrefix("data="))
        let encodedVal = String(rawBody.dropFirst(5))
        // Verify strict RFC 3986 encoding (no raw &, =, [, ], spaces)
        #expect(!encodedVal.contains("&"))
        #expect(!encodedVal.contains("="))
        #expect(!encodedVal.contains("["))
        #expect(!encodedVal.contains(" "))

        let decodedQuery = try #require(encodedVal.removingPercentEncoding)
        #expect(decodedQuery.contains("[out:json][timeout:15][bbox:47.2006,-1.7250,47.2680,-1.5291];"))
        #expect(decodedQuery.contains("out center qt 400;"))

        // Note: water nodes 101, 102, 103 are within 40m of each other so dedup keeps closest (101)
        let byID = Dictionary(uniqueKeysWithValues: enResults.map { ($0.id, $0) })
        #expect(byID["node/101"]?.category == .water)
        #expect(byID["node/101"]?.name == "Drinking Water Fountain")
        #expect(byID["node/101"]?.openingHours == "24/7")
        #expect(byID["node/101"]?.elevationMeters == 12)
        #expect(byID["node/101"]?.isPinned == false)
        #expect(byID["way/201"]?.category == .cemetery)
        #expect(byID["way/201"]?.name == "Cemetery (Water Spigot)")
        #expect(byID["node/301"]?.name == "Bakery")
        #expect(byID["node/302"]?.name == "Le Petit Vélo")
        #expect(byID["node/303"]?.name == "Village Inn / Restaurant")
        #expect(byID["node/304"]?.name == "Supermarket / Grocery")
        #expect(byID["node/401"]?.name == "Bicycle Shop")
        #expect(byID["node/402"]?.name == "Bike Repair Station")
        #expect(byID["node/403"]?.name == "Campsite / Refuge")
        #expect(byID["node/404"]?.name == "Trail Shelter")
        #expect(byID["node/501"]?.name == "Public Toilets")
        #expect(byID["node/502"]?.name == "Petrol Station")
        #expect(byID["node/503"]?.name == "Pharmacy")
        #expect(byID["node/601"]?.category == .bailout)
        #expect(byID["node/601"]?.name == "Train Station (Bailout)")

        // French fallback verification (forceFresh to bypass EN cache)
        let frResults = try await service.scanCorridorAmenities(
            coordinates: Self.sampleCoords,
            totalDistanceKm: 11.6,
            stageId: "s1",
            elevationProfile: elevProfile,
            lang: .fr,
            forceFresh: true
        )
        let frByID = Dictionary(uniqueKeysWithValues: frResults.map { ($0.id, $0) })
        #expect(frByID["node/101"]?.name == "Fontaine d'eau potable")
        #expect(frByID["way/201"]?.name == "Cimetière (Point d'eau garanti)")
        #expect(frByID["node/301"]?.name == "Boulangerie artisanale")
        #expect(frByID["node/401"]?.name == "Magasin & Atelier vélo")
        #expect(frByID["node/503"]?.name == "Pharmacie")
        #expect(frByID["node/601"]?.name == "Gare / Halte (Repli)")
    }

    @Test("4-mirror failover across HTTP 429, timeout, HTTP 504 -> mirror 4 succeeds within 600ms")
    func fourMirrorFailoverWithAsyncTimeout() async throws {
        let calledHosts = BoxedList<String>()
        let okData = try Self.makeOverpassJSON(elements: [
            ["type": "node", "id": 77, "lat": 47.2186, "lon": -1.5541, "tags": ["amenity": "drinking_water"]],
        ])

        let (mockID, session) = OverpassAsyncDelayURLProtocol.registerSession { request, _ in
            let url = request.url!
            let host = url.host ?? ""
            calledHosts.append(host)

            switch host {
            case "ovp.dresel.systems":
                return (0, OverpassTestSupport.makeHTTPResponse(url: url, statusCode: 429), Data())
            case "overpass-api.de":
                // Slow mirror exceeds secondary 150ms timeout -> cancelled promptly via TaskGroup
                return (1.5, OverpassTestSupport.makeHTTPResponse(url: url, statusCode: 200), okData)
            case "overpass.kumi.systems":
                return (0, OverpassTestSupport.makeHTTPResponse(url: url, statusCode: 504), Data())
            default:
                return (0, OverpassTestSupport.makeHTTPResponse(url: url, statusCode: 200), okData)
            }
        }
        defer { OverpassAsyncDelayURLProtocol.unregister(id: mockID) }

        let service = OverpassCorridorService(
            urlSession: session,
            timeoutSeconds: 0.12,
            secondaryMirrorTimeoutCapSeconds: 0.15
        )

        let clock = ContinuousClock()
        let start = clock.now
        let results = try await service.scanCorridorAmenities(
            coordinates: Self.sampleCoords,
            totalDistanceKm: 11.6,
            stageId: "failover"
        )
        let elapsed = clock.now - start

        #expect(results.count == 1)
        #expect(results[0].id == "node/77")
        #expect(calledHosts.snapshot() == [
            "ovp.dresel.systems",
            "overpass-api.de",
            "overpass.kumi.systems",
            "lz4.overpass-api.de",
        ])
        #expect(elapsed < .milliseconds(600))
    }

    @Test("Outer task cancellation aborts immediately without failing over or using offline fallback")
    func outerCancellationAbortsWithoutFailover() async throws {
        let store = CadenceStore(modelContainer: try CadenceModelContainer.makeContainer(inMemory: true))
        let coords = Self.sampleCoords
        let cacheKey = RouteCacheKey.routeHashKey(coordinates: coords, stageId: "cancel", totalDistanceKm: 10)
        try await store.saveCachedCorridorScan(
            cacheKey: cacheKey,
            stageId: "cancel",
            distanceKm: 10,
            amenities: [
                StageAmenity(
                    id: "node/999",
                    category: .water,
                    subType: "drinking_water",
                    name: "Cached Font",
                    lat: 47.2186,
                    lon: -1.5541,
                    routeKm: 0,
                    detourMeters: 0
                ),
            ],
            ttlSeconds: 1,
            now: Date().addingTimeInterval(-3600)
        )

        let calledHosts = BoxedList<String>()
        let firstStarted = BoxedValue(false)

        let (mockID, session) = OverpassAsyncDelayURLProtocol.registerSession { request, _ in
            calledHosts.append(request.url?.host ?? "")
            firstStarted.set(true)
            return (1.5, OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), Data("{}".utf8))
        }
        defer { OverpassAsyncDelayURLProtocol.unregister(id: mockID) }

        let service = OverpassCorridorService(urlSession: session, store: store, timeoutSeconds: 5.0)
        let task = Task {
            try await service.scanCorridorAmenities(
                coordinates: coords,
                totalDistanceKm: 10,
                stageId: "cancel",
                forceFresh: true
            )
        }

        while !firstStarted.get() {
            try await Task.sleep(for: .milliseconds(5))
        }
        task.cancel()

        do {
            _ = try await task.value
            Issue.record("Expected CancellationError")
        } catch is CancellationError {
            // expected
        } catch {
            Issue.record("Expected CancellationError, got \(error)")
        }

        // Must NOT fail over to mirror 2..4 after cancellation
        #expect(calledHosts.snapshot() == ["ovp.dresel.systems"])
    }

    @Test("Polyline chunking (>28km -> 25km chunks, shared boundary), partial failure tolerance, and element dedup")
    func polylineChunkingPartialFailureAndDedup() async throws {
        let longRoute = Self.makeLongRoute(kmTarget: 60) // ~60 km -> > 28km threshold
        let cum = OverpassWaterGapEngine.computeCumulativeDistances(longRoute)
        let chunks = OverpassCorridorService.chunkPolylineForOverpass(
            coordinates: longRoute,
            cumDistancesMeters: cum
        )

        #expect(chunks.count == 3)
        // Shared boundary vertex between adjacent chunks
        #expect(chunks[0].last == chunks[1].first)
        #expect(chunks[1].last == chunks[2].first)

        let sharedNode: [String: Any] = [
            "type": "node",
            "id": 555,
            "lat": longRoute[25].lat,
            "lon": longRoute[25].lon,
            "tags": ["amenity": "drinking_water", "name": "Shared Boundary Spring"],
        ]
        let chunk3Node: [String: Any] = [
            "type": "node",
            "id": 556,
            "lat": longRoute[55].lat,
            "lon": longRoute[55].lon,
            "tags": ["shop": "bakery", "name": "End Bakery"],
        ]

        let chunk1Data = try Self.makeOverpassJSON(elements: [sharedNode])
        let chunk3Data = try Self.makeOverpassJSON(elements: [sharedNode, chunk3Node])

        let (mockID, session) = MockURLProtocol.registerSession { request, body in
            let query = OverpassTestSupport.decodeFormDataQuery(from: body) ?? ""
            // Chunk 1 (starts at lat 47.0 -> south 46.9820) succeeds, Chunk 2 fails across all mirrors, Chunk 3 (ends at lat 47.54 -> north 47.5580) succeeds
            if query.contains("46.9820,") {
                return (OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), chunk1Data)
            } else if query.contains(",47.5580,") {
                return (OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), chunk3Data)
            } else {
                return (OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 502), Data())
            }
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let service = OverpassCorridorService(urlSession: session)
        let results = try await service.scanCorridorAmenities(
            coordinates: longRoute,
            totalDistanceKm: 60,
            stageId: "chunked"
        )

        // Partial chunk tolerance keeps successful chunks and deduplicates shared node/555
        #expect(results.count == 2)
        #expect(results.map(\.id) == ["node/555", "node/556"])
    }

    @Test("Detour caps (1600m bailout vs 1200m others), 40m same-category dedup keeping smallest detour, routeKm sort")
    func detourFilteringAndSameCategoryDedup() async throws {
        let coords = [
            LatLon(47.2000, -1.5000),
            LatLon(47.2900, -1.5000), // ~10 km north
        ]
        let cum = OverpassWaterGapEngine.computeCumulativeDistances(coords)

        // ~0.01215 deg lon at lat 47.2 is ~919m; ~0.0175 deg lon is ~1323m; ~0.0195 deg lon is ~1475m; ~0.023 deg lon is ~1740m
        let elements = [
            // Water > 1200m -> rejected (~1323m)
            OverpassRawElement(id: 1, lat: 47.2000, lon: -1.5000 + 0.0175, tags: ["amenity": "drinking_water"]),
            // Bailout at ~1475m (<= 1600m) -> kept!
            OverpassRawElement(id: 2, lat: 47.2900, lon: -1.5000 + 0.0195, tags: ["railway": "station"]),
            // Bailout at ~1740m (> 1600m) -> rejected
            OverpassRawElement(id: 3, lat: 47.2900, lon: -1.5000 + 0.0230, tags: ["railway": "halt"]),
            // Two water POIs within 40m: id 4 at ~300m, id 5 at ~100m -> keeps id 5 (smaller detour)
            OverpassRawElement(id: 4, lat: 47.2900, lon: -1.5000 + 0.0040, tags: ["amenity": "drinking_water", "name": "Farther Tap"]),
            OverpassRawElement(id: 5, lat: 47.2900, lon: -1.5000 + 0.0042, tags: ["amenity": "drinking_water", "name": "Closer Tap"]),
            // Wait: 0.0002 deg lon at 47.29 is ~15m, let's make id 5 have smaller detour than id 4:
            // Actually id 4 is at +0.0040 (~302m), let's verify id 5 at +0.0038 (~287m)
        ]

        // Let's build exact elements for 40m test:
        let exactElements = [
            elements[0],
            elements[1],
            elements[2],
            OverpassRawElement(id: 4, lat: 47.2900, lon: -1.5000 + 0.0040, tags: ["amenity": "drinking_water", "name": "Farther Tap"]),
            OverpassRawElement(id: 5, lat: 47.2900, lon: -1.5000 + 0.0037, tags: ["amenity": "drinking_water", "name": "Closer Tap"]),
            // Different category (food) within 40m of Closer Tap -> NOT deduplicated!
            OverpassRawElement(id: 6, lat: 47.2900, lon: -1.5000 + 0.00375, tags: ["shop": "bakery", "name": "Start Bakery"]),
            // Food near km 0 so we verify sorting by routeKm ascending
            OverpassRawElement(id: 7, lat: 47.2000, lon: -1.5000 + 0.0010, tags: ["amenity": "cafe", "name": "Km 0 Cafe"]),
        ]

        let parsed = exactElements.compactMap {
            OverpassCorridorService.parseOsmAmenity(element: $0, coordinates: coords, cumDistancesMeters: cum)
        }
        let deduped = OverpassCorridorService.deduplicateAmenities(parsed)

        #expect(deduped.map(\.id) == ["node/7", "node/2", "node/5", "node/6"])
        #expect(deduped[0].routeKm <= deduped[1].routeKm)
        #expect(deduped[1].name == "Train Station (Bailout)")
        #expect(deduped[2].name == "Closer Tap")
        #expect(deduped[3].name == "Start Bakery")
    }

    @Test("Memory LRU (25 entries), CadenceStore persistence, offline expired fallback, and in-flight dedup")
    func cachesOfflineFallbackAndInFlightDedup() async throws {
        let store = CadenceStore(modelContainer: try CadenceModelContainer.makeContainer(inMemory: true))
        let currentNow = BoxedValue(Date(timeIntervalSince1970: 1_700_000_000))
        let httpCalls = BoxedValue(0)

        let payload = try Self.makeOverpassJSON(elements: [
            ["type": "node", "id": 11, "lat": 47.2186, "lon": -1.5541, "tags": ["amenity": "drinking_water", "name": "Fontaine Royale"]],
        ])

        let (mockID, session) = OverpassAsyncDelayURLProtocol.registerSession { request, _ in
            httpCalls.mutate { $0 += 1 }
            return (0.04, OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), payload)
        }
        defer { OverpassAsyncDelayURLProtocol.unregister(id: mockID) }

        let service1 = OverpassCorridorService(
            urlSession: session,
            store: store,
            nowProvider: { currentNow.get() }
        )

        // 1. Concurrent in-flight deduplication: 3 simultaneous calls -> 1 HTTP request
        async let c1 = service1.scanCorridorAmenities(coordinates: Self.sampleCoords, totalDistanceKm: 11.6, stageId: "s1")
        async let c2 = service1.scanCorridorAmenities(coordinates: Self.sampleCoords, totalDistanceKm: 11.6, stageId: "s1")
        async let c3 = service1.scanCorridorAmenities(coordinates: Self.sampleCoords, totalDistanceKm: 11.6, stageId: "s1")
        let (r1, r2, r3) = try await (c1, c2, c3)
        #expect(httpCalls.get() == 1)
        #expect(r1 == r2 && r2 == r3)
        #expect(r1.count == 1)

        // 2. Second service instance reads unexpired SDCachedCorridorScan from CadenceStore -> 0 HTTP calls
        let service2 = OverpassCorridorService(
            urlSession: session,
            store: store,
            nowProvider: { currentNow.get() }
        )
        let fromStore = try await service2.scanCorridorAmenities(
            coordinates: Self.sampleCoords,
            totalDistanceKm: 11.6,
            stageId: "s1"
        )
        #expect(httpCalls.get() == 1)
        #expect(fromStore == r1)

        // 3. Memory LRU eviction at 25 entries
        await service2.clearCachedScan()
        for i in 0..<26 {
            let amenity = StageAmenity(
                id: "node/\(i)",
                category: .water,
                subType: "drinking_water",
                name: "Tap \(i)",
                lat: 47.0,
                lon: -1.5,
                routeKm: 1,
                detourMeters: 10
            )
            await service2.setCachedScan(key: "lru-\(i)", results: [amenity])
            if i == 0 {
                // Touch lru-0 before inserting more? No, touch lru-0 at i==24 wouldn't test oldest eviction;
                // inserting 0..25 evicts lru-0 cleanly
            }
        }
        // Clear store? setCachedScan wrote to store too; verify memory-only LRU eviction with store=nil
        let memOnlyService = OverpassCorridorService(urlSession: session, store: nil)
        for i in 0..<26 {
            await memOnlyService.setCachedScan(
                key: "mem-\(i)",
                results: [
                    StageAmenity(id: "node/\(i)", category: .water, subType: "drinking_water", name: "M\(i)", lat: 47, lon: -1.5, routeKm: 1, detourMeters: 5),
                ]
            )
            if i == 10 {
                _ = await memOnlyService.getCachedScan(key: "mem-0") // touch mem-0 to MRU -> mem-1 becomes oldest!
            }
        }
        #expect(await memOnlyService.getCachedScan(key: "mem-0") != nil)
        #expect(await memOnlyService.getCachedScan(key: "mem-1") == nil)

        // 4. Expired CadenceStore row + failing network -> offline fallback (allowExpired: true)
        currentNow.set(currentNow.get().addingTimeInterval(OverpassCorridorService.corridorCacheTTLSeconds + 120))
        let (failMockID, failSession) = MockURLProtocol.registerSession { request, _ in
            return (OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 503), Data())
        }
        defer { MockURLProtocol.unregister(id: failMockID) }

        let offlineService = OverpassCorridorService(
            urlSession: failSession,
            store: store,
            nowProvider: { currentNow.get() }
        )
        let offlineFallback = try await offlineService.scanCorridorAmenities(
            coordinates: Self.sampleCoords,
            totalDistanceKm: 11.6,
            stageId: "s1"
        )
        #expect(offlineFallback == r1)
    }

    @Test("CoalescedFlight multi-waiter partial cancellation keeps flight alive for remaining waiter")
    func multiWaiterPartialCancellation() async throws {
        let httpCalls = BoxedValue(0)
        let firstStarted = BoxedValue(false)
        let payload = try Self.makeOverpassJSON(elements: [
            ["type": "node", "id": 701, "lat": 47.2186, "lon": -1.5541, "tags": ["amenity": "drinking_water", "name": "Shared Spring"]],
        ])

        let (mockID, session) = OverpassAsyncDelayURLProtocol.registerSession { request, _ in
            httpCalls.mutate { $0 += 1 }
            firstStarted.set(true)
            return (0.12, OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), payload)
        }
        defer { OverpassAsyncDelayURLProtocol.unregister(id: mockID) }

        let service = OverpassCorridorService(urlSession: session, timeoutSeconds: 5.0)
        let taskA = Task {
            try await service.scanCorridorAmenities(
                coordinates: Self.sampleCoords,
                totalDistanceKm: 11.6,
                stageId: "multi-waiter"
            )
        }
        let taskB = Task {
            try await service.scanCorridorAmenities(
                coordinates: Self.sampleCoords,
                totalDistanceKm: 11.6,
                stageId: "multi-waiter"
            )
        }

        while !firstStarted.get() {
            try await Task.sleep(for: .milliseconds(5))
        }
        try await Task.sleep(for: .milliseconds(15))
        taskA.cancel()

        do {
            _ = try await taskA.value
            Issue.record("Expected Caller A to throw CancellationError")
        } catch is CancellationError {
            // expected
        }

        let resultsB = try await taskB.value
        #expect(resultsB.count == 1)
        #expect(resultsB[0].id == "node/701")
        #expect(httpCalls.get() == 1)
    }

    @Test("Immediate cancel-then-rejoin stress loop (50 iterations) yields 0 spurious cancellations")
    func immediateCancelThenRejoinStress() async throws {
        let payload = try Self.makeOverpassJSON(elements: [
            ["type": "node", "id": 801, "lat": 47.2186, "lon": -1.5541, "tags": ["amenity": "drinking_water", "name": "Stress Tap"]],
        ])

        let requestCounter = BoxedValue(0)
        let (mockID, session) = OverpassAsyncDelayURLProtocol.registerSession { request, _ in
            let n = requestCounter.mutate { v -> Int in v += 1; return v }
            // Keep requests slightly delayed so t1 is in-flight when cancelled
            let delay = (n % 2 == 1) ? 0.08 : 0.01
            return (delay, OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), payload)
        }
        defer { OverpassAsyncDelayURLProtocol.unregister(id: mockID) }

        let service = OverpassCorridorService(urlSession: session, timeoutSeconds: 5.0)
        var spuriousCancellations = 0

        for i in 0..<50 {
            await service.clearCachedScan()
            let stageId = "stress-\(i)"
            let t1 = Task {
                try await service.scanCorridorAmenities(
                    coordinates: Self.sampleCoords,
                    totalDistanceKm: 11.6,
                    stageId: stageId
                )
            }
            if i % 2 == 0 {
                // Let t1 enter the flight half the time before cancelling, and cancel immediately the other half
                try await Task.sleep(for: .milliseconds(2))
            }
            t1.cancel()
            // Immediately launch uncancelled t2 without awaiting t1 or sleeping for clearInFlight
            let t2 = Task {
                try await service.scanCorridorAmenities(
                    coordinates: Self.sampleCoords,
                    totalDistanceKm: 11.6,
                    stageId: stageId
                )
            }

            do {
                let res = try await t2.value
                #expect(res.count == 1)
                #expect(res[0].id == "node/801")
            } catch is CancellationError {
                spuriousCancellations += 1
            }
            _ = try? await t1.value
        }

        #expect(spuriousCancellations == 0)
    }

    @Test("Pre-cancelled task throws CancellationError before issuing HTTP requests, and chunkPolylineForOverpass guards mismatched cumDistances")
    func preCancelledAndChunkBoundsGuard() async throws {
        let httpCalls = BoxedValue(0)
        let (mockID, session) = MockURLProtocol.registerSession { request, _ in
            httpCalls.mutate { $0 += 1 }
            return (OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), Data("{\"elements\":[]}".utf8))
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let service = OverpassCorridorService(urlSession: session)
        let preCancelledTask = Task<[StageAmenity], Error> {
            withUnsafeCurrentTask { $0?.cancel() }
            return try await service.scanCorridorAmenities(
                coordinates: Self.sampleCoords,
                totalDistanceKm: 11.6,
                stageId: "pre-cancel"
            )
        }

        do {
            _ = try await preCancelledTask.value
            Issue.record("Expected CancellationError for pre-cancelled task")
        } catch is CancellationError {
            // expected
        }
        #expect(httpCalls.get() == 0)

        let longRoute = Self.makeLongRoute(kmTarget: 60)
        let chunksFromMismatchedCum = OverpassCorridorService.chunkPolylineForOverpass(
            coordinates: longRoute,
            cumDistancesMeters: [0.0] // intentionally too short
        )
        #expect(chunksFromMismatchedCum.count == 3)
        #expect(chunksFromMismatchedCum.first?.first == longRoute.first)
        #expect(chunksFromMismatchedCum.last?.last == longRoute.last)
    }

    @Test("forceFresh fast R2 is not overwritten by slower R1 in scanCache or CadenceStore")
    func forceFreshNotOverwrittenBySlowerInFlightScan() async throws {
        let store = CadenceStore(modelContainer: try CadenceModelContainer.makeContainer(inMemory: true))
        let cacheKey = RouteCacheKey.routeHashKey(
            coordinates: Self.sampleCoords,
            stageId: "race",
            totalDistanceKm: 11.6
        )

        let stalePayload = try Self.makeOverpassJSON(elements: [
            ["type": "node", "id": 101, "lat": 47.2186, "lon": -1.5541, "tags": ["amenity": "drinking_water", "name": "Stale Spring"]],
        ])
        let freshPayload = try Self.makeOverpassJSON(elements: [
            ["type": "node", "id": 201, "lat": 47.2186, "lon": -1.5541, "tags": ["amenity": "drinking_water", "name": "Fresh Spring"]],
            ["type": "node", "id": 202, "lat": 47.2500, "lon": -1.7000, "tags": ["shop": "bakery", "name": "Fresh Bakery"]],
        ])

        let requestSeq = BoxedValue(0)
        let r1Started = BoxedValue(false)
        let r2Started = BoxedValue(false)
        let (mockID, session) = OverpassAsyncDelayURLProtocol.registerSession { request, _ in
            let seq = requestSeq.mutate { v -> Int in v += 1; return v }
            if seq == 1 {
                r1Started.set(true)
                return (0.25, OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), stalePayload)
            } else {
                r2Started.set(true)
                return (0.01, OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), freshPayload)
            }
        }
        defer { OverpassAsyncDelayURLProtocol.unregister(id: mockID) }

        let service = OverpassCorridorService(urlSession: session, store: store, timeoutSeconds: 5.0)

        let r1Task = Task {
            try await service.scanCorridorAmenities(
                coordinates: Self.sampleCoords,
                totalDistanceKm: 11.6,
                stageId: "race",
                forceFresh: false
            )
        }
        while !r1Started.get() {
            try await Task.sleep(for: .milliseconds(2))
        }

        let r2Results = try await service.scanCorridorAmenities(
            coordinates: Self.sampleCoords,
            totalDistanceKm: 11.6,
            stageId: "race",
            forceFresh: true
        )
        #expect(r2Started.get() == true)
        #expect(r2Results.map(\.id) == ["node/201", "node/202"])

        let r1Results = try await r1Task.value
        #expect(r1Results.map(\.id) == ["node/101"])

        let cachedMem = await service.getCachedScan(key: cacheKey)
        let cachedStore = try await store.fetchCachedCorridorScan(cacheKey: cacheKey, allowExpired: false)
        #expect(cachedMem?.count == 2)
        #expect(cachedMem?.map(\.id) == ["node/201", "node/202"])
        #expect(cachedStore?.count == 2)
        #expect(cachedStore?.map(\.id) == ["node/201", "node/202"])
    }

    @Test("clearCachedScan() suppresses in-flight scan from repopulating scanCache or CadenceStore")
    func clearCachedScanSuppressesInFlightRepopulation() async throws {
        let store = CadenceStore(modelContainer: try CadenceModelContainer.makeContainer(inMemory: true))
        let cacheKey = RouteCacheKey.routeHashKey(
            coordinates: Self.sampleCoords,
            stageId: "clear-race",
            totalDistanceKm: 11.6
        )
        let payload = try Self.makeOverpassJSON(elements: [
            ["type": "node", "id": 301, "lat": 47.2186, "lon": -1.5541, "tags": ["amenity": "drinking_water", "name": "Pre-Clear Tap"]],
        ])

        let requestStarted = BoxedValue(false)
        let (mockID, session) = OverpassAsyncDelayURLProtocol.registerSession { request, _ in
            requestStarted.set(true)
            return (0.12, OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), payload)
        }
        defer { OverpassAsyncDelayURLProtocol.unregister(id: mockID) }

        let service = OverpassCorridorService(urlSession: session, store: store, timeoutSeconds: 5.0)
        let inFlightTask = Task {
            try await service.scanCorridorAmenities(
                coordinates: Self.sampleCoords,
                totalDistanceKm: 11.6,
                stageId: "clear-race"
            )
        }
        while !requestStarted.get() {
            try await Task.sleep(for: .milliseconds(2))
        }

        await service.clearCachedScan()
        let results = try await inFlightTask.value
        #expect(results.map(\.id) == ["node/301"])

        let postClearMem = await service.getCachedScan(key: cacheKey)
        let postClearStore = try await store.fetchCachedCorridorScan(cacheKey: cacheKey, allowExpired: false)
        #expect(postClearMem == nil)
        #expect(postClearStore == nil)
    }

    @Test("getCachedScan and scanCorridorAmenities(forceFresh: false) store read-through concurrently with setCachedScan never overwrite scanCache (25-iteration stress)")
    func storeReadThroughConcurrentlyWithSetCachedScanNeverOverwrites() async throws {
        let store = CadenceStore(modelContainer: try CadenceModelContainer.makeContainer(inMemory: true))
        let (mockID, session) = MockURLProtocol.registerSession { request, _ in
            (OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 503), Data())
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let staleAmenities = [
            StageAmenity(
                id: "node/1",
                category: .water,
                subType: "drinking_water",
                name: "Stale Tap",
                lat: 47.2186,
                lon: -1.5541,
                routeKm: 0.0,
                detourMeters: 5.0
            ),
        ]
        let freshAmenities = [
            StageAmenity(
                id: "node/201",
                category: .water,
                subType: "drinking_water",
                name: "Fresh Tap",
                lat: 47.2186,
                lon: -1.5541,
                routeKm: 0.0,
                detourMeters: 5.0
            ),
            StageAmenity(
                id: "node/202",
                category: .food,
                subType: "bakery",
                name: "Fresh Bakery",
                lat: 47.2500,
                lon: -1.7000,
                routeKm: 11.6,
                detourMeters: 12.0
            ),
        ]

        // 1. Stress-test getCachedScan(key:) racing against setCachedScan(key:...)
        for i in 0..<25 {
            let stageId = "toctou-get-\(i)"
            let cacheKey = RouteCacheKey.routeHashKey(
                coordinates: Self.sampleCoords,
                stageId: stageId,
                totalDistanceKm: 11.6
            )
            try await store.saveCachedCorridorScan(
                cacheKey: cacheKey,
                stageId: stageId,
                distanceKm: 11.6,
                amenities: staleAmenities,
                ttlSeconds: OverpassCorridorService.corridorCacheTTLSeconds,
                pinOffline: false
            )

            let service = OverpassCorridorService(urlSession: session, store: store)
            let readerTask = Task {
                await service.getCachedScan(key: cacheKey)
            }
            let writerTask = Task {
                await service.setCachedScan(
                    key: cacheKey,
                    results: freshAmenities,
                    stageId: stageId,
                    distanceKm: 11.6
                )
            }

            _ = await readerTask.value
            await writerTask.value

            let finalMem = await service.getCachedScan(key: cacheKey)
            let finalStore = try await store.fetchCachedCorridorScan(cacheKey: cacheKey, allowExpired: false)
            #expect(finalMem?.map(\.id) == ["node/201", "node/202"])
            #expect(finalStore?.map(\.id) == ["node/201", "node/202"])
        }

        // 2. Stress-test scanCorridorAmenities(forceFresh: false) store read-through racing against setCachedScan(key:...)
        for i in 0..<25 {
            let stageId = "toctou-scan-\(i)"
            let cacheKey = RouteCacheKey.routeHashKey(
                coordinates: Self.sampleCoords,
                stageId: stageId,
                totalDistanceKm: 11.6
            )
            try await store.saveCachedCorridorScan(
                cacheKey: cacheKey,
                stageId: stageId,
                distanceKm: 11.6,
                amenities: staleAmenities,
                ttlSeconds: OverpassCorridorService.corridorCacheTTLSeconds,
                pinOffline: false
            )

            let service = OverpassCorridorService(urlSession: session, store: store)
            let scanTask = Task {
                try await service.scanCorridorAmenities(
                    coordinates: Self.sampleCoords,
                    totalDistanceKm: 11.6,
                    stageId: stageId,
                    forceFresh: false
                )
            }
            let writerTask = Task {
                await service.setCachedScan(
                    key: cacheKey,
                    results: freshAmenities,
                    stageId: stageId,
                    distanceKm: 11.6
                )
            }

            _ = try await scanTask.value
            await writerTask.value

            let finalMem = await service.getCachedScan(key: cacheKey)
            let finalStore = try await store.fetchCachedCorridorScan(cacheKey: cacheKey, allowExpired: false)
            #expect(finalMem?.map(\.id) == ["node/201", "node/202"])
            #expect(finalStore?.map(\.id) == ["node/201", "node/202"])
        }
    }
}
