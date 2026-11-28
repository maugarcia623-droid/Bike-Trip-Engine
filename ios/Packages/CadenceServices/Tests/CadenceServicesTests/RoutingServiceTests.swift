import Foundation
import Testing
import CadenceCore
@testable import CadenceServices

private struct MockGeocoder: LocationGeocoding {
    let mapping: [String: LatLon]

    func geocodeLocation(_ query: String, lang: CadenceLang, biasCoords: LatLon?) async -> LatLon? {
        mapping[query]
    }
}

private struct MockElevationFetcher: ElevationFetching {
    let result: ElevationResult?

    func fetchDemElevationProfile(
        coordinates: [LatLon],
        totalDistanceKm: Double?,
        timeoutSeconds: TimeInterval
    ) async -> ElevationResult? {
        result
    }
}

@Suite("RoutingService")
struct RoutingServiceTests {
    private static func makeHTTPResponse(url: URL, statusCode: Int = 200) -> HTTPURLResponse {
        HTTPURLResponse(
            url: url,
            statusCode: statusCode,
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": "application/json"]
        )!
    }

    private static func osrmPayload(
        distanceM: Double,
        durationS: Double,
        lonLatCoords: [[Double]],
        legs: [[String: Any]]? = nil
    ) throws -> Data {
        let resolvedLegs: [[String: Any]] = legs ?? [
            [
                "distance": distanceM,
                "duration": durationS,
                "steps": [
                    [
                        "distance": distanceM,
                        "name": "Rue de Strasbourg",
                        "maneuver": [
                            "type": "depart",
                            "modifier": "straight",
                            "location": lonLatCoords.first ?? [-1.5541, 47.2186],
                        ],
                    ],
                    [
                        "distance": 0,
                        "name": "",
                        "maneuver": [
                            "type": "arrive",
                            "location": lonLatCoords.last ?? [-2.2139, 47.2734],
                        ],
                    ],
                ],
            ],
        ]
        let payload: [String: Any] = [
            "routes": [
                [
                    "distance": distanceM,
                    "duration": durationS,
                    "geometry": ["coordinates": lonLatCoords],
                    "legs": resolvedLegs,
                ],
            ],
        ]
        return try JSONSerialization.data(withJSONObject: payload)
    }

    private static func makeSampleTrip(
        routeMode: String = "manual-radius",
        coords: [LatLon],
        distanceKm: Double = 30.0
    ) -> TripProfile {
        TripProfile(
            id: "trip-routing-1",
            name: "Nantes - Saint-Nazaire",
            tag: "commute",
            route: RouteParams(
                origin: "Nantes",
                destination: "Saint-Nazaire",
                distanceKm: distanceKm,
                targetSpeedKmH: 25,
                coordinates: coords,
                routeMode: routeMode,
                originCoords: coords.first,
                destCoords: coords.last,
                radiusMeters: routeMode == "manual-radius" ? 5000 : nil
            ),
            stages: [
                TripStage(
                    id: "stage-1",
                    dayNumber: 1,
                    departureDate: "2026-06-15",
                    departureTime: "08:00",
                    route: RouteParams(distanceKm: distanceKm, coordinates: coords),
                    office: OfficeConstraints(),
                    weather: WeatherCondition()
                ),
            ],
            activeStageIndex: 0
        )
    }

    @Test("OSRM primary->secondary failover, error precedence, and multi-waypoint calculateAutoBikeRoute")
    func osrmFailoverErrorPrecedenceAndMultiWaypointRoute() async throws {
        let requestedURLs = BoxedList<URL>()
        let scenario = BoxedValue("failoverSuccess")

        let (id, session) = MockURLProtocol.registerSession { request, _ in
            let url = request.url!
            let host = url.host ?? ""

            if host.contains("open-meteo.com") {
                let data = try JSONSerialization.data(withJSONObject: ["elevation": Array(repeating: 22.0, count: 60)])
                return (Self.makeHTTPResponse(url: url), data)
            }

            requestedURLs.append(url)
            switch scenario.get() {
            case "failoverSuccess":
                if host.contains("routing.openstreetmap.de") {
                    return (Self.makeHTTPResponse(url: url, statusCode: 503), Data())
                }
                let coords = [[-1.5541, 47.2186], [-1.8500, 47.2400], [-2.2139, 47.2734]]
                let legs: [[String: Any]] = [
                    [
                        "distance": 24000.0,
                        "duration": 3600.0,
                        "steps": [[
                            "distance": 24000.0,
                            "name": "Quai de la Fosse",
                            "maneuver": ["type": "depart", "modifier": "straight", "location": [-1.5541, 47.2186]],
                        ]],
                    ],
                    [
                        "distance": 36000.0,
                        "duration": 5400.0,
                        "steps": [[
                            "distance": 36000.0,
                            "name": "Route de l'Estuaire",
                            "maneuver": ["type": "turn", "modifier": "left", "location": [-1.8500, 47.2400]],
                        ]],
                    ],
                ]
                let data = try Self.osrmPayload(distanceM: 60000, durationS: 9000, lonLatCoords: coords, legs: legs)
                return (Self.makeHTTPResponse(url: url), data)

            case "emptyRoutes":
                return (Self.makeHTTPResponse(url: url), Data(#"{"routes":[]}"#.utf8))

            case "timeoutThen502":
                if host.contains("routing.openstreetmap.de") {
                    throw URLError(.timedOut)
                }
                return (Self.makeHTTPResponse(url: url, statusCode: 502), Data())

            default:
                return (Self.makeHTTPResponse(url: url, statusCode: 500), Data())
            }
        }
        defer { MockURLProtocol.unregister(id: id) }

        let geocoder = MockGeocoder(mapping: [
            "Nantes": LatLon(47.2186, -1.5541),
            "Cordemais": LatLon(47.2400, -1.8500),
            "Saint-Nazaire": LatLon(47.2734, -2.2139),
        ])
        let demStub = MockElevationFetcher(result: DemElevationResult(
            elevationProfile: [
                ElevationProfilePoint(distKm: 0, eleM: 12, gradePct: 0),
                ElevationProfilePoint(distKm: 60, eleM: 28, gradePct: 0.3),
            ],
            elevationGainM: 320,
            elevationLossM: 304
        ))

        let service = RoutingService(
            urlSession: session,
            locationService: geocoder,
            elevationService: demStub
        )

        let route = try await service.calculateAutoBikeRoute(
            originText: "Nantes",
            destText: "Saint-Nazaire",
            waypoints: [RouteWaypointParam(id: "wp-cordemais", name: "Cordemais")],
            lang: .en
        )

        let urls = requestedURLs.snapshot()
        #expect(urls.count == 2)
        #expect(urls[0].host == "routing.openstreetmap.de")
        #expect(urls[1].host == "router.project-osrm.org")
        #expect(urls[0].absoluteString.contains("-1.5541,47.2186;-1.85,47.24;-2.2139,47.2734"))
        #expect(urls[0].query?.contains("overview=full") == true)
        #expect(urls[0].query?.contains("steps=true") == true)

        #expect(route.distanceKm == 60.0)
        #expect(route.estimatedMinutes == 150)
        #expect(route.coordinates.first == LatLon(47.2186, -1.5541))
        #expect(route.legs?.count == 2)
        #expect(route.resolvedWaypoints?.first?.distanceFromStartKm == 24.0)
        #expect(route.elevationGainM == 320.0)
        #expect(route.elevationLossM == 304.0)
        #expect(route.cueSheet?.isEmpty == false)

        // Empty routes -> noCyclingPathFound
        scenario.set("emptyRoutes")
        await #expect(throws: RoutingServiceError.noCyclingPathFound(lang: .en)) {
            _ = try await service.calculateAutoBikeRoute(originText: "Nantes", destText: "Saint-Nazaire", lang: .en)
        }

        // Timeout on primary + HTTP 502 on secondary -> httpStatusError(502) takes precedence
        scenario.set("timeoutThen502")
        await #expect(throws: RoutingServiceError.httpStatusError(statusCode: 502, lang: .fr)) {
            _ = try await service.calculateAutoBikeRoute(originText: "Nantes", destText: "Saint-Nazaire", lang: .fr)
        }

        // Unresolvable origin -> originGeocodeFailed
        await #expect(throws: RoutingServiceError.originGeocodeFailed(query: "Nowhere", lang: .en)) {
            _ = try await service.calculateAutoBikeRoute(originText: "Nowhere", destText: "Saint-Nazaire", lang: .en)
        }
    }

    @Test("generateBikeLoopRoute adaptive calibration pass and offline geometric fallback")
    func loopCalibrationAndOfflineFallback() async throws {
        let osrmCalls = BoxedValue(0)
        let loopMode = BoxedValue("calibrate")

        let (id, session) = MockURLProtocol.registerSession { request, _ in
            let url = request.url!
            let callIndex = osrmCalls.mutate { val -> Int in
                val += 1
                return val
            }

            switch loopMode.get() {
            case "withinTolerance":
                // Target 50 km, OSRM returns 46 km (8% error <= 18%) -> only 1 OSRM call
                let data = try Self.osrmPayload(
                    distanceM: 46000,
                    durationS: 7200,
                    lonLatCoords: [[-1.5541, 47.2186], [-1.45, 47.30], [-1.5541, 47.2186]]
                )
                return (Self.makeHTTPResponse(url: url), data)

            case "calibrate":
                // Target 50 km, Pass 1 returns 32 km (36% error > 18%) -> triggers Pass 2 returning 49 km
                let distM = callIndex == 1 ? 32000.0 : 49000.0
                let data = try Self.osrmPayload(
                    distanceM: distM,
                    durationS: 7200,
                    lonLatCoords: [[-1.5541, 47.2186], [-1.45, 47.30], [-1.5541, 47.2186]]
                )
                return (Self.makeHTTPResponse(url: url), data)

            default:
                return (Self.makeHTTPResponse(url: url, statusCode: 503), Data())
            }
        }
        defer { MockURLProtocol.unregister(id: id) }

        let service = RoutingService(
            urlSession: session,
            locationService: MockGeocoder(mapping: ["Nantes": LatLon(47.2186, -1.5541)]),
            elevationService: MockElevationFetcher(result: nil)
        )

        loopMode.set("withinTolerance")
        let singlePass = try await service.generateBikeLoopRoute(
            originText: "Nantes",
            targetDistanceKm: 50
        )
        #expect(osrmCalls.get() == 1)
        #expect(singlePass.usedOfflineFallback == false)
        #expect(singlePass.distanceKm == 46.0)

        osrmCalls.set(0)
        loopMode.set("calibrate")
        let calibrated = try await service.generateBikeLoopRoute(
            originText: "Nantes",
            targetDistanceKm: 50
        )
        #expect(osrmCalls.get() == 2)
        #expect(calibrated.distanceKm == 49.0)

        loopMode.set("offline")
        let offlineLoop = try await service.generateBikeLoopRoute(
            originText: "Nantes",
            targetDistanceKm: 42,
            shape: .loop
        )
        #expect(offlineLoop.usedOfflineFallback == true)
        #expect(offlineLoop.coordinates.count == 33)
        #expect(offlineLoop.distanceKm == 42.0)

        let offlineOab = try await service.generateBikeLoopRoute(
            originText: "Nantes",
            targetDistanceKm: 30,
            shape: .outAndBack
        )
        #expect(offlineOab.usedOfflineFallback == true)
        #expect(offlineOab.coordinates.count == 21)
        #expect(offlineOab.estimatedMinutes == 86)
    }

    @Test("rerouteTripThroughAmenity & removeAmenityFromRoute (corridor promotion, GPX splice, offline fallback, SwiftData cache)")
    func amenityReroutingGpxAndStoreCache() async throws {
        let store = try CadenceModelContainer.makeStore(inMemory: true)
        let osrmFail = BoxedValue(false)

        let (id, session) = MockURLProtocol.registerSession { request, _ in
            let url = request.url!
            if osrmFail.get() {
                return (Self.makeHTTPResponse(url: url, statusCode: 503), Data())
            }
            let data = try Self.osrmPayload(
                distanceM: 32500,
                durationS: 4800,
                lonLatCoords: [
                    [-1.5541, 47.2186],
                    [-1.8000, 47.2450],
                    [-2.2139, 47.2734],
                ]
            )
            return (Self.makeHTTPResponse(url: url), data)
        }
        defer { MockURLProtocol.unregister(id: id) }

        let service = RoutingService(
            urlSession: session,
            locationService: MockGeocoder(mapping: [:]),
            elevationService: MockElevationFetcher(result: nil),
            store: store
        )

        let baseCoords = [
            LatLon(47.2186, -1.5541),
            LatLon(47.2400, -1.8500),
            LatLon(47.2734, -2.2139),
        ]
        let amenity = StageAmenity(
            id: "water-42",
            category: .water,
            subType: "drinking_water",
            name: "Fontaine Cordemais",
            lat: 47.2450,
            lon: -1.8000,
            routeKm: 14.0,
            detourMeters: 250
        )

        // 1. Corridor / manual-radius -> promotes to corridor, clears radiusMeters, saves SDCachedCorridorScan
        let manualTrip = Self.makeSampleTrip(routeMode: "manual-radius", coords: baseCoords, distanceKm: 30.0)
        let added = await service.rerouteTripThroughAmenity(trip: manualTrip, amenity: amenity, currentAmenities: [amenity])
        #expect(added.usedOfflineFallback == false)
        #expect(added.updatedTrip.route.routeMode == "corridor")
        #expect(added.updatedTrip.route.radiusMeters == nil)
        #expect(added.updatedTrip.route.distanceKm == 32.5)
        #expect(RoutingService.isAmenityInRoute(added.updatedTrip.route, amenity: amenity) == true)

        let expectedHash = RouteCacheKey.routeHashKey(
            coordinates: added.updatedTrip.route.coordinates,
            stageId: "stage-1",
            totalDistanceKm: added.updatedTrip.route.distanceKm
        )
        let persistedScan = try await store.fetchCachedCorridorScan(cacheKey: expectedHash)
        #expect(persistedScan?.count == 1)

        // 2. Remove with unpin: false vs unpin: true
        let removedKeepPin = await service.removeAmenityFromRoute(
            trip: added.updatedTrip,
            amenity: amenity,
            currentAmenities: added.updatedAmenities,
            unpin: false
        )
        #expect(removedKeepPin.updatedTrip.pinnedAmenities?.count == 1)
        #expect(RoutingService.isAmenityInRoute(removedKeepPin.updatedTrip.route, amenity: amenity) == false)

        let removedUnpin = await service.removeAmenityFromRoute(
            trip: added.updatedTrip,
            amenity: amenity,
            currentAmenities: added.updatedAmenities,
            unpin: true
        )
        #expect(removedUnpin.updatedTrip.pinnedAmenities?.isEmpty == true)

        // 3. GPX >= 10 coords splice + offline fallback
        let gpxCoords = (0..<12).map { i in
            LatLon(47.2186 + Double(i) * 0.005, -1.5541 - Double(i) * 0.05)
        }
        let gpxTrip = Self.makeSampleTrip(routeMode: "gpx", coords: gpxCoords, distanceKm: 45.0)
        let gpxAdded = await service.rerouteTripThroughAmenity(trip: gpxTrip, amenity: amenity)
        #expect(gpxAdded.usedOfflineFallback == false)
        #expect(gpxAdded.updatedTrip.route.cueSheet == nil)

        osrmFail.set(true)
        let offlineRemoved = await service.removeAmenityFromRoute(trip: added.updatedTrip, amenity: amenity, unpin: true)
        #expect(offlineRemoved.usedOfflineFallback == true)

        // 4. Pure helpers: togglePinnedAmenityOnTrip & doesWaypointMatchAmenity proximity (< 40m)
        let toggled = RoutingService.togglePinnedAmenityOnTrip(manualTrip, amenity: amenity)
        #expect(toggled.isNowPinned == true)
        #expect(toggled.updatedTrip.pinnedAmenities?.count == 1)
        let nearWp = RouteWaypoint(id: "custom", name: "Nearby", coordinates: LatLon(amenity.lat + 0.0001, amenity.lon))
        #expect(RoutingService.doesWaypointMatchAmenity(nearWp, amenity: amenity) == true)
    }
}
