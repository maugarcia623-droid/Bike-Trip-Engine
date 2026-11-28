import Foundation
import Testing
import CadenceCore
@testable import CadenceServices

@Suite("OsmSurfaceService")
struct OsmSurfaceServiceTests {
    private static func makeWayJSON(
        id: Int,
        tags: [String: String],
        geometry: [[String: Double]],
        includeBounds: Bool = true
    ) -> [String: Any] {
        var obj: [String: Any] = [
            "type": "way",
            "id": id,
            "tags": tags,
            "geometry": geometry,
        ]
        if includeBounds, !geometry.isEmpty {
            let lats = geometry.compactMap { $0["lat"] }
            let lons = geometry.compactMap { $0["lon"] }
            obj["bounds"] = [
                "minlat": lats.min()!,
                "maxlat": lats.max()!,
                "minlon": lons.min()!,
                "maxlon": lons.max()!,
            ]
        }
        return obj
    }

    private static func makeOverpassJSON(elements: [[String: Any]]) throws -> Data {
        try JSONSerialization.data(withJSONObject: ["elements": elements])
    }

    @Test("RouteCacheKey.osmSurfaceRouteKey parity and routeHashKey preservation")
    func osmSurfaceRouteKeyParity() {
        #expect(RouteCacheKey.osmSurfaceRouteKey(coordinates: nil, distanceKm: 42) == "empty")
        #expect(RouteCacheKey.osmSurfaceRouteKey(coordinates: [], distanceKm: 42) == "empty")
        #expect(RouteCacheKey.osmSurfaceRouteKey(coordinates: [LatLon(47.2, -1.5)], distanceKm: 42) == "empty")

        let coords = (0...10).map { i in
            LatLon(47.0 + Double(i) * 0.01, -1.5 - Double(i) * 0.02)
        }
        // n=11 -> indices floor(t * 10) for t in [0, 0.2, 0.4, 0.6, 0.8, 1] -> [0, 2, 4, 6, 8, 10]
        let key = RouteCacheKey.osmSurfaceRouteKey(coordinates: coords, distanceKm: 23.46)
        let expectedSig = [0, 2, 4, 6, 8, 10]
            .map { idx in
                let pt = coords[idx]
                return "\(JSCompat.jsFixed(pt.lat, decimals: 3)),\(JSCompat.jsFixed(pt.lon, decimals: 3))"
            }
            .joined(separator: "|")
        #expect(key == "osm-surf-235-\(expectedSig)")
        #expect(RouteCacheKey.osmSurfaceRouteKey(coordinates: coords, distanceKm: nil) == "osm-surf-0-\(expectedSig)")

        // Existing routeHashKey must remain intact
        let legacy = RouteCacheKey.routeHashKey(coordinates: coords, stageId: "st-9", totalDistanceKm: 23.46)
        #expect(legacy.hasPrefix("route-st-9-235-"))
    }

    @Test("Adaptive query buffer, polyline chunking (9500m / 66 raw pts -> 22 pts), and exact QL string")
    func adaptiveBufferChunkingAndQuery() {
        // 1. Buffer widths: <= 180 -> 28, 181...400 -> 40, > 400 -> 55
        let denseCoords = [LatLon(47.0, -1.5), LatLon(47.001, -1.5)] // ~111m
        let medCoords = [LatLon(47.0, -1.5), LatLon(47.0025, -1.5)] // ~278m
        let sparseCoords = [LatLon(47.0, -1.5), LatLon(47.005, -1.5)] // ~556m

        #expect(OsmSurfaceService.computeQueryBufferMeters(
            coordinates: denseCoords,
            cumMeters: OverpassWaterGapEngine.computeCumulativeDistances(denseCoords)
        ) == 28)
        #expect(OsmSurfaceService.computeQueryBufferMeters(
            coordinates: medCoords,
            cumMeters: OverpassWaterGapEngine.computeCumulativeDistances(medCoords)
        ) == 40)
        #expect(OsmSurfaceService.computeQueryBufferMeters(
            coordinates: sparseCoords,
            cumMeters: OverpassWaterGapEngine.computeCumulativeDistances(sparseCoords)
        ) == 55)

        // 2. Dense 150-point short route (< 9.5km) hits 66-point slice cap and downsamples to 22 pts preserving endpoints
        let densePoints = (0..<150).map { i in
            LatLon(47.0 + Double(i) * 0.0001, -1.5) // ~11m/step, ~1.65km total
        }
        let denseCum = OverpassWaterGapEngine.computeCumulativeDistances(densePoints)
        let denseChunks = OsmSurfaceService.buildOverpassPolylineChunks(coordinates: densePoints, cumMeters: denseCum)
        #expect(denseChunks.count >= 2)
        #expect(denseChunks[0].count == 22)
        #expect(denseChunks[0].first == densePoints.first)
        #expect(denseChunks.last?.last == densePoints.last)

        // 3. Long sparse route splits at >= 9500m with shared boundary vertex
        let longSparse = (0...22).map { i in
            LatLon(47.0 + Double(i) * 0.009, -1.5) // ~1km per step, ~22km total
        }
        let longCum = OverpassWaterGapEngine.computeCumulativeDistances(longSparse)
        let longChunks = OsmSurfaceService.buildOverpassPolylineChunks(coordinates: longSparse, cumMeters: longCum)
        #expect(longChunks.count == 3)
        #expect(longChunks[0].last == longChunks[1].first)
        #expect(longChunks[1].last == longChunks[2].first)

        // 4. Exact Overpass QL string
        let ql = OsmSurfaceService.buildChunkOverpassQuery(chunk: [LatLon(47.2186, -1.5541), LatLon(47.2286, -1.5641)], bufferMeters: 40)
        let expected = "[out:json][timeout:10];way(around:40,47.21860,-1.55410,47.22860,-1.56410)[\"highway\"][\"highway\"!~\"motorway|motorway_link|trunk|trunk_link|steps|corridor|elevator|construction|proposed\"][\"service\"!~\"driveway|parking_aisle\"][\"footway\"!~\"crossing|sidewalk\"][\"area\"!=\"yes\"];out tags geom;"
        #expect(ql == expected)
    }

    @Test("4-mirror failover with AsyncDelayURLProtocol timeout (< 600ms) and cancellation")
    func fourMirrorFailoverAndCancellation() async throws {
        let calledHosts = BoxedList<String>()
        let coords = [LatLon(47.2186, -1.5541), LatLon(47.2250, -1.5600)]
        let wayPayload = try Self.makeOverpassJSON(elements: [
            Self.makeWayJSON(
                id: 901,
                tags: ["highway": "cycleway", "surface": "asphalt"],
                geometry: [
                    ["lat": 47.2186, "lon": -1.5541],
                    ["lat": 47.2250, "lon": -1.5600],
                ],
                includeBounds: false
            ),
        ])

        let (mockID, session) = OverpassAsyncDelayURLProtocol.registerSession { request, body in
            let url = request.url!
            let host = url.host ?? ""
            calledHosts.append(host)
            #expect(request.httpMethod == "POST")
            #expect(request.value(forHTTPHeaderField: "Content-Type") == "application/x-www-form-urlencoded")
            #expect(OverpassTestSupport.decodeFormDataQuery(from: body)?.contains("out tags geom;") == true)

            switch host {
            case "ovp.dresel.systems":
                return (1.5, OverpassTestSupport.makeHTTPResponse(url: url, statusCode: 200), wayPayload)
            case "overpass-api.de":
                return (0, OverpassTestSupport.makeHTTPResponse(url: url, statusCode: 429), Data())
            case "overpass.kumi.systems":
                return (0, OverpassTestSupport.makeHTTPResponse(url: url, statusCode: 504), Data())
            default:
                return (0, OverpassTestSupport.makeHTTPResponse(url: url, statusCode: 200), wayPayload)
            }
        }
        defer { OverpassAsyncDelayURLProtocol.unregister(id: mockID) }

        let service = OsmSurfaceService(
            urlSession: session,
            primaryTimeout: .milliseconds(100),
            fallbackTimeoutCap: .milliseconds(150)
        )

        let clock = ContinuousClock()
        let start = clock.now
        let data = try await service.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: 1.0)
        let elapsed = clock.now - start

        #expect(elapsed < .milliseconds(600))
        #expect(calledHosts.snapshot() == [
            "ovp.dresel.systems",
            "overpass-api.de",
            "overpass.kumi.systems",
            "lz4.overpass-api.de",
        ])
        #expect(data.wayCount == 1)
        #expect(data.ways[0].id == 901)
        // Missing bounds in JSON must be computed automatically from geometry
        let computedBounds = try #require(data.ways[0].bounds)
        #expect(computedBounds.minlat == 47.2186)
        #expect(computedBounds.maxlat == 47.2250)

        // Cancellation test: aborts without failing over
        let cancelHosts = BoxedList<String>()
        let started = BoxedValue(false)
        let (cancelMockID, cancelSession) = OverpassAsyncDelayURLProtocol.registerSession { request, _ in
            cancelHosts.append(request.url?.host ?? "")
            started.set(true)
            return (1.5, OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), wayPayload)
        }
        defer { OverpassAsyncDelayURLProtocol.unregister(id: cancelMockID) }

        let cancelService = OsmSurfaceService(urlSession: cancelSession, primaryTimeout: .seconds(5))
        let task = Task {
            try await cancelService.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: 1.0)
        }
        while !started.get() {
            try await Task.sleep(for: .milliseconds(5))
        }
        task.cancel()

        do {
            _ = try await task.value
            Issue.record("Expected CancellationError")
        } catch is CancellationError {
            // expected
        }
        #expect(cancelHosts.snapshot() == ["ovp.dresel.systems"])
    }

    @Test("Chunk batching, way.id deduplication, non-way filtering, and Promise.all batch failure semantics")
    func chunkDedupFilteringAndBatchFailure() async throws {
        // 42 km route -> 5 chunks (~9.5km each)
        let longCoords = (0...42).map { i in
            LatLon(47.0 + Double(i) * 0.009, -1.5)
        }
        let chunkCountBox = BoxedValue(0)

        let (mockID, session) = MockURLProtocol.registerSession { request, _ in
            let call = chunkCountBox.mutate { v -> Int in v += 1; return v }
            let elements: [[String: Any]] = [
                // Non-way node -> must be ignored
                ["type": "node", "id": 1, "lat": 47.0, "lon": -1.5, "tags": ["highway": "crossing"]],
                // Way with < 2 geometry points -> must be ignored
                ["type": "way", "id": 2, "tags": ["highway": "track"], "geometry": [["lat": 47.0, "lon": -1.5]]],
                // Shared way 100 across chunks -> deduplicated
                Self.makeWayJSON(
                    id: 100,
                    tags: ["highway": "track", "surface": "fine_gravel"],
                    geometry: [["lat": 47.0, "lon": -1.5], ["lat": 47.01, "lon": -1.5]]
                ),
                // Unique way per chunk
                Self.makeWayJSON(
                    id: 200 + call,
                    tags: ["highway": "tertiary", "surface": "asphalt"],
                    geometry: [["lat": 47.02, "lon": -1.5], ["lat": 47.03, "lon": -1.5]]
                ),
            ]
            return (OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), try Self.makeOverpassJSON(elements: elements))
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let service = OsmSurfaceService(urlSession: session)
        let data = try await service.fetchOsmSurfaceForRoute(coordinates: longCoords, distanceKm: 42)
        #expect(data.chunkCount == 5)
        #expect(chunkCountBox.get() == 5)
        // 1 shared way (100) + 5 unique chunk ways (201..205) = 6 ways
        #expect(data.wayCount == 6)

        // Promise.all semantics: if one chunk fails across all mirrors, whole fetch fails
        let failChunkCalls = BoxedValue(0)
        let emptyPayload = try Self.makeOverpassJSON(elements: [])
        let (failMockID, failSession) = MockURLProtocol.registerSession { request, _ in
            let n = failChunkCalls.mutate { v -> Int in v += 1; return v }
            if n == 1 {
                return (OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), emptyPayload)
            }
            return (OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 500), Data())
        }
        defer { MockURLProtocol.unregister(id: failMockID) }

        let failingService = OsmSurfaceService(urlSession: failSession)
        do {
            _ = try await failingService.fetchOsmSurfaceForRoute(coordinates: longCoords, distanceKm: 42)
            Issue.record("Expected OsmSurfaceServiceError.allMirrorsFailed when a chunk batch fails")
        } catch let err as OsmSurfaceServiceError {
            if case .allMirrorsFailed = err {
                // expected
            } else {
                Issue.record("Unexpected OsmSurfaceServiceError: \(err)")
            }
        }
    }

    @Test("classifyOsmWay full tag matrix parity")
    func classifyOsmWayMatrix() {
        // 1. sac_scale & mtb:scale overrides
        let alpine = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "path", sacScale: "mountain_hiking"))
        #expect(alpine.surfaceType == .singletrack)
        #expect(alpine.technicality == .technical)
        #expect(alpine.suitability38c == "caution")
        #expect(alpine.effectiveCrr == 0.0155)

        let mtbPathZero = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "path", mtbScale: "S0"))
        #expect(mtbPathZero.surfaceType == .singletrack)
        #expect(mtbPathZero.technicality == .moderate)
        #expect(mtbPathZero.suitability38c == "capable")
        #expect(mtbPathZero.effectiveCrr == 0.0118)

        let mtbTwo = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "track", surface: "gravel", mtbScale: "2+"))
        #expect(mtbTwo.surfaceType == .singletrack)
        #expect(mtbTwo.technicality == .technical)
        #expect(mtbTwo.isInferredFromHighway == false)

        // 2a. Cobbles & sett
        let smoothSett = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "residential", surface: "sett"))
        #expect(smoothSett.surfaceType == .paved)
        #expect(smoothSett.technicality == .smooth)
        #expect(smoothSett.suitability38c == "ideal")
        #expect(smoothSett.effectiveCrr == 0.0068)

        let roughCobble = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "residential", surface: "cobblestone", smoothness: "bad"))
        #expect(roughCobble.surfaceType == .paved)
        #expect(roughCobble.technicality == .moderate)
        #expect(roughCobble.suitability38c == "capable")
        #expect(roughCobble.effectiveCrr == 0.0095)

        let unhewn = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "track", surface: "unhewn_cobblestone"))
        #expect(unhewn.surfaceType == .gravel)
        #expect(unhewn.technicality == .moderate)

        // 2b. Wood
        #expect(OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "path", surface: "wood")).surfaceType == .gravel)
        #expect(OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "cycleway", surface: "wood")).surfaceType == .paved)

        // 2c. Paved surfaces
        let asphalt = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "secondary", surface: "asphalt"))
        #expect(asphalt.surfaceType == .paved)
        #expect(asphalt.effectiveCrr == 0.0044)
        #expect(asphalt.isInferredFromHighway == false)

        let crackedAsphalt = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "secondary", surface: "asphalt", smoothness: "very_bad"))
        #expect(crackedAsphalt.surfaceType == .paved)
        #expect(crackedAsphalt.technicality == .moderate)
        #expect(crackedAsphalt.effectiveCrr == 0.0056)

        // 2d. Gravel surfaces
        let fineGravel = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "track", surface: "fine_gravel"))
        #expect(fineGravel.surfaceType == .gravel)
        #expect(fineGravel.technicality == .smooth)
        #expect(fineGravel.suitability38c == "ideal")
        #expect(fineGravel.effectiveCrr == 0.0068)

        let grade3Gravel = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "track", surface: "compacted", tracktype: "grade3"))
        #expect(grade3Gravel.technicality == .moderate)
        #expect(grade3Gravel.suitability38c == "capable")
        #expect(grade3Gravel.effectiveCrr == 0.0086)

        let grade5Gravel = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "track", surface: "gravel", tracktype: "grade5"))
        #expect(grade5Gravel.technicality == .technical)
        #expect(grade5Gravel.suitability38c == "caution")
        #expect(grade5Gravel.effectiveCrr == 0.0112)

        // 2e. Singletrack surfaces
        let dirt = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "path", surface: "dirt"))
        #expect(dirt.surfaceType == .singletrack)
        #expect(dirt.technicality == .moderate)
        #expect(dirt.effectiveCrr == 0.0115)

        let mud = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "path", surface: "mud"))
        #expect(mud.surfaceType == .singletrack)
        #expect(mud.technicality == .technical)
        #expect(mud.suitability38c == "caution")
        #expect(mud.effectiveCrr == 0.015)

        // 3. Tracktype without explicit surface
        #expect(OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "track", tracktype: "grade1")).surfaceType == .paved)
        #expect(OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "track", tracktype: "grade2")).technicality == .smooth)
        #expect(OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "track", tracktype: "grade4")).surfaceType == .singletrack)
        #expect(OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "track", tracktype: "grade5")).technicality == .technical)
        let bareTrack = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "track"))
        #expect(bareTrack.surfaceType == .gravel)
        #expect(bareTrack.isInferredFromHighway == true)

        // 4-6. Path / Footway / Standard Road / Unknown surface fallthrough
        #expect(OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "bridleway")).surfaceType == .singletrack)
        #expect(OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "footway")).surfaceType == .gravel)
        let secondary = OsmSurfaceService.classifyOsmWay(OsmWayTags(highway: "secondary", surface: "custom_unknown"))
        #expect(secondary.surfaceType == .paved)
        #expect(secondary.isInferredFromHighway == true)
        #expect(secondary.effectiveCrr == 0.0046)
    }

    @Test("matchPolylineEdgesToOsmWays directional & highway penalties and buildSurfaceBreakdown synthesis")
    func edgeMatchingAndBreakdownSynthesis() {
        // Route running due North along lon -1.5500
        let routeCoords = [
            LatLon(47.2000, -1.5500),
            LatLon(47.2010, -1.5500),
        ]

        // Parallel way 10m East vs perpendicular crossing way right at midpoint
        let parallelWay = OsmWayElement(
            id: 1,
            bounds: OsmBounds(minlat: 47.1995, minlon: -1.5501, maxlat: 47.2015, maxlon: -1.5498),
            geometry: [
                OsmCoordinate(lat: 47.2000, lon: -1.5499),
                OsmCoordinate(lat: 47.2010, lon: -1.5499),
            ],
            tags: OsmWayTags(highway: "track", surface: "fine_gravel", name: "Chemin du Canal")
        )
        let crossStreetWay = OsmWayElement(
            id: 2,
            bounds: OsmBounds(minlat: 47.2004, minlon: -1.5510, maxlat: 47.2006, maxlon: -1.5490),
            geometry: [
                OsmCoordinate(lat: 47.2005, lon: -1.5510),
                OsmCoordinate(lat: 47.2005, lon: -1.5490),
            ],
            tags: OsmWayTags(highway: "residential", surface: "asphalt", name: "Rue Traversière")
        )

        let matches = OsmSurfaceService.matchPolylineEdgesToOsmWays(
            coordinates: routeCoords,
            ways: [crossStreetWay, parallelWay]
        )
        #expect(matches.count == 1)
        #expect(matches[0]?.way.id == 1)

        // Private footway without bicycle=yes loses to public cycleway slightly farther away
        let privateFootway = OsmWayElement(
            id: 3,
            geometry: [
                OsmCoordinate(lat: 47.2000, lon: -1.5500),
                OsmCoordinate(lat: 47.2010, lon: -1.5500),
            ],
            tags: OsmWayTags(highway: "footway", access: "private") // +14 +24 = +38m penalty
        )
        let publicCycleway = OsmWayElement(
            id: 4,
            geometry: [
                OsmCoordinate(lat: 47.2000, lon: -1.5498),
                OsmCoordinate(lat: 47.2010, lon: -1.5498),
            ],
            tags: OsmWayTags(highway: "cycleway", surface: "asphalt") // ~15m - 3m = ~12m
        )
        let penaltyMatches = OsmSurfaceService.matchPolylineEdgesToOsmWays(
            coordinates: routeCoords,
            ways: [privateFootway, publicCycleway]
        )
        #expect(penaltyMatches[0]?.way.id == 4)

        // < 15% coverage triggers heuristic fallback
        let longRouteCoords = (0...20).map { i in
            LatLon(47.2000 + Double(i) * 0.005, -1.5500) // ~11 km north
        }
        let tinyFarWay = OsmWayElement(
            id: 5,
            bounds: OsmBounds(minlat: 47.2000, minlon: -1.5501, maxlat: 47.2005, maxlon: -1.5499),
            geometry: [
                OsmCoordinate(lat: 47.2000, lon: -1.5500),
                OsmCoordinate(lat: 47.2004, lon: -1.5500),
            ],
            tags: OsmWayTags(highway: "track", surface: "gravel")
        )
        let lowCoverageData = OsmSurfaceRouteData(
            routeKey: "k-low",
            ways: [tinyFarWay],
            wayCount: 1,
            chunkCount: 1,
            fetchedAt: "2026-11-28T00:00:00Z"
        )
        let fallbackBreakdown = OsmSurfaceService.buildSurfaceBreakdown(
            route: RouteParams(distanceKm: 11.0, coordinates: longRouteCoords),
            osmData: lowCoverageData
        )
        #expect(fallbackBreakdown.dataSource == "heuristic-fallback")

        // >= 15% coverage with uniform 15km way -> splits into 3 blocks with osm-overpass dataSource
        let uniformRouteCoords = (0...15).map { i in
            LatLon(47.2000 + Double(i) * 0.009, -1.5500) // ~15 km north
        }
        let fullGravelWay = OsmWayElement(
            id: 10,
            bounds: OsmBounds(minlat: 47.199, minlon: -1.552, maxlat: 47.340, maxlon: -1.548),
            geometry: [
                OsmCoordinate(lat: 47.2000, lon: -1.5500),
                OsmCoordinate(lat: 47.3350, lon: -1.5500),
            ],
            tags: OsmWayTags(highway: "track", surface: "fine_gravel", name: "Voie Verte", ref: "EV6")
        )
        let fullData = OsmSurfaceRouteData(
            routeKey: "k-full",
            ways: [fullGravelWay],
            wayCount: 1,
            chunkCount: 2,
            fetchedAt: "2026-11-28T00:00:00Z"
        )
        let osmBreakdown = OsmSurfaceService.buildSurfaceBreakdown(
            route: RouteParams(distanceKm: 15.0, coordinates: uniformRouteCoords),
            osmData: fullData
        )
        #expect(osmBreakdown.dataSource == "osm-overpass")
        #expect(osmBreakdown.gravelPct == 100)
        #expect(osmBreakdown.segments.count == 3) // Pass 3 splits >= 12km uniform block into 3
        #expect(osmBreakdown.segments[0].nameEn == "Voie Verte (EV6)")
        #expect(osmBreakdown.segments[0].osmWayIds == [10])
        #expect(osmBreakdown.pointSurfaces.count == 49)
        #expect(osmBreakdown.osmCoveragePct == 100)
        #expect(osmBreakdown.explicitTagPct == 100)
        #expect(osmBreakdown.suitability.recommendedFrontBar > 1.4)
    }

    @Test("Memory cache, in-flight coalescing, CadenceStore persistence, and offline expired fallback")
    func cacheInFlightAndOfflineFallback() async throws {
        let store = CadenceStore(modelContainer: try CadenceModelContainer.makeContainer(inMemory: true))
        let nowBox = BoxedValue(Date(timeIntervalSince1970: 1_700_000_000))
        let httpCalls = BoxedValue(0)
        let coords = [LatLon(47.2186, -1.5541), LatLon(47.2300, -1.5650)]
        let payload = try Self.makeOverpassJSON(elements: [
            Self.makeWayJSON(
                id: 808,
                tags: ["highway": "track", "surface": "compacted"],
                geometry: [["lat": 47.2186, "lon": -1.5541], ["lat": 47.2300, "lon": -1.5650]]
            ),
        ])

        let (mockID, session) = OverpassAsyncDelayURLProtocol.registerSession { request, _ in
            httpCalls.mutate { $0 += 1 }
            return (0.04, OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), payload)
        }
        defer { OverpassAsyncDelayURLProtocol.unregister(id: mockID) }

        let service1 = OsmSurfaceService(
            urlSession: session,
            store: store,
            nowProvider: { nowBox.get() }
        )

        // Concurrent calls coalesce to 1 HTTP pass
        async let f1 = service1.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: 1.5)
        async let f2 = service1.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: 1.5)
        let (d1, d2) = try await (f1, f2)
        #expect(httpCalls.get() == 1)
        #expect(d1 == d2)
        #expect(d1.wayCount == 1)

        // Second instance reads SDCachedSurface with 0 HTTP calls
        let service2 = OsmSurfaceService(
            urlSession: session,
            store: store,
            nowProvider: { nowBox.get() }
        )
        let cached = try await service2.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: 1.5)
        #expect(httpCalls.get() == 1)
        #expect(cached.ways == d1.ways)

        // forceFresh bypasses memory + SwiftData cache
        _ = try await service2.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: 1.5, forceFresh: true)
        #expect(httpCalls.get() == 2)

        // Expired SwiftData row + failing network returns offline fallback (allowExpired: true)
        nowBox.set(nowBox.get().addingTimeInterval(OsmSurfaceService.defaultCacheTTLSeconds + 120))
        let (failMockID, failSession) = MockURLProtocol.registerSession { request, _ in
            return (OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 503), Data())
        }
        defer { MockURLProtocol.unregister(id: failMockID) }

        let offlineService = OsmSurfaceService(
            urlSession: failSession,
            store: store,
            nowProvider: { nowBox.get() }
        )
        let fallback = try await offlineService.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: 1.5)
        #expect(fallback.ways == d1.ways)
    }

    @Test("CoalescedFlight multi-waiter partial cancellation keeps surface flight alive for remaining waiter")
    func multiWaiterPartialCancellation() async throws {
        let httpCalls = BoxedValue(0)
        let firstStarted = BoxedValue(false)
        let coords = [LatLon(47.2186, -1.5541), LatLon(47.2300, -1.5650)]
        let payload = try Self.makeOverpassJSON(elements: [
            Self.makeWayJSON(
                id: 910,
                tags: ["highway": "cycleway", "surface": "asphalt"],
                geometry: [["lat": 47.2186, "lon": -1.5541], ["lat": 47.2300, "lon": -1.5650]]
            ),
        ])

        let (mockID, session) = OverpassAsyncDelayURLProtocol.registerSession { request, _ in
            httpCalls.mutate { $0 += 1 }
            firstStarted.set(true)
            return (0.12, OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), payload)
        }
        defer { OverpassAsyncDelayURLProtocol.unregister(id: mockID) }

        let service = OsmSurfaceService(urlSession: session, primaryTimeout: .seconds(5))
        let taskA = Task {
            try await service.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: 1.5)
        }
        let taskB = Task {
            try await service.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: 1.5)
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

        let resultB = try await taskB.value
        #expect(resultB.wayCount == 1)
        #expect(resultB.ways[0].id == 910)
        #expect(httpCalls.get() == 1)
    }

    @Test("Immediate cancel-then-rejoin stress loop (50 iterations) yields 0 spurious cancellations and never clobbers memoryCache")
    func immediateCancelThenRejoinStress() async throws {
        let coords = [LatLon(47.2186, -1.5541), LatLon(47.2300, -1.5650)]
        let payload = try Self.makeOverpassJSON(elements: [
            Self.makeWayJSON(
                id: 920,
                tags: ["highway": "track", "surface": "fine_gravel"],
                geometry: [["lat": 47.2186, "lon": -1.5541], ["lat": 47.2300, "lon": -1.5650]]
            ),
        ])

        let requestCounter = BoxedValue(0)
        let (mockID, session) = OverpassAsyncDelayURLProtocol.registerSession { request, _ in
            let n = requestCounter.mutate { v -> Int in v += 1; return v }
            let delay = (n % 2 == 1) ? 0.08 : 0.01
            return (delay, OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), payload)
        }
        defer { OverpassAsyncDelayURLProtocol.unregister(id: mockID) }

        let service = OsmSurfaceService(urlSession: session, primaryTimeout: .seconds(5))
        var spuriousCancellations = 0

        for i in 0..<50 {
            await service.clearMemoryCache()
            let dist = 1.5 + Double(i) * 0.1
            let t1 = Task {
                try await service.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: dist)
            }
            if i % 2 == 0 {
                try await Task.sleep(for: .milliseconds(2))
            }
            t1.cancel()
            // Immediately launch uncancelled t2 for the exact same key without awaiting t1 or sleeping
            let t2 = Task {
                try await service.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: dist)
            }

            do {
                let res = try await t2.value
                #expect(res.wayCount == 1)
                #expect(res.ways[0].id == 920)
            } catch is CancellationError {
                spuriousCancellations += 1
            }
            _ = try? await t1.value
            // Allow any pending cleanup task from t1 to settle, then verify t2's cached result wasn't clobbered
            try await Task.sleep(for: .milliseconds(2))
            let cached = await service.getCachedOsmSurface(coordinates: coords, distanceKm: dist)
            #expect(cached?.wayCount == 1)
        }

        #expect(spuriousCancellations == 0)
    }

    @Test("Pre-cancelled task throws CancellationError without issuing HTTP requests or leaving stale loading cache")
    func preCancelledTaskLeavesCleanState() async throws {
        let httpCalls = BoxedValue(0)
        let coords = [LatLon(47.2186, -1.5541), LatLon(47.2300, -1.5650)]
        let (mockID, session) = MockURLProtocol.registerSession { request, _ in
            httpCalls.mutate { $0 += 1 }
            return (OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), Data("{\"elements\":[]}".utf8))
        }
        defer { MockURLProtocol.unregister(id: mockID) }

        let service = OsmSurfaceService(urlSession: session)
        let preCancelledTask = Task<OsmSurfaceRouteData, Error> {
            withUnsafeCurrentTask { $0?.cancel() }
            return try await service.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: 1.5)
        }

        do {
            _ = try await preCancelledTask.value
            Issue.record("Expected CancellationError for pre-cancelled task")
        } catch is CancellationError {
            // expected
        }
        #expect(httpCalls.get() == 0)
        #expect(await service.getCachedOsmSurface(coordinates: coords, distanceKm: 1.5) == nil)
    }

    @Test("forceFresh fast R2 is not overwritten by slower R1 in memoryCache or CadenceStore, and getCachedOsmSurface preserves active loading guard")
    func forceFreshNotOverwrittenBySlowerInFlightRequest() async throws {
        let store = CadenceStore(modelContainer: try CadenceModelContainer.makeContainer(inMemory: true))
        let coords = [LatLon(47.2186, -1.5541), LatLon(47.2300, -1.5650)]
        let routeKey = OsmSurfaceService.routeKey(coordinates: coords, distanceKm: 1.5)

        let stalePayload = try Self.makeOverpassJSON(elements: [
            Self.makeWayJSON(
                id: 1001,
                tags: ["highway": "track", "surface": "gravel"],
                geometry: [["lat": 47.2186, "lon": -1.5541], ["lat": 47.2300, "lon": -1.5650]]
            ),
        ])
        let freshPayload = try Self.makeOverpassJSON(elements: [
            Self.makeWayJSON(
                id: 1002,
                tags: ["highway": "cycleway", "surface": "asphalt"],
                geometry: [["lat": 47.2186, "lon": -1.5541], ["lat": 47.2240, "lon": -1.5590]]
            ),
            Self.makeWayJSON(
                id: 1003,
                tags: ["highway": "cycleway", "surface": "asphalt"],
                geometry: [["lat": 47.2240, "lon": -1.5590], ["lat": 47.2300, "lon": -1.5650]]
            ),
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

        let service = OsmSurfaceService(urlSession: session, store: store, primaryTimeout: .seconds(5))

        let r1Task = Task {
            try await service.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: 1.5, forceFresh: false)
        }
        while !r1Started.get() {
            try await Task.sleep(for: .milliseconds(2))
        }

        // Seed store with stale data while R2 (forceFresh: true) is actively in flight to also verify
        // getCachedOsmSurface() hydration does not clobber R2's activeRequestId.
        let preSeeded = OsmSurfaceRouteData(
            routeKey: routeKey,
            ways: [
                OsmWayElement(
                    id: 999,
                    geometry: [OsmCoordinate(lat: 47.2186, lon: -1.5541), OsmCoordinate(lat: 47.2300, lon: -1.5650)],
                    tags: OsmWayTags(highway: "track")
                ),
            ],
            wayCount: 1,
            chunkCount: 1,
            fetchedAt: "2026-11-28T00:00:00Z"
        )
        try await store.saveCachedSurface(preSeeded, ttlSeconds: 3600, pinOffline: false)

        let r2Result = try await service.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: 1.5, forceFresh: true)
        #expect(r2Started.get() == true)
        #expect(r2Result.wayCount == 2)

        // Wait for slow R1 to complete after R2 already finished
        let r1Result = try await r1Task.value
        #expect(r1Result.wayCount == 1)

        let cachedMem = await service.getCachedOsmSurface(coordinates: coords, distanceKm: 1.5)
        let cachedStore = try await store.fetchCachedSurface(routeKey: routeKey, allowExpired: false)
        #expect(cachedMem?.wayCount == 2)
        #expect(cachedMem?.ways.map(\.id) == [1002, 1003])
        #expect(cachedStore?.wayCount == 2)
        #expect(cachedStore?.ways.map(\.id) == [1002, 1003])

        // Verify getCachedOsmSurface() while a forceFresh flight is actively .loading does not clobber activeRequestId
        let fresh2Payload = try Self.makeOverpassJSON(elements: [
            Self.makeWayJSON(
                id: 2001,
                tags: ["highway": "primary", "surface": "asphalt"],
                geometry: [["lat": 47.2186, "lon": -1.5541], ["lat": 47.2300, "lon": -1.5650]]
            ),
            Self.makeWayJSON(
                id: 2002,
                tags: ["highway": "primary", "surface": "asphalt"],
                geometry: [["lat": 47.2186, "lon": -1.5541], ["lat": 47.2300, "lon": -1.5650]]
            ),
            Self.makeWayJSON(
                id: 2003,
                tags: ["highway": "primary", "surface": "asphalt"],
                geometry: [["lat": 47.2186, "lon": -1.5541], ["lat": 47.2300, "lon": -1.5650]]
            ),
        ])
        let r3Started = BoxedValue(false)
        let (mockID2, session2) = OverpassAsyncDelayURLProtocol.registerSession { request, _ in
            r3Started.set(true)
            return (0.08, OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), fresh2Payload)
        }
        defer { OverpassAsyncDelayURLProtocol.unregister(id: mockID2) }

        let service2 = OsmSurfaceService(urlSession: session2, store: store, primaryTimeout: .seconds(5))
        let r3Task = Task {
            try await service2.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: 1.5, forceFresh: true)
        }
        while !r3Started.get() {
            try await Task.sleep(for: .milliseconds(2))
        }
        // Hydrating from store while R3 is .loading must not overwrite R3's activeRequestId
        let midRead = await service2.getCachedOsmSurface(routeKey: routeKey)
        #expect(midRead?.wayCount == 2)
        let r3Result = try await r3Task.value
        #expect(r3Result.wayCount == 3)
        let postR3Mem = await service2.getCachedOsmSurface(routeKey: routeKey)
        let postR3Store = try await store.fetchCachedSurface(routeKey: routeKey, allowExpired: false)
        #expect(postR3Mem?.wayCount == 3)
        #expect(postR3Store?.wayCount == 3)
    }

    @Test("clearMemoryCache() suppresses in-flight request from repopulating memoryCache or CadenceStore")
    func clearMemoryCacheSuppressesInFlightRepopulation() async throws {
        let store = CadenceStore(modelContainer: try CadenceModelContainer.makeContainer(inMemory: true))
        let coords = [LatLon(47.2186, -1.5541), LatLon(47.2300, -1.5650)]
        let routeKey = OsmSurfaceService.routeKey(coordinates: coords, distanceKm: 1.5)
        let payload = try Self.makeOverpassJSON(elements: [
            Self.makeWayJSON(
                id: 3001,
                tags: ["highway": "track", "surface": "compacted"],
                geometry: [["lat": 47.2186, "lon": -1.5541], ["lat": 47.2300, "lon": -1.5650]]
            ),
        ])

        let requestStarted = BoxedValue(false)
        let (mockID, session) = OverpassAsyncDelayURLProtocol.registerSession { request, _ in
            requestStarted.set(true)
            return (0.12, OverpassTestSupport.makeHTTPResponse(url: request.url!, statusCode: 200), payload)
        }
        defer { OverpassAsyncDelayURLProtocol.unregister(id: mockID) }

        let service = OsmSurfaceService(urlSession: session, store: store, primaryTimeout: .seconds(5))
        let inFlightTask = Task {
            try await service.fetchOsmSurfaceForRoute(coordinates: coords, distanceKm: 1.5)
        }
        while !requestStarted.get() {
            try await Task.sleep(for: .milliseconds(2))
        }

        await service.clearMemoryCache()
        let result = try await inFlightTask.value
        #expect(result.wayCount == 1)

        let postClearMem = await service.getCachedOsmSurface(coordinates: coords, distanceKm: 1.5)
        let postClearStore = try await store.fetchCachedSurface(routeKey: routeKey, allowExpired: false)
        #expect(postClearMem == nil)
        #expect(postClearStore == nil)
    }
}
