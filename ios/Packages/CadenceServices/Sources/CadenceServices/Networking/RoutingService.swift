import Foundation
import CadenceCore

public struct RouteWaypointParam: Codable, Sendable, Equatable {
    public var id: String?
    public var name: String
    public var coordinates: LatLon?
    public var distanceFromStartKm: Double?
    public var sourceAmenityId: String?

    public init(
        id: String? = nil,
        name: String,
        coordinates: LatLon? = nil,
        distanceFromStartKm: Double? = nil,
        sourceAmenityId: String? = nil
    ) {
        self.id = id
        self.name = name
        self.coordinates = coordinates
        self.distanceFromStartKm = distanceFromStartKm
        self.sourceAmenityId = sourceAmenityId
    }

    public init(from waypoint: RouteWaypoint) {
        self.id = waypoint.id
        self.name = waypoint.name
        self.coordinates = waypoint.coordinates
        self.distanceFromStartKm = waypoint.distanceFromStartKm
        self.sourceAmenityId = waypoint.sourceAmenityId
    }
}

public struct CalculatedBikeRouteLeg: Codable, Sendable, Equatable {
    public var distanceKm: Double
    public var estimatedMinutes: Int

    public init(distanceKm: Double, estimatedMinutes: Int) {
        self.distanceKm = distanceKm
        self.estimatedMinutes = estimatedMinutes
    }
}

public struct ResolvedWaypoint: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var name: String
    public var coordinates: LatLon
    public var distanceFromStartKm: Double?
    public var sourceAmenityId: String?

    public init(
        id: String,
        name: String,
        coordinates: LatLon,
        distanceFromStartKm: Double? = nil,
        sourceAmenityId: String? = nil
    ) {
        self.id = id
        self.name = name
        self.coordinates = coordinates
        self.distanceFromStartKm = distanceFromStartKm
        self.sourceAmenityId = sourceAmenityId
    }

    public func toRouteWaypoint() -> RouteWaypoint {
        RouteWaypoint(
            id: id,
            name: name,
            coordinates: coordinates,
            distanceFromStartKm: distanceFromStartKm,
            sourceAmenityId: sourceAmenityId
        )
    }
}

public struct CalculatedBikeRoute: Codable, Sendable, Equatable {
    public var coordinates: [LatLon]
    public var distanceKm: Double
    public var estimatedMinutes: Int
    public var elevationGainM: Double?
    public var elevationLossM: Double?
    public var elevationProfile: [ElevationProfilePoint]?
    public var legs: [CalculatedBikeRouteLeg]?
    public var resolvedWaypoints: [ResolvedWaypoint]?
    public var cueSheet: [RouteCueStep]?

    public init(
        coordinates: [LatLon],
        distanceKm: Double,
        estimatedMinutes: Int,
        elevationGainM: Double? = nil,
        elevationLossM: Double? = nil,
        elevationProfile: [ElevationProfilePoint]? = nil,
        legs: [CalculatedBikeRouteLeg]? = nil,
        resolvedWaypoints: [ResolvedWaypoint]? = nil,
        cueSheet: [RouteCueStep]? = nil
    ) {
        self.coordinates = coordinates
        self.distanceKm = distanceKm
        self.estimatedMinutes = estimatedMinutes
        self.elevationGainM = elevationGainM
        self.elevationLossM = elevationLossM
        self.elevationProfile = elevationProfile
        self.legs = legs
        self.resolvedWaypoints = resolvedWaypoints
        self.cueSheet = cueSheet
    }
}

public enum LoopShape: String, Codable, Sendable, CaseIterable, Equatable {
    case loop
    case outAndBack = "out-and-back"
}

public struct GeneratedBikeLoopResult: Codable, Sendable, Equatable {
    public var route: CalculatedBikeRoute
    public var originCoordinates: LatLon
    public var usedOfflineFallback: Bool
    public var shape: LoopShape

    public var coordinates: [LatLon] { route.coordinates }
    public var distanceKm: Double { route.distanceKm }
    public var estimatedMinutes: Int { route.estimatedMinutes }
    public var elevationGainM: Double? { route.elevationGainM }
    public var elevationLossM: Double? { route.elevationLossM }
    public var elevationProfile: [ElevationProfilePoint]? { route.elevationProfile }
    public var legs: [CalculatedBikeRouteLeg]? { route.legs }
    public var resolvedWaypoints: [ResolvedWaypoint]? { route.resolvedWaypoints }
    public var cueSheet: [RouteCueStep]? { route.cueSheet }

    public init(
        route: CalculatedBikeRoute,
        originCoordinates: LatLon,
        usedOfflineFallback: Bool,
        shape: LoopShape
    ) {
        self.route = route
        self.originCoordinates = originCoordinates
        self.usedOfflineFallback = usedOfflineFallback
        self.shape = shape
    }
}

public struct RerouteAmenityResult: Codable, Sendable, Equatable {
    public var updatedTrip: TripProfile
    public var updatedAmenities: [StageAmenity]
    public var actualDetourKm: Double
    public var usedOfflineFallback: Bool

    public init(
        updatedTrip: TripProfile,
        updatedAmenities: [StageAmenity],
        actualDetourKm: Double,
        usedOfflineFallback: Bool
    ) {
        self.updatedTrip = updatedTrip
        self.updatedAmenities = updatedAmenities
        self.actualDetourKm = actualDetourKm
        self.usedOfflineFallback = usedOfflineFallback
    }
}

public enum RoutingServiceError: Error, Sendable, Equatable, LocalizedError {
    case originGeocodeFailed(query: String, lang: CadenceLang)
    case destinationGeocodeFailed(query: String, lang: CadenceLang)
    case waypointGeocodeFailed(label: String, lang: CadenceLang)
    case loopOriginGeocodeFailed(query: String, lang: CadenceLang)
    case noCyclingPathFound(lang: CadenceLang)
    case httpStatusError(statusCode: Int, lang: CadenceLang)
    case requestTimedOut(lang: CadenceLang)
    case invalidResponse(String)

    public var errorDescription: String? {
        switch self {
        case let .originGeocodeFailed(query, lang):
            return lang == .fr
                ? "Impossible de trouver les coordonnées du départ (\"\(query)\"). Choisissez une suggestion dans la liste."
                : "Could not find coordinates for origin (\"\(query)\"). Please choose a suggestion from the dropdown."
        case let .destinationGeocodeFailed(query, lang):
            return lang == .fr
                ? "Impossible de trouver les coordonnées de la destination (\"\(query)\"). Choisissez une suggestion dans la liste."
                : "Could not find coordinates for destination (\"\(query)\"). Please choose a suggestion from the dropdown."
        case let .waypointGeocodeFailed(label, lang):
            return lang == .fr
                ? "Impossible de localiser l’arrêt intermédiaire \"\(label)\". Choisissez une suggestion dans la liste."
                : "Could not locate intermediate stop \"\(label)\". Please pick a suggestion from the dropdown."
        case let .loopOriginGeocodeFailed(query, lang):
            return lang == .fr
                ? "Impossible de localiser \"\(query)\". Sélectionnez un lieu dans la liste."
                : "Could not locate \"\(query)\". Choose a suggestion from the dropdown."
        case let .noCyclingPathFound(lang):
            return lang == .fr
                ? "Aucun itinéraire cyclable trouvé entre ces lieux et points de passage."
                : "No cycling path found between those locations and via-points."
        case let .httpStatusError(statusCode, lang):
            return lang == .fr
                ? "Impossible de calculer l’itinéraire vélo pour le moment (code \(statusCode))."
                : "Could not calculate cycling directions right now (status \(statusCode))."
        case let .requestTimedOut(lang):
            return lang == .fr
                ? "Impossible de calculer l’itinéraire vélo pour le moment (délai dépassé)."
                : "Could not calculate cycling directions right now (request timed out)."
        case let .invalidResponse(detail):
            return detail
        }
    }
}

// MARK: - Private OSRM Wire DTOs

private struct OsrmRouteResponse: Decodable, Sendable {
    let routes: [OsrmApiRoute]?
}

private struct OsrmApiRoute: Decodable, Sendable {
    let distance: Double
    let duration: Double
    let geometry: OsrmApiGeometry
    let legs: [OsrmApiRouteLeg]?
}

private struct OsrmApiGeometry: Decodable, Sendable {
    let coordinates: [[Double]]
}

private struct OsrmApiRouteLeg: Decodable, Sendable {
    let distance: Double?
    let duration: Double?
    let steps: [OsrmRouteStep]?
}

/// Free bicycle routing actor using OSRM bike endpoints with failover, DEM elevation attachment,
/// loop calibration with geometric offline fallback, and GPX/corridor amenity splice/removal.
/// Mirrors `src/utils/routing.ts`.
public actor RoutingService {
    public static let osrmBikeEndpoints = [
        "https://routing.openstreetmap.de/routed-bike/route/v1/cycling",
        "https://router.project-osrm.org/route/v1/cycling",
    ]
    public static let osrmRouteTimeoutSeconds: TimeInterval = 8.0

    private let urlSession: URLSession
    private let osrmEndpoints: [String]
    private let locationService: any LocationGeocoding
    private let elevationService: any ElevationFetching
    private let store: CadenceStore?
    private let requestTimeoutSeconds: TimeInterval
    private let nowProvider: @Sendable () -> Date

    public init(
        urlSession: URLSession = .shared,
        osrmEndpoints: [String] = RoutingService.osrmBikeEndpoints,
        locationService: (any LocationGeocoding)? = nil,
        elevationService: (any ElevationFetching)? = nil,
        store: CadenceStore? = nil,
        requestTimeoutSeconds: TimeInterval = RoutingService.osrmRouteTimeoutSeconds,
        now: @escaping @Sendable () -> Date = Date.init
    ) {
        self.urlSession = urlSession
        self.osrmEndpoints = osrmEndpoints
        self.locationService = locationService ?? LocationSearchService(urlSession: urlSession)
        self.elevationService = elevationService ?? ElevationService(urlSession: urlSession)
        self.store = store
        self.requestTimeoutSeconds = requestTimeoutSeconds
        self.nowProvider = now
    }

    // MARK: - Pure Static Helpers

    public nonisolated static func offsetLatLng(
        lat: Double,
        lng: Double,
        distKm: Double,
        bearingDeg: Double
    ) -> LatLon {
        let earthRadiusKm = 6371.0
        let delta = distKm / earthRadiusKm
        let theta = JSCompat.toRad(bearingDeg)
        let lat1 = JSCompat.toRad(lat)
        let lng1 = JSCompat.toRad(lng)

        let lat2 = asin(
            sin(lat1) * cos(delta) + cos(lat1) * sin(delta) * cos(theta)
        )
        let lng2 = lng1 + atan2(
            sin(theta) * sin(delta) * cos(lat1),
            cos(delta) - sin(lat1) * sin(lat2)
        )

        return LatLon(
            JSCompat.jsToFixedNumber(JSCompat.toDeg(lat2), decimals: 6),
            JSCompat.jsToFixedNumber(JSCompat.toDeg(lng2), decimals: 6)
        )
    }

    public nonisolated static func togglePinnedAmenityOnTrip(
        _ trip: TripProfile,
        amenity: StageAmenity,
        now: Date = Date()
    ) -> (updatedTrip: TripProfile, isNowPinned: Bool) {
        let existingPinned = trip.pinnedAmenities ?? []
        let isCurrentlyPinned = existingPinned.contains(where: { $0.id == amenity.id })

        let updatedPinned: [StageAmenity]
        if isCurrentlyPinned {
            updatedPinned = existingPinned.filter { $0.id != amenity.id }
        } else {
            var pinnedCopy = amenity
            pinnedCopy.isPinned = true
            updatedPinned = (existingPinned + [pinnedCopy]).sorted { $0.routeKm < $1.routeKm }
        }

        var updatedStages = trip.stages
        if let stages = trip.stages, !stages.isEmpty {
            let activeIdx = max(0, min(trip.activeStageIndex ?? 0, stages.count - 1))
            updatedStages = stages.enumerated().map { idx, st in
                guard idx == activeIdx else { return st }
                var copy = st
                copy.pinnedAmenities = updatedPinned
                return copy
            }
        }

        var updatedTrip = trip
        updatedTrip.pinnedAmenities = updatedPinned
        updatedTrip.stages = updatedStages
        updatedTrip.updatedAt = Self.isoTimestamp(now)

        return (updatedTrip, !isCurrentlyPinned)
    }

    public nonisolated static func doesWaypointMatchAmenity(
        _ wp: RouteWaypoint,
        amenity: StageAmenity
    ) -> Bool {
        if wp.sourceAmenityId == amenity.id || wp.id == "wp-poi-\(amenity.id)" {
            return true
        }
        if let coords = wp.coordinates {
            return OverpassWaterGapEngine.haversineDistanceMeters(
                lat1: coords.lat,
                lon1: coords.lon,
                lat2: amenity.lat,
                lon2: amenity.lon
            ) < 40.0
        }
        return false
    }

    public nonisolated static func isAmenityInRoute(
        _ route: RouteParams?,
        amenity: StageAmenity
    ) -> Bool {
        guard let waypoints = route?.waypoints, !waypoints.isEmpty else {
            return false
        }
        return waypoints.contains { doesWaypointMatchAmenity($0, amenity: amenity) }
    }

    // MARK: - Auto Bike Route

    public func calculateAutoBikeRoute(
        originText: String,
        destText: String,
        originCoordsOverride: LatLon? = nil,
        destCoordsOverride: LatLon? = nil,
        waypoints: [RouteWaypointParam]? = nil,
        lang: CadenceLang = .fr
    ) async throws -> CalculatedBikeRoute {
        let originCoord: LatLon
        if let override = originCoordsOverride {
            originCoord = override
        } else if let geocoded = await locationService.geocodeLocation(originText, lang: lang, biasCoords: nil) {
            originCoord = geocoded
        } else {
            throw RoutingServiceError.originGeocodeFailed(query: originText, lang: lang)
        }

        var resolvedWaypoints: [ResolvedWaypoint] = []
        var prevCoord = originCoord
        let epochMs = Int64(nowProvider().timeIntervalSince1970 * 1000.0)

        if let waypoints, !waypoints.isEmpty {
            for (i, wp) in waypoints.enumerated() {
                let trimmedName = wp.name.trimmingCharacters(in: .whitespacesAndNewlines)
                if trimmedName.isEmpty && wp.coordinates == nil {
                    continue
                }

                let coord: LatLon
                if let wpCoord = wp.coordinates {
                    coord = wpCoord
                } else if !trimmedName.isEmpty,
                          let geocoded = await locationService.geocodeLocation(
                              trimmedName,
                              lang: lang,
                              biasCoords: prevCoord
                          ) {
                    coord = geocoded
                } else {
                    let label = trimmedName.isEmpty
                        ? (lang == .fr ? "Étape \(i + 1)" : "Stop \(i + 1)")
                        : trimmedName
                    throw RoutingServiceError.waypointGeocodeFailed(label: label, lang: lang)
                }

                let resolvedName = trimmedName.isEmpty
                    ? "\(JSCompat.jsFixed(coord.lat, decimals: 3))°N, \(JSCompat.jsFixed(coord.lon, decimals: 3))°E"
                    : trimmedName
                let wpId = (wp.id?.isEmpty == false) ? wp.id! : "wp-\(epochMs)-\(i)"
                resolvedWaypoints.append(ResolvedWaypoint(
                    id: wpId,
                    name: resolvedName,
                    coordinates: coord,
                    distanceFromStartKm: wp.distanceFromStartKm,
                    sourceAmenityId: wp.sourceAmenityId
                ))
                prevCoord = coord
            }
        }

        let destCoord: LatLon
        if let override = destCoordsOverride {
            destCoord = override
        } else if let geocoded = await locationService.geocodeLocation(destText, lang: lang, biasCoords: prevCoord) {
            destCoord = geocoded
        } else {
            throw RoutingServiceError.destinationGeocodeFailed(query: destText, lang: lang)
        }

        let allCoords: [LatLon] = [originCoord] + resolvedWaypoints.map(\.coordinates) + [destCoord]
        let coordsParam = allCoords
            .map { "\(Self.coordString($0.lon)),\(Self.coordString($0.lat))" }
            .joined(separator: ";")

        let response = try await fetchOsrmRouteWithFailover(coordsParam: coordsParam, lang: lang)
        guard let route = response.routes?.first else {
            throw RoutingServiceError.noCyclingPathFound(lang: lang)
        }

        let distanceKm = JSCompat.jsToFixedNumber(route.distance / 1000.0, decimals: 1)
        let estimatedMinutes = JSCompat.jsRoundInt(route.duration / 60.0)

        let coordinates: [LatLon] = route.geometry.coordinates.compactMap { pair in
            guard pair.count >= 2, pair[0].isFinite, pair[1].isFinite else { return nil }
            return LatLon(pair[1], pair[0])
        }

        var legs: [CalculatedBikeRouteLeg] = []
        var coreLegs: [OsrmRouteLeg] = []
        if let apiLegs = route.legs {
            var runningDistKm = 0.0
            for (i, leg) in apiLegs.enumerated() {
                let legDist = JSCompat.jsToFixedNumber((leg.distance ?? 0.0) / 1000.0, decimals: 1)
                let legMin = JSCompat.jsRoundInt((leg.duration ?? 0.0) / 60.0)
                legs.append(CalculatedBikeRouteLeg(distanceKm: legDist, estimatedMinutes: legMin))
                coreLegs.append(OsrmRouteLeg(steps: leg.steps))

                runningDistKm += legDist
                if i < resolvedWaypoints.count {
                    resolvedWaypoints[i].distanceFromStartKm = JSCompat.jsToFixedNumber(runningDistKm, decimals: 1)
                }
            }
        }

        let cueSheet = CueSheetEngine.parseOsrmRouteSteps(coreLegs)
        let dem = await elevationService.fetchDemElevationProfile(
            coordinates: coordinates,
            totalDistanceKm: distanceKm
        )

        return CalculatedBikeRoute(
            coordinates: coordinates,
            distanceKm: distanceKm,
            estimatedMinutes: estimatedMinutes,
            elevationGainM: dem.map { Double($0.elevationGainM) },
            elevationLossM: dem.map { Double($0.elevationLossM) },
            elevationProfile: dem?.elevationProfile,
            legs: legs,
            resolvedWaypoints: resolvedWaypoints,
            cueSheet: cueSheet
        )
    }

    // MARK: - Bike Loop Generator

    public func generateBikeLoopRoute(
        originText: String,
        targetDistanceKm: Double,
        originCoordsOverride: LatLon? = nil,
        shape: LoopShape = .loop,
        bearingDeg: Double = 45.0,
        lang: CadenceLang = .fr
    ) async throws -> GeneratedBikeLoopResult {
        let rawTarget = (targetDistanceKm.isFinite && targetDistanceKm != 0) ? targetDistanceKm : 50.0
        let safeTargetKm = max(4.0, min(300.0, rawTarget))

        let startCoord: LatLon
        if let override = originCoordsOverride {
            startCoord = override
        } else if let geocoded = await locationService.geocodeLocation(originText, lang: lang, biasCoords: nil) {
            startCoord = geocoded
        } else {
            throw RoutingServiceError.loopOriginGeocodeFailed(query: originText, lang: lang)
        }

        let initialRadiusKm = shape == .outAndBack
            ? safeTargetKm / (2.0 * 1.28)
            : safeTargetKm / (3.0 * 1.3)

        let label = originText.isEmpty ? "Start" : originText

        do {
            let firstWaypoints = Self.buildLoopWaypointsForRadius(
                startCoord: startCoord,
                radiusKm: max(1.0, initialRadiusKm),
                shape: shape,
                bearingDeg: bearingDeg
            )
            let firstRoute = try await calculateAutoBikeRoute(
                originText: label,
                destText: label,
                originCoordsOverride: startCoord,
                destCoordsOverride: startCoord,
                waypoints: firstWaypoints,
                lang: lang
            )

            guard firstRoute.coordinates.count >= 2 else {
                return Self.buildOfflineLoopFallback(
                    startCoord: startCoord,
                    targetDistanceKm: safeTargetKm,
                    shape: shape,
                    bearingDeg: bearingDeg
                )
            }

            var bestRoute = firstRoute
            let errorRatio = abs(firstRoute.distanceKm - safeTargetKm) / safeTargetKm

            if errorRatio > 0.18 && firstRoute.distanceKm > 1.0 {
                let scaledRadiusKm = max(
                    1.0,
                    min(120.0, initialRadiusKm * (safeTargetKm / firstRoute.distanceKm))
                )
                do {
                    let tunedWaypoints = Self.buildLoopWaypointsForRadius(
                        startCoord: startCoord,
                        radiusKm: scaledRadiusKm,
                        shape: shape,
                        bearingDeg: bearingDeg
                    )
                    let tunedRoute = try await calculateAutoBikeRoute(
                        originText: label,
                        destText: label,
                        originCoordsOverride: startCoord,
                        destCoordsOverride: startCoord,
                        waypoints: tunedWaypoints,
                        lang: lang
                    )
                    if tunedRoute.coordinates.count >= 2 &&
                        abs(tunedRoute.distanceKm - safeTargetKm) < abs(firstRoute.distanceKm - safeTargetKm) {
                        bestRoute = tunedRoute
                    }
                } catch {
                    // Keep first valid OSRM loop if calibration fails
                }
            }

            return GeneratedBikeLoopResult(
                route: bestRoute,
                originCoordinates: startCoord,
                usedOfflineFallback: false,
                shape: shape
            )
        } catch {
            return Self.buildOfflineLoopFallback(
                startCoord: startCoord,
                targetDistanceKm: safeTargetKm,
                shape: shape,
                bearingDeg: bearingDeg
            )
        }
    }

    // MARK: - Amenity Rerouting & Removal

    public func rerouteTripThroughAmenity(
        trip: TripProfile,
        amenity: StageAmenity,
        currentAmenities: [StageAmenity] = [],
        lang: CadenceLang = .fr
    ) async -> RerouteAmenityResult {
        let oldDistanceKm = trip.route.distanceKm.isFinite ? trip.route.distanceKm : 0.0
        let currentCoords = Self.resolveCurrentCoords(trip: trip, amenity: amenity)
        let sortedWaypoints = Self.buildSortedWaypointsWithAmenity(
            existingWaypoints: trip.route.waypoints,
            amenity: amenity,
            coords: currentCoords
        )

        var nextCoords = currentCoords
        var nextDistanceKm = oldDistanceKm
        var nextWaypoints = sortedWaypoints
        var nextCueSheet = trip.route.cueSheet
        var nextRouteMode = trip.route.routeMode
        var nextRadiusMeters = trip.route.radiusMeters
        var usedOfflineFallback = false
        var nextElevationGainM: Double?
        var nextElevationLossM: Double?
        var nextElevationProfile: [ElevationProfilePoint]?

        let isCustomGpx = trip.route.routeMode == "gpx" && currentCoords.count >= 10

        if isCustomGpx {
            let (cumDistances, entryIdx, exitIdx) = Self.resolveGpxSpliceBounds(
                currentCoords: currentCoords,
                amenity: amenity
            )
            if let segmentRes = await fetchOsrmSegment(
                points: [
                    currentCoords[entryIdx],
                    LatLon(amenity.lat, amenity.lon),
                    currentCoords[exitIdx],
                ],
                lang: lang
            ), segmentRes.coordinates.count >= 2 {
                let oldSubMeters = max(0.0, cumDistances[exitIdx] - cumDistances[entryIdx])
                let deltaKm = (segmentRes.distanceMeters - oldSubMeters) / 1000.0
                nextCoords = Array(currentCoords[0..<entryIdx])
                    + segmentRes.coordinates
                    + Array(currentCoords[(exitIdx + 1)...])
                nextDistanceKm = max(1.0, JSCompat.jsToFixedNumber(oldDistanceKm + deltaKm, decimals: 1))
                nextCueSheet = nil
            } else {
                usedOfflineFallback = true
                let spliced = Self.spliceCoordinateFallback(
                    currentCoords: currentCoords,
                    amenity: amenity,
                    oldDistanceKm: oldDistanceKm
                )
                nextCoords = spliced.coordinates
                nextDistanceKm = spliced.distanceKm
                nextCueSheet = nil
            }
        } else {
            let originCoord = trip.route.originCoords ?? currentCoords[0]
            let destCoord = trip.route.destCoords
                ?? (currentCoords.count >= 2 ? currentCoords[currentCoords.count - 1] : originCoord)
            let waypointParams = sortedWaypoints.map { RouteWaypointParam(from: $0) }

            do {
                let routed = try await calculateAutoBikeRoute(
                    originText: trip.route.origin ?? "Start",
                    destText: trip.route.destination ?? "Finish",
                    originCoordsOverride: originCoord,
                    destCoordsOverride: destCoord,
                    waypoints: waypointParams,
                    lang: lang
                )
                if routed.coordinates.count >= 2 {
                    nextCoords = routed.coordinates
                    nextDistanceKm = routed.distanceKm
                    nextElevationGainM = routed.elevationGainM
                    nextElevationLossM = routed.elevationLossM
                    nextElevationProfile = routed.elevationProfile
                    if let resolved = routed.resolvedWaypoints {
                        nextWaypoints = resolved.map { $0.toRouteWaypoint() }
                    } else {
                        nextWaypoints = sortedWaypoints
                    }
                    nextCueSheet = routed.cueSheet
                    if nextRouteMode == "manual-radius" {
                        nextRouteMode = "corridor"
                        nextRadiusMeters = nil
                    }
                } else {
                    throw RoutingServiceError.invalidResponse("Empty OSRM route")
                }
            } catch {
                usedOfflineFallback = true
                let spliced = Self.spliceCoordinateFallback(
                    currentCoords: currentCoords,
                    amenity: amenity,
                    oldDistanceKm: oldDistanceKm
                )
                nextCoords = spliced.coordinates
                nextDistanceKm = spliced.distanceKm
                nextCueSheet = nil
            }
        }

        var basePinned = trip.pinnedAmenities ?? []
        if !basePinned.contains(where: { $0.id == amenity.id }) {
            var pinnedCopy = amenity
            pinnedCopy.isPinned = true
            basePinned.append(pinnedCopy)
        }

        return await finalizeAmenityRouteUpdate(
            trip: trip,
            currentAmenities: currentAmenities,
            updatedPinnedInput: basePinned,
            nextCoords: nextCoords,
            nextDistanceKm: nextDistanceKm,
            nextElevationGainM: nextElevationGainM,
            nextElevationLossM: nextElevationLossM,
            nextElevationProfile: nextElevationProfile,
            nextWaypoints: nextWaypoints,
            nextCueSheet: nextCueSheet,
            nextRouteMode: nextRouteMode,
            nextRadiusMeters: nextRadiusMeters,
            actualDetourKm: max(0.0, JSCompat.jsToFixedNumber(nextDistanceKm - oldDistanceKm, decimals: 1)),
            usedOfflineFallback: usedOfflineFallback
        )
    }

    public func removeAmenityFromRoute(
        trip: TripProfile,
        amenity: StageAmenity,
        currentAmenities: [StageAmenity] = [],
        unpin: Bool = false,
        lang: CadenceLang = .fr
    ) async -> RerouteAmenityResult {
        let oldDistanceKm = trip.route.distanceKm.isFinite ? trip.route.distanceKm : 0.0
        let remainingWaypoints = (trip.route.waypoints ?? []).filter {
            !Self.doesWaypointMatchAmenity($0, amenity: amenity)
        }
        let currentCoords = Self.resolveCurrentCoords(trip: trip, amenity: amenity)

        var nextCoords = currentCoords
        var nextDistanceKm = oldDistanceKm
        var nextWaypoints = remainingWaypoints
        var nextCueSheet = trip.route.cueSheet
        let nextRouteMode = trip.route.routeMode
        let nextRadiusMeters = trip.route.radiusMeters
        var usedOfflineFallback = false
        var nextElevationGainM: Double?
        var nextElevationLossM: Double?
        var nextElevationProfile: [ElevationProfilePoint]?

        let isCustomGpx = trip.route.routeMode == "gpx" && currentCoords.count >= 10

        if isCustomGpx {
            let (cumDistances, entryIdx, exitIdx) = Self.resolveGpxSpliceBounds(
                currentCoords: currentCoords,
                amenity: amenity
            )
            if let segmentRes = await fetchOsrmSegment(
                points: [currentCoords[entryIdx], currentCoords[exitIdx]],
                lang: lang
            ), segmentRes.coordinates.count >= 2 {
                let oldSubMeters = max(0.0, cumDistances[exitIdx] - cumDistances[entryIdx])
                let deltaKm = (oldSubMeters - segmentRes.distanceMeters) / 1000.0
                nextCoords = Array(currentCoords[0..<entryIdx])
                    + segmentRes.coordinates
                    + Array(currentCoords[(exitIdx + 1)...])
                nextDistanceKm = max(1.0, JSCompat.jsToFixedNumber(oldDistanceKm - deltaKm, decimals: 1))
                nextCueSheet = nil
            } else {
                usedOfflineFallback = true
                let stripped = Self.removeAmenityCoordinateFallback(
                    currentCoords: currentCoords,
                    amenity: amenity,
                    oldDistanceKm: oldDistanceKm
                )
                nextCoords = stripped.coordinates
                nextDistanceKm = stripped.distanceKm
                nextCueSheet = nil
            }
        } else {
            let originCoord = trip.route.originCoords ?? currentCoords[0]
            let destCoord = trip.route.destCoords
                ?? (currentCoords.count >= 2 ? currentCoords[currentCoords.count - 1] : originCoord)
            let waypointParams = remainingWaypoints.map { RouteWaypointParam(from: $0) }

            do {
                let routed = try await calculateAutoBikeRoute(
                    originText: trip.route.origin ?? "Start",
                    destText: trip.route.destination ?? "Finish",
                    originCoordsOverride: originCoord,
                    destCoordsOverride: destCoord,
                    waypoints: waypointParams,
                    lang: lang
                )
                if routed.coordinates.count >= 2 {
                    nextCoords = routed.coordinates
                    nextDistanceKm = routed.distanceKm
                    nextElevationGainM = routed.elevationGainM
                    nextElevationLossM = routed.elevationLossM
                    nextElevationProfile = routed.elevationProfile
                    if remainingWaypoints.isEmpty {
                        nextWaypoints = []
                    } else if let resolved = routed.resolvedWaypoints {
                        nextWaypoints = resolved.map { $0.toRouteWaypoint() }
                    } else {
                        nextWaypoints = remainingWaypoints
                    }
                    nextCueSheet = routed.cueSheet
                } else {
                    throw RoutingServiceError.invalidResponse("Empty OSRM route")
                }
            } catch {
                usedOfflineFallback = true
                let stripped = Self.removeAmenityCoordinateFallback(
                    currentCoords: currentCoords,
                    amenity: amenity,
                    oldDistanceKm: oldDistanceKm
                )
                nextCoords = stripped.coordinates
                nextDistanceKm = stripped.distanceKm
                nextCueSheet = nil
            }
        }

        let basePinned = trip.pinnedAmenities ?? []
        let nextPinnedInput = unpin
            ? basePinned.filter { $0.id != amenity.id }
            : basePinned

        return await finalizeAmenityRouteUpdate(
            trip: trip,
            currentAmenities: currentAmenities,
            updatedPinnedInput: nextPinnedInput,
            nextCoords: nextCoords,
            nextDistanceKm: nextDistanceKm,
            nextElevationGainM: nextElevationGainM,
            nextElevationLossM: nextElevationLossM,
            nextElevationProfile: nextElevationProfile,
            nextWaypoints: nextWaypoints,
            nextCueSheet: nextCueSheet,
            nextRouteMode: nextRouteMode,
            nextRadiusMeters: nextRadiusMeters,
            actualDetourKm: max(0.0, JSCompat.jsToFixedNumber(oldDistanceKm - nextDistanceKm, decimals: 1)),
            usedOfflineFallback: usedOfflineFallback
        )
    }

    // MARK: - Private OSRM Fetch & Route Mutation Helpers

    private func fetchOsrmRouteWithFailover(
        coordsParam: String,
        lang: CadenceLang
    ) async throws -> OsrmRouteResponse {
        var lastStatus: Int? = nil
        var lastError: Error? = nil
        var hadEmptyRoutesResponse = false

        for endpoint in osrmEndpoints {
            let urlString = "\(endpoint)/\(coordsParam)?overview=full&geometries=geojson&steps=true"
            guard let url = URL(string: urlString) else { continue }
            var request = URLRequest(url: url, timeoutInterval: max(0.1, requestTimeoutSeconds))
            request.httpMethod = "GET"

            do {
                let (data, response) = try await urlSession.data(for: request)
                guard let http = response as? HTTPURLResponse else {
                    lastError = RoutingServiceError.invalidResponse("Missing HTTP response")
                    continue
                }
                guard (200...299).contains(http.statusCode) else {
                    lastStatus = http.statusCode
                    continue
                }
                let decoded = try JSONDecoder().decode(OsrmRouteResponse.self, from: data)
                if let routes = decoded.routes, !routes.isEmpty {
                    return decoded
                }
                hadEmptyRoutesResponse = true
            } catch is CancellationError {
                throw CancellationError()
            } catch {
                lastError = error
            }
        }

        if hadEmptyRoutesResponse {
            throw RoutingServiceError.noCyclingPathFound(lang: lang)
        }
        if let lastStatus {
            throw RoutingServiceError.httpStatusError(statusCode: lastStatus, lang: lang)
        }
        if let lastError {
            if let urlErr = lastError as? URLError, urlErr.code == .timedOut {
                throw RoutingServiceError.requestTimedOut(lang: lang)
            }
            throw lastError
        }
        throw RoutingServiceError.requestTimedOut(lang: lang)
    }

    private func fetchOsrmSegment(
        points: [LatLon],
        lang: CadenceLang
    ) async -> (coordinates: [LatLon], distanceMeters: Double, cueSheet: [RouteCueStep])? {
        let coordsParam = points
            .map { "\(Self.coordString($0.lon)),\(Self.coordString($0.lat))" }
            .joined(separator: ";")
        do {
            let response = try await fetchOsrmRouteWithFailover(coordsParam: coordsParam, lang: lang)
            guard let route = response.routes?.first else { return nil }
            let coords: [LatLon] = route.geometry.coordinates.compactMap { pair in
                guard pair.count >= 2, pair[0].isFinite, pair[1].isFinite else { return nil }
                return LatLon(pair[1], pair[0])
            }
            guard !coords.isEmpty else { return nil }
            let coreLegs = (route.legs ?? []).map { OsrmRouteLeg(steps: $0.steps) }
            return (
                coordinates: coords,
                distanceMeters: route.distance,
                cueSheet: CueSheetEngine.parseOsrmRouteSteps(coreLegs)
            )
        } catch {
            return nil
        }
    }

    private func finalizeAmenityRouteUpdate(
        trip: TripProfile,
        currentAmenities: [StageAmenity],
        updatedPinnedInput: [StageAmenity],
        nextCoords: [LatLon],
        nextDistanceKm: Double,
        nextElevationGainM: Double?,
        nextElevationLossM: Double?,
        nextElevationProfile: [ElevationProfilePoint]?,
        nextWaypoints: [RouteWaypoint],
        nextCueSheet: [RouteCueStep]?,
        nextRouteMode: String?,
        nextRadiusMeters: Double?,
        actualDetourKm: Double,
        usedOfflineFallback: Bool
    ) async -> RerouteAmenityResult {
        let oldDistanceKm = trip.route.distanceKm.isFinite ? trip.route.distanceKm : 0.0
        let oldElev = trip.route.elevationGainM ?? JSCompat.jsRound(oldDistanceKm * 6.5)
        let nextElevGain: Double
        if let nextElevationGainM {
            nextElevGain = nextElevationGainM
        } else if oldDistanceKm > 0 {
            nextElevGain = max(0.0, JSCompat.jsRound(oldElev * (nextDistanceKm / oldDistanceKm)))
        } else {
            nextElevGain = oldElev
        }

        let resolvedElevationProfile = nextElevationProfile

        let pinnedInput = updatedPinnedInput.map { item -> StageAmenity in
            var copy = item
            copy.isPinned = true
            return copy
        }
        let updatedPinned = OverpassWaterGapEngine.resnapAmenitiesToRoute(
            pinnedInput,
            coordinates: nextCoords,
            elevationProfile: resolvedElevationProfile ?? trip.route.elevationProfile
        )

        let finalCumDistances = nextCoords.count >= 2
            ? OverpassWaterGapEngine.computeCumulativeDistances(nextCoords)
            : []
        let finalWaypoints: [RouteWaypoint] = nextWaypoints.map { wp in
            guard let coords = wp.coordinates, nextCoords.count >= 2 else { return wp }
            let snapped = OverpassWaterGapEngine.snapToPolyline(
                lat: coords.lat,
                lon: coords.lon,
                coordinates: nextCoords,
                cumDistancesMeters: finalCumDistances
            )
            var copy = wp
            copy.distanceFromStartKm = snapped.routeKm
            return copy
        }

        var nextRoute = trip.route
        nextRoute.routeMode = nextRouteMode
        nextRoute.radiusMeters = nextRadiusMeters
        nextRoute.distanceKm = nextDistanceKm
        nextRoute.elevationGainM = nextElevGain
        nextRoute.elevationLossM = nextElevationLossM ?? trip.route.elevationLossM
        nextRoute.coordinates = nextCoords
        nextRoute.waypoints = finalWaypoints
        nextRoute.cueSheet = nextCueSheet
        nextRoute.elevationProfile = resolvedElevationProfile
        nextRoute.terrainSummary = resolvedElevationProfile != nil ? nil : trip.route.terrainSummary

        var updatedStages = trip.stages
        var activeStageId = trip.id
        if let stages = trip.stages, !stages.isEmpty {
            let activeIdx = max(0, min(trip.activeStageIndex ?? 0, stages.count - 1))
            activeStageId = stages[activeIdx].id
            let downsampled = StageManagerEngine.downsampleCoordinates(nextCoords)
            updatedStages = stages.enumerated().map { idx, st in
                guard idx == activeIdx else { return st }
                var stageCopy = st
                var stageRoute = nextRoute
                stageRoute.coordinates = downsampled
                stageRoute.waypoints = finalWaypoints
                stageCopy.route = stageRoute
                stageCopy.pinnedAmenities = updatedPinned
                return stageCopy
            }
        }

        var mergedAmenities = currentAmenities
        for pinned in updatedPinned where !mergedAmenities.contains(where: { $0.id == pinned.id }) {
            mergedAmenities.append(pinned)
        }
        let resnappedAmenities = OverpassWaterGapEngine.resnapAmenitiesToRoute(
            mergedAmenities,
            coordinates: nextCoords,
            elevationProfile: resolvedElevationProfile ?? trip.route.elevationProfile
        )

        let newCacheKey = RouteCacheKey.routeHashKey(
            coordinates: nextCoords,
            stageId: activeStageId,
            totalDistanceKm: nextDistanceKm
        )
        let nowDate = nowProvider()
        if let store {
            try? await store.saveCachedCorridorScan(
                cacheKey: newCacheKey,
                stageId: activeStageId,
                distanceKm: nextDistanceKm,
                amenities: resnappedAmenities,
                now: nowDate
            )
        }

        var updatedTrip = trip
        updatedTrip.route = nextRoute
        updatedTrip.pinnedAmenities = updatedPinned
        updatedTrip.stages = updatedStages
        updatedTrip.updatedAt = Self.isoTimestamp(nowDate)

        return RerouteAmenityResult(
            updatedTrip: updatedTrip,
            updatedAmenities: resnappedAmenities,
            actualDetourKm: actualDetourKm,
            usedOfflineFallback: usedOfflineFallback
        )
    }

    private nonisolated static func resolveCurrentCoords(
        trip: TripProfile,
        amenity: StageAmenity
    ) -> [LatLon] {
        if let coords = trip.route.coordinates, coords.count >= 2 {
            return coords
        }
        if let origin = trip.route.originCoords {
            return [origin, origin]
        }
        let fallback = LatLon(amenity.lat, amenity.lon)
        return [fallback, fallback]
    }

    private nonisolated static func buildSortedWaypointsWithAmenity(
        existingWaypoints: [RouteWaypoint]?,
        amenity: StageAmenity,
        coords: [LatLon]
    ) -> [RouteWaypoint] {
        let cumDistances = coords.count >= 2
            ? OverpassWaterGapEngine.computeCumulativeDistances(coords)
            : []
        let normalized: [RouteWaypoint] = (existingWaypoints ?? []).map { wp in
            if wp.distanceFromStartKm != nil {
                return wp
            }
            var copy = wp
            if let wpCoords = wp.coordinates, coords.count >= 2 {
                let snapped = OverpassWaterGapEngine.snapToPolyline(
                    lat: wpCoords.lat,
                    lon: wpCoords.lon,
                    coordinates: coords,
                    cumDistancesMeters: cumDistances
                )
                copy.distanceFromStartKm = snapped.routeKm
            } else {
                copy.distanceFromStartKm = 0
            }
            return copy
        }

        let newWp = RouteWaypoint(
            id: "wp-poi-\(amenity.id)",
            name: amenity.name,
            coordinates: LatLon(amenity.lat, amenity.lon),
            distanceFromStartKm: amenity.routeKm,
            sourceAmenityId: amenity.id
        )

        return (normalized + [newWp]).sorted {
            ($0.distanceFromStartKm ?? 0) < ($1.distanceFromStartKm ?? 0)
        }
    }

    private nonisolated static func spliceCoordinateFallback(
        currentCoords: [LatLon],
        amenity: StageAmenity,
        oldDistanceKm: Double
    ) -> (coordinates: [LatLon], distanceKm: Double) {
        let cumDistances = OverpassWaterGapEngine.computeCumulativeDistances(currentCoords)
        let snapped = OverpassWaterGapEngine.snapToPolyline(
            lat: amenity.lat,
            lon: amenity.lon,
            coordinates: currentCoords,
            cumDistancesMeters: cumDistances
        )
        let insertAt = min(currentCoords.count - 1, max(1, snapped.nearestIdx))
        let pBefore = currentCoords[insertAt - 1]
        let pAfter = currentCoords[insertAt]
        let prevSeg = OverpassWaterGapEngine.haversineDistanceMeters(
            lat1: pBefore.lat,
            lon1: pBefore.lon,
            lat2: pAfter.lat,
            lon2: pAfter.lon
        )
        let newSeg = OverpassWaterGapEngine.haversineDistanceMeters(
            lat1: pBefore.lat,
            lon1: pBefore.lon,
            lat2: amenity.lat,
            lon2: amenity.lon
        ) + OverpassWaterGapEngine.haversineDistanceMeters(
            lat1: amenity.lat,
            lon1: amenity.lon,
            lat2: pAfter.lat,
            lon2: pAfter.lon
        )
        let deltaKm = (newSeg - prevSeg) / 1000.0
        let coords = Array(currentCoords[0..<insertAt])
            + [LatLon(amenity.lat, amenity.lon)]
            + Array(currentCoords[insertAt...])
        return (
            coordinates: coords,
            distanceKm: max(1.0, JSCompat.jsToFixedNumber(oldDistanceKm + deltaKm, decimals: 1))
        )
    }

    private nonisolated static func removeAmenityCoordinateFallback(
        currentCoords: [LatLon],
        amenity: StageAmenity,
        oldDistanceKm: Double
    ) -> (coordinates: [LatLon], distanceKm: Double) {
        if currentCoords.count <= 2 {
            let estDetourKm = CueSheetEngine.estimateAmenityDetourKm(amenity.detourMeters)
            return (
                coordinates: currentCoords,
                distanceKm: max(1.0, JSCompat.jsToFixedNumber(oldDistanceKm - estDetourKm, decimals: 1))
            )
        }

        let filtered = currentCoords.enumerated().compactMap { idx, pt -> LatLon? in
            if idx == 0 || idx == currentCoords.count - 1 { return pt }
            let d = OverpassWaterGapEngine.haversineDistanceMeters(
                lat1: pt.lat,
                lon1: pt.lon,
                lat2: amenity.lat,
                lon2: amenity.lon
            )
            return d > 120.0 ? pt : nil
        }

        if filtered.count < currentCoords.count && filtered.count >= 2 {
            let prevTotalMeters = OverpassWaterGapEngine.computeCumulativeDistances(currentCoords).last
                ?? (oldDistanceKm * 1000.0)
            let nextTotalMeters = OverpassWaterGapEngine.computeCumulativeDistances(filtered).last
                ?? (oldDistanceKm * 1000.0)
            let deltaKm = max(0.0, (prevTotalMeters - nextTotalMeters) / 1000.0)
            return (
                coordinates: filtered,
                distanceKm: max(1.0, JSCompat.jsToFixedNumber(oldDistanceKm - deltaKm, decimals: 1))
            )
        }

        let estDetourKm = CueSheetEngine.estimateAmenityDetourKm(amenity.detourMeters)
        return (
            coordinates: currentCoords,
            distanceKm: max(1.0, JSCompat.jsToFixedNumber(oldDistanceKm - estDetourKm, decimals: 1))
        )
    }

    private nonisolated static func resolveGpxSpliceBounds(
        currentCoords: [LatLon],
        amenity: StageAmenity
    ) -> (cumDistances: [Double], entryIdx: Int, exitIdx: Int) {
        let cumDistances = OverpassWaterGapEngine.computeCumulativeDistances(currentCoords)
        let snapped = OverpassWaterGapEngine.snapToPolyline(
            lat: amenity.lat,
            lon: amenity.lon,
            coordinates: currentCoords,
            cumDistancesMeters: cumDistances
        )
        let snapMeters = snapped.nearestIdx < cumDistances.count ? cumDistances[snapped.nearestIdx] : 0.0

        var entryIdx = snapped.nearestIdx
        while entryIdx > 0 && snapMeters - cumDistances[entryIdx] < 1400.0 {
            entryIdx -= 1
        }
        var exitIdx = snapped.nearestIdx
        while exitIdx < currentCoords.count - 1 && cumDistances[exitIdx] - snapMeters < 1400.0 {
            exitIdx += 1
        }
        return (cumDistances, entryIdx, exitIdx)
    }

    private nonisolated static func buildLoopWaypointsForRadius(
        startCoord: LatLon,
        radiusKm: Double,
        shape: LoopShape,
        bearingDeg: Double
    ) -> [RouteWaypointParam] {
        if shape == .outAndBack {
            let turnCoord = offsetLatLng(
                lat: startCoord.lat,
                lng: startCoord.lon,
                distKm: radiusKm,
                bearingDeg: bearingDeg
            )
            return [
                RouteWaypointParam(
                    id: "loop-turnaround",
                    name: "Turnaround",
                    coordinates: turnCoord
                ),
            ]
        }

        let wp1 = offsetLatLng(
            lat: startCoord.lat,
            lng: startCoord.lon,
            distKm: radiusKm,
            bearingDeg: JSCompat.posMod(bearingDeg - 30.0, 360.0)
        )
        let wp2 = offsetLatLng(
            lat: startCoord.lat,
            lng: startCoord.lon,
            distKm: radiusKm,
            bearingDeg: JSCompat.posMod(bearingDeg + 30.0, 360.0)
        )
        return [
            RouteWaypointParam(id: "loop-wp-1", name: "Loop Sector 1", coordinates: wp1),
            RouteWaypointParam(id: "loop-wp-2", name: "Loop Sector 2", coordinates: wp2),
        ]
    }

    private nonisolated static func buildOfflineLoopFallback(
        startCoord: LatLon,
        targetDistanceKm: Double,
        shape: LoopShape,
        bearingDeg: Double
    ) -> GeneratedBikeLoopResult {
        let safeDist = max(4.0, targetDistanceKm)
        var coordinates: [LatLon] = [startCoord]

        if shape == .outAndBack {
            let halfKm = safeDist / 2.0
            let steps = 10
            for i in 1...steps {
                coordinates.append(offsetLatLng(
                    lat: startCoord.lat,
                    lng: startCoord.lon,
                    distKm: (halfKm * Double(i)) / Double(steps),
                    bearingDeg: bearingDeg
                ))
            }
            for i in stride(from: steps - 1, through: 0, by: -1) {
                coordinates.append(offsetLatLng(
                    lat: startCoord.lat,
                    lng: startCoord.lon,
                    distKm: (halfKm * Double(i)) / Double(steps),
                    bearingDeg: bearingDeg
                ))
            }
        } else {
            let circleRadiusKm = safeDist / (2.0 * .pi)
            let center = offsetLatLng(
                lat: startCoord.lat,
                lng: startCoord.lon,
                distKm: circleRadiusKm,
                bearingDeg: bearingDeg
            )
            let startAngleFromCenter = JSCompat.posMod(bearingDeg + 180.0, 360.0)
            let segments = 32
            for i in 1...segments {
                let angle = JSCompat.posMod(startAngleFromCenter + (360.0 * Double(i)) / Double(segments), 360.0)
                coordinates.append(offsetLatLng(
                    lat: center.lat,
                    lng: center.lon,
                    distKm: circleRadiusKm,
                    bearingDeg: angle
                ))
            }
        }

        let route = CalculatedBikeRoute(
            coordinates: coordinates,
            distanceKm: JSCompat.jsToFixedNumber(safeDist, decimals: 1),
            estimatedMinutes: max(15, JSCompat.jsRoundInt((safeDist / 21.0) * 60.0))
        )

        return GeneratedBikeLoopResult(
            route: route,
            originCoordinates: startCoord,
            usedOfflineFallback: true,
            shape: shape
        )
    }

    private nonisolated static func coordString(_ value: Double) -> String {
        guard value.isFinite else { return "0" }
        if value == 0 { return "0" }
        if value.truncatingRemainder(dividingBy: 1) == 0, abs(value) < Double(Int64.max) {
            return String(Int64(value))
        }
        return String(value)
    }

    private nonisolated static func isoTimestamp(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: date)
    }
}
