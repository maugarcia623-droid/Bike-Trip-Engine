import Foundation

public struct SolvedTripTimeline: Codable, Sendable, Equatable {
    public var departureTimeHHMM: String
    public var arrivalTimeHHMM: String
    public var totalTransitMin: Int
    public var movingMin: Int
    public var dwellMin: Int
    public var preRideWindow: String
    public var preRideMealTimeHHMM: String
    public var postRideImmediateWindow: String?
    public var postRideMealWindow: String?
    public var postRideConsolidatedWindow: String?
    public var resolvedDepartureMin: Int
    public var resolvedArrivalMin: Int

    public init(
        departureTimeHHMM: String,
        arrivalTimeHHMM: String,
        totalTransitMin: Int,
        movingMin: Int,
        dwellMin: Int,
        preRideWindow: String,
        preRideMealTimeHHMM: String,
        postRideImmediateWindow: String? = nil,
        postRideMealWindow: String? = nil,
        postRideConsolidatedWindow: String? = nil,
        resolvedDepartureMin: Int,
        resolvedArrivalMin: Int
    ) {
        self.departureTimeHHMM = departureTimeHHMM
        self.arrivalTimeHHMM = arrivalTimeHHMM
        self.totalTransitMin = totalTransitMin
        self.movingMin = movingMin
        self.dwellMin = dwellMin
        self.preRideWindow = preRideWindow
        self.preRideMealTimeHHMM = preRideMealTimeHHMM
        self.postRideImmediateWindow = postRideImmediateWindow
        self.postRideMealWindow = postRideMealWindow
        self.postRideConsolidatedWindow = postRideConsolidatedWindow
        self.resolvedDepartureMin = resolvedDepartureMin
        self.resolvedArrivalMin = resolvedArrivalMin
    }
}

public struct TimelineStep: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var time: String
    public var formattedDuration: String?
    public var title: String
    public var location: String
    public var category: String // "prep" | "nutrition" | "ride" | "transit" | "office"
    public var isCrucialCheckpoint: Bool
    public var description: String
    public var iconName: String

    public init(
        id: String,
        time: String,
        formattedDuration: String? = nil,
        title: String,
        location: String,
        category: String,
        isCrucialCheckpoint: Bool,
        description: String,
        iconName: String
    ) {
        self.id = id
        self.time = time
        self.formattedDuration = formattedDuration
        self.title = title
        self.location = location
        self.category = category
        self.isCrucialCheckpoint = isCrucialCheckpoint
        self.description = description
        self.iconName = iconName
    }
}

public struct ReverseTimelineCalculation: Codable, Sendable, Equatable {
    public var shiftStartTime: String
    public var gateArrivalTime: String
    public var hardDepartureTime: String
    public var preRideMealTime: String
    public var wakeUpTime: String
    public var totalDoorToDeskMinutes: Int
    public var pureMovingMinutes: Int
    public var bufferMinutes: Int
    public var steps: [TimelineStep]
    public var weatherHeadwindImpactMinutes: Int
    public var severeHeadwindWarning: Bool
    public var stationaryRecoveryRule: StationaryRecoveryRule?

    public init(
        shiftStartTime: String,
        gateArrivalTime: String,
        hardDepartureTime: String,
        preRideMealTime: String,
        wakeUpTime: String,
        totalDoorToDeskMinutes: Int,
        pureMovingMinutes: Int,
        bufferMinutes: Int,
        steps: [TimelineStep],
        weatherHeadwindImpactMinutes: Int,
        severeHeadwindWarning: Bool,
        stationaryRecoveryRule: StationaryRecoveryRule? = nil
    ) {
        self.shiftStartTime = shiftStartTime
        self.gateArrivalTime = gateArrivalTime
        self.hardDepartureTime = hardDepartureTime
        self.preRideMealTime = preRideMealTime
        self.wakeUpTime = wakeUpTime
        self.totalDoorToDeskMinutes = totalDoorToDeskMinutes
        self.pureMovingMinutes = pureMovingMinutes
        self.bufferMinutes = bufferMinutes
        self.steps = steps
        self.weatherHeadwindImpactMinutes = weatherHeadwindImpactMinutes
        self.severeHeadwindWarning = severeHeadwindWarning
        self.stationaryRecoveryRule = stationaryRecoveryRule
    }
}

public struct ReverseTimelinePhysicsOverride: Sendable {
    public var effectiveSpeedKmH: Double
    public var calmSpeedKmH: Double
    public var arriveAtMode: Bool?
    public var departureTime: String?
    public var movingTimeSeconds: Double?
    public var logistics: LogisticsSettings?
    public var savoryResetCount: Int?
    public var pinnedAmenities: [StageAmenity]?
    public var departureDate: String?
    public var isMultiDayTour: Bool?

    public init(
        effectiveSpeedKmH: Double,
        calmSpeedKmH: Double,
        arriveAtMode: Bool? = nil,
        departureTime: String? = nil,
        movingTimeSeconds: Double? = nil,
        logistics: LogisticsSettings? = nil,
        savoryResetCount: Int? = nil,
        pinnedAmenities: [StageAmenity]? = nil,
        departureDate: String? = nil,
        isMultiDayTour: Bool? = nil
    ) {
        self.effectiveSpeedKmH = effectiveSpeedKmH
        self.calmSpeedKmH = calmSpeedKmH
        self.arriveAtMode = arriveAtMode
        self.departureTime = departureTime
        self.movingTimeSeconds = movingTimeSeconds
        self.logistics = logistics
        self.savoryResetCount = savoryResetCount
        self.pinnedAmenities = pinnedAmenities
        self.departureDate = departureDate
        self.isMultiDayTour = isMultiDayTour
    }
}

public enum TimelineEngine {
    public static func subtractMinutesFromTime(_ timeStr: String, _ minutesToSub: Int) -> String {
        let parts = timeStr.split(separator: ":").compactMap { Int($0) }
        let h = parts.count > 0 ? parts[0] : 0
        let m = parts.count > 1 ? parts[1] : 0
        let totalMin = JSCompat.posMod(h * 60 + m - minutesToSub, 1440)
        let newH = (totalMin / 60) % 24
        let newM = totalMin % 60
        return String(format: "%02d:%02d", newH, newM)
    }

    public static func addMinutesToTime(_ timeStr: String, _ minutesToAdd: Int) -> String {
        let parts = timeStr.split(separator: ":").compactMap { Int($0) }
        let h = parts.count > 0 ? parts[0] : 0
        let m = parts.count > 1 ? parts[1] : 0
        let totalMin = JSCompat.posMod(h * 60 + m + minutesToAdd, 1440)
        let newH = (totalMin / 60) % 24
        let newM = totalMin % 60
        return String(format: "%02d:%02d", newH, newM)
    }

    public static func parseHHMM(_ timeStr: String) -> Int {
        guard !timeStr.isEmpty, timeStr.contains(":") else {
            return 8 * 60 + 30
        }
        let parts = timeStr.split(separator: ":")
        let h = parts.count > 0 ? Int(parts[0]) : nil
        let m = parts.count > 1 ? Int(parts[1]) : nil
        let validH = h.map { max(0, min(23, $0)) } ?? 8
        let validM = m.map { max(0, min(59, $0)) } ?? 30
        return validH * 60 + validM
    }

    public static func formatHHMM(_ totalMinutes: Double) -> String {
        let rounded = JSCompat.jsRoundInt(totalMinutes)
        let min = JSCompat.posMod(rounded, 1440)
        let h = min / 60
        let m = min % 60
        return String(format: "%02d:%02d", h, m)
    }

    public static func calculateDwellMinutes(
        activeChips: [String] = [],
        logistics: LogisticsSettings? = nil,
        recoveryRule: StationaryRecoveryRule? = nil
    ) -> Int {
        func applyCap(_ minutes: Double) -> Int {
            if let rule = recoveryRule {
                return StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(requestedMinutes: minutes, rule: rule)
            }
            return max(0, JSCompat.jsRoundInt(minutes))
        }

        var dwell = 0
        if activeChips.contains("coffee-stop") {
            dwell += applyCap(logistics?.coffeeDurationMin ?? 15)
        }
        if activeChips.contains("picnic-outing") {
            dwell += applyCap(45)
        }
        if activeChips.contains("resupply-points") {
            dwell += applyCap(15)
        }
        if let planned = logistics?.plannedLongStopMin, planned > 0 {
            dwell += applyCap(planned)
        }
        return dwell
    }

    public static func solveTripTimeline(
        movingSeconds: Double,
        activeChips: [String] = [],
        logistics: LogisticsSettings? = nil,
        overrideDepartureHHMM: String? = nil,
        overrideArrivalHHMM: String? = nil,
        departureDate: String? = nil,
        coordinates: LatLon? = nil,
        now: Date = Date()
    ) -> SolvedTripTimeline {
        let movingMin = Int(ceil(max(60.0, movingSeconds) / 60.0))
        let anchorMode = logistics?.timelineAnchorMode ?? "arrive-by"
        let defaultAnchor = anchorMode == "arrive-by" ? "08:30" : "07:35"
        let anchorTime = (logistics?.anchorTimeHHMM?.isEmpty == false) ? logistics!.anchorTimeHHMM! : defaultAnchor

        func solveWithDwell(_ dwell: Int) -> (depMin: Int, arrMin: Int, totalTransit: Int) {
            let totalTransit = movingMin + dwell
            let depMin: Int
            let arrMin: Int
            if let ovDep = overrideDepartureHHMM, !ovDep.isEmpty,
               let ovArr = overrideArrivalHHMM, !ovArr.isEmpty {
                depMin = parseHHMM(ovDep)
                arrMin = parseHHMM(ovArr)
            } else if anchorMode == "arrive-by" {
                arrMin = parseHHMM(anchorTime)
                depMin = arrMin - totalTransit
            } else {
                depMin = parseHHMM(anchorTime)
                arrMin = depMin + totalTransit
            }
            return (depMin, arrMin, totalTransit)
        }

        var dwellMin = calculateDwellMinutes(activeChips: activeChips, logistics: logistics)
        var solved = solveWithDwell(dwellMin)

        let recoveryRule = StationaryRecoveryEngine.getStationaryRecoveryRule(
            rolloutTimeHHMM: formatHHMM(Double(solved.depMin)),
            departureDate: departureDate,
            coordinates: coordinates,
            now: now
        )

        if recoveryRule.isRestricted {
            dwellMin = calculateDwellMinutes(activeChips: activeChips, logistics: logistics, recoveryRule: recoveryRule)
            solved = solveWithDwell(dwellMin)
        }

        let resolvedDepartureMin = solved.depMin
        let resolvedArrivalMin = solved.arrMin
        let totalTransitMin = solved.totalTransit

        let departureTimeHHMM = formatHHMM(Double(resolvedDepartureMin))
        let arrivalTimeHHMM = formatHHMM(Double(resolvedArrivalMin))

        let preStyle = logistics?.preRideStyle ?? "full-breakfast"
        let preBufferMin = preStyle == "full-breakfast" ? 45 : (preStyle == "light-liquid" ? 20 : 15)
        let preRideMealTimeHHMM = formatHHMM(Double(resolvedDepartureMin - preBufferMin))
        let preRideWindow = "\(preRideMealTimeHHMM) – \(departureTimeHHMM)"

        let isSplit = logistics?.splitPostRideRecovery ?? activeChips.contains("shower-locker")

        let postRideImmediateWindow: String?
        let postRideMealWindow: String?
        let postRideConsolidatedWindow: String?

        if isSplit {
            postRideImmediateWindow = "\(arrivalTimeHHMM) – \(formatHHMM(Double(resolvedArrivalMin + 10)))"
            postRideMealWindow = "\(formatHHMM(Double(resolvedArrivalMin + 22))) – \(formatHHMM(Double(resolvedArrivalMin + 37)))"
            postRideConsolidatedWindow = nil
        } else {
            postRideImmediateWindow = nil
            postRideMealWindow = nil
            postRideConsolidatedWindow = "\(formatHHMM(Double(resolvedArrivalMin + 10))) – \(formatHHMM(Double(resolvedArrivalMin + 30)))"
        }

        return SolvedTripTimeline(
            departureTimeHHMM: departureTimeHHMM,
            arrivalTimeHHMM: arrivalTimeHHMM,
            totalTransitMin: totalTransitMin,
            movingMin: movingMin,
            dwellMin: dwellMin,
            preRideWindow: preRideWindow,
            preRideMealTimeHHMM: preRideMealTimeHHMM,
            postRideImmediateWindow: postRideImmediateWindow,
            postRideMealWindow: postRideMealWindow,
            postRideConsolidatedWindow: postRideConsolidatedWindow,
            resolvedDepartureMin: resolvedDepartureMin,
            resolvedArrivalMin: resolvedArrivalMin
        )
    }

    public static func isOffHoursCommercialWindow(_ timeHHMM: String) -> Bool {
        guard !timeHHMM.isEmpty, timeHHMM.contains(":") else { return false }
        let minutes = parseHHMM(timeHHMM)
        return minutes >= 19 * 60 || minutes < 7 * 60
    }

    private static let rolloutPriorityIds: Set<String> = [
        "hard-departure", "sport-rollout", "bp-departure"
    ]
    private static let arrivalPriorityIds: Set<String> = [
        "gate-security", "destination-arrival", "bp-destination-arrive", "sport-session-finish"
    ]
    private static let postArrivalPriorityIds: Set<String> = [
        "locker-refuel", "shower-groom", "shift-start", "sport-post-recovery",
        "bp-camp-settle", "hotel-checkin", "freshen-up", "town-explore"
    ]

    private static func resolveAmenityStopMeta(_ category: AmenityCategory, isFr: Bool) -> (iconName: String, label: String, category: String) {
        switch category {
        case .water:
            return ("Droplets", isFr ? "Point d'eau" : "Water stop", "nutrition")
        case .cemetery:
            return ("Cemetery", isFr ? "Cimetière (Eau)" : "Cemetery water", "nutrition")
        case .food:
            return ("Baguette", isFr ? "Ravitaillement" : "Resupply stop", "nutrition")
        case .mechanix:
            return ("Wrench", isFr ? "Atelier / Abri" : "Repair / Shelter", "ride")
        case .essentials:
            return ("Shield", isFr ? "WC / Pharm. / Station" : "Toilet / Fuel / Med", "transit")
        case .bailout:
            return ("TrainSimple", isFr ? "Gare de repli" : "Train bailout", "transit")
        }
    }

    private static let commercialFoodSubtypes: Set<String> = [
        "bakery", "cafe", "roastery", "coffee", "supermarket", "convenience",
        "restaurant", "pub", "bistro", "pastry", "deli", "grocery"
    ]
    private static let commercialRetailSubtypes: Set<String> = ["bicycle", "pharmacy"]

    private static func classifyCommercialWaypoint(name: String, amenity: StageAmenity?) -> String? {
        if let amenity = amenity {
            let subType = amenity.subType.lowercased()
            if amenity.category == .food || commercialFoodSubtypes.contains(subType) {
                return "food"
            }
            if commercialRetailSubtypes.contains(subType) {
                return "retail"
            }
            if amenity.category == .water || amenity.category == .cemetery || amenity.category == .bailout {
                return nil
            }
        }
        let pattern = #"\b(caf[eé]|roaster(?:y|ie)?|baker(?:y|ies)|boulangerie|p[aâ]tisserie|espresso|coffee(?:\s+(?:shop|stop|bar))?|bistro|supermarket|grocery|[eé]picerie|restaurant|brasserie|tea\s*room|salon\s+de\s+th[eé])\b"#
        if name.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil {
            return "food"
        }
        return nil
    }

    private static func buildSelfSupportedFuelStep(
        id: String,
        time: String,
        location: String,
        isFr: Bool,
        closedStopName: String? = nil
    ) -> TimelineStep {
        let closedSuffix = (closedStopName?.isEmpty == false)
            ? (isFr ? " — \(closedStopName!) fermé" : " — \(closedStopName!) closed")
            : ""
        return TimelineStep(
            id: id,
            time: time,
            title: isFr ? "Arrêt Ravitaillement Autonome" : "Self-Supported Fuel Stop",
            location: location,
            category: "nutrition",
            isCrucialCheckpoint: true,
            description: isFr
                ? "Arrivée prévue à \(time) (19:00–07:00)\(closedSuffix). Ravitaillement autonome embarqué."
                : "Calculated arrival at \(time) (19:00–07:00)\(closedSuffix). Rely on onboard self-supported fuel.",
            iconName: "Zap"
        )
    }

    private static func buildIntermediateStopSteps(
        route: RouteParams,
        pinnedAmenities: [StageAmenity],
        hardDepartureTime: String,
        totalRideMinutes: Int,
        isFr: Bool,
        departureDate: String?
    ) -> [TimelineStep] {
        let waypoints = route.waypoints ?? []
        let amenities = pinnedAmenities
        if waypoints.isEmpty && amenities.isEmpty { return [] }

        let hasPolyline = (route.coordinates?.count ?? 0) >= 2
        let cumDistances = hasPolyline ? OverpassWaterGapEngine.computeCumulativeDistances(route.coordinates!) : nil
        let polylineTotalKm = (cumDistances?.last ?? 0.0)
        let totalKm = max(1.0, route.distanceKm > 0 ? route.distanceKm : (polylineTotalKm > 0 ? polylineTotalKm : 30.0))

        var matchedAmenityIds = Set<String>()

        func findMatchingAmenity(_ wp: RouteWaypoint) -> StageAmenity? {
            for amenity in amenities {
                if let src = wp.sourceAmenityId, src == amenity.id { return amenity }
                if wp.id == "wp-poi-\(amenity.id)" { return amenity }
                if let c = wp.coordinates,
                   OverpassWaterGapEngine.haversineDistanceMeters(lat1: c.lat, lon1: c.lon, lat2: amenity.lat, lon2: amenity.lon) < 60.0 {
                    return amenity
                }
            }
            return nil
        }

        struct NormalizedStop {
            var id: String
            var name: String
            var stopKm: Double
            var amenity: StageAmenity?
            var isRoutedWaypoint: Bool
        }

        var normalized: [NormalizedStop] = []

        for (idx, wp) in waypoints.enumerated() {
            let matched = findMatchingAmenity(wp)
            if let m = matched { matchedAmenityIds.insert(m.id) }

            let stopKm: Double
            if let d = wp.distanceFromStartKm, d.isFinite, d >= 0 {
                stopKm = d
            } else if let c = wp.coordinates, let cum = cumDistances, let coords = route.coordinates {
                stopKm = OverpassWaterGapEngine.snapToPolyline(lat: c.lat, lon: c.lon, coordinates: coords, cumDistancesMeters: cum).routeKm
            } else if let m = matched, m.routeKm.isFinite, m.routeKm >= 0 {
                stopKm = m.routeKm
            } else {
                stopKm = (Double(idx + 1) / Double(waypoints.count + 1)) * totalKm
            }

            let wpId = wp.id.isEmpty ? String(idx) : wp.id
            let name = !wp.name.isEmpty ? wp.name : (matched?.name ?? (isFr ? "Étape \(idx + 1)" : "Intermediate stop \(idx + 1)"))
            normalized.append(NormalizedStop(
                id: "intermediate-stop-wp-\(wpId)",
                name: name,
                stopKm: stopKm,
                amenity: matched,
                isRoutedWaypoint: true
            ))
        }

        for amenity in amenities where !matchedAmenityIds.contains(amenity.id) {
            let stopKm: Double
            if amenity.routeKm.isFinite, amenity.routeKm >= 0 {
                stopKm = amenity.routeKm
            } else if let cum = cumDistances, let coords = route.coordinates {
                stopKm = OverpassWaterGapEngine.snapToPolyline(lat: amenity.lat, lon: amenity.lon, coordinates: coords, cumDistancesMeters: cum).routeKm
            } else {
                stopKm = totalKm * 0.5
            }

            let meta = resolveAmenityStopMeta(amenity.category, isFr: isFr)
            normalized.append(NormalizedStop(
                id: "intermediate-stop-poi-\(amenity.id)",
                name: !amenity.name.isEmpty ? amenity.name : meta.label,
                stopKm: stopKm,
                amenity: amenity,
                isRoutedWaypoint: false
            ))
        }

        normalized.sort { $0.stopKm < $1.stopKm }

        let safeRideMinutes = max(1, totalRideMinutes)
        let minOffset = totalRideMinutes >= 2 ? 1 : 0
        let maxOffset = totalRideMinutes >= 2 ? totalRideMinutes - 1 : safeRideMinutes

        var steps: [TimelineStep] = []

        for stop in normalized {
            let clampedKm = max(0.0, min(totalKm, stop.stopKm))
            let rawOffset = JSCompat.jsRoundInt((clampedKm / totalKm) * Double(safeRideMinutes))
            let offsetMinutes = max(minOffset, min(maxOffset, rawOffset))
            let time = addMinutesToTime(hardDepartureTime, offsetMinutes)
            let location = "KM \(JSCompat.jsFixed(clampedKm, decimals: 1))"

            if let commercialKind = classifyCommercialWaypoint(name: stop.name, amenity: stop.amenity),
               isOffHoursCommercialWindow(time) {
                if commercialKind == "food" {
                    steps.append(buildSelfSupportedFuelStep(id: stop.id, time: time, location: location, isFr: isFr, closedStopName: stop.name))
                }
                continue
            }

            if let amenity = stop.amenity {
                let meta = resolveAmenityStopMeta(amenity.category, isFr: isFr)
                var parts = [
                    meta.label,
                    stop.isRoutedWaypoint
                        ? (isFr ? "Étape intégrée au tracé" : "Routed via stop")
                        : (isFr ? "Épingle Radar" : "Radar pin")
                ]
                if !stop.isRoutedWaypoint {
                    let detourKm = OverpassWaterGapEngine.estimateAmenityDetourKm(Double(amenity.detourMeters))
                    if detourKm > 0 {
                        parts.append("+\(JSCompat.jsFixed(detourKm, decimals: 1)) km")
                    } else if amenity.detourMeters >= 50 {
                        parts.append("+\(amenity.detourMeters) m")
                    }
                }
                if let oh = amenity.openingHours, !oh.isEmpty {
                    let verdict = OpeningHoursParser.evaluateOpeningHoursAtArrival(
                        openingHours: oh,
                        targetDateStr: departureDate,
                        arrivalTimeHHMM: time,
                        lang: isFr ? .fr : .en,
                        timeZone: TimeZone(identifier: "Europe/Paris") ?? .current
                    )
                    if let verdict = verdict, verdict.status != .unknown {
                        parts.append("\(verdict.badgeLabel) (\(oh))")
                    } else {
                        parts.append(oh)
                    }
                }
                steps.append(TimelineStep(
                    id: stop.id,
                    time: time,
                    title: stop.name,
                    location: location,
                    category: meta.category,
                    isCrucialCheckpoint: true,
                    description: parts.joined(separator: " · "),
                    iconName: meta.iconName
                ))
                continue
            }

            steps.append(TimelineStep(
                id: stop.id,
                time: time,
                title: stop.name,
                location: location,
                category: "ride",
                isCrucialCheckpoint: true,
                description: isFr ? "Point de passage intermédiaire sur le parcours" : "Intermediate stop along the route",
                iconName: "MapPin"
            ))
        }

        return steps
    }

    public static func calculateReverseTimeline(
        route: RouteParams,
        office: OfficeConstraints,
        weather: WeatherCondition,
        tripTag: String = "VÉLOTAF",
        destinationName: String = "",
        lang: CadenceLang = .en,
        extraBufferMinutes: Int = 0,
        customChips: [String] = [],
        physicsSpeedOverride: ReverseTimelinePhysicsOverride? = nil,
        riderSpecs: RiderBikeSpecs = .defaultSpecs,
        now: Date = Date()
    ) -> ReverseTimelineCalculation {
        let isFr = lang == .fr
        let tagUpper = tripTag.uppercased()
        let isSport = tagUpper.contains("SPORT") || tagUpper.contains("FONDO") || tagUpper.contains("TEMPO")
        let isBikepacking = tagUpper.contains("BIKEPACK") || tagUpper.contains("BIVOUAC")
        let isEscapade = !isSport && !isBikepacking && (
            tagUpper.contains("ESCAPADE") || tagUpper.contains("TOURING") ||
            tagUpper.contains("LEISURE") || tagUpper.contains("WEEKEND")
        )

        let fallbackSpeed = max(5.0, route.targetSpeedKmH > 0 ? route.targetSpeedKmH : 25.0)
        let isEffortMode = route.pacingMode == "effort"
        let windKmh = weather.isHeadwindActive ? weather.baseWindSpeedKmH : 0.0

        let calmSpeed: Double
        if let ovCalm = physicsSpeedOverride?.calmSpeedKmH, ovCalm > 0 {
            calmSpeed = max(5.0, ovCalm)
        } else {
            calmSpeed = fallbackSpeed
        }

        let effectiveSpeedKmH: Double
        if let ovEff = physicsSpeedOverride?.effectiveSpeedKmH, ovEff > 0 {
            effectiveSpeedKmH = max(5.0, ovEff)
        } else if isEffortMode {
            effectiveSpeedKmH = max(8.0, calmSpeed - windKmh * 0.35)
        } else {
            effectiveSpeedKmH = calmSpeed
        }

        let rawMovingMinutes = JSCompat.jsRoundInt((route.distanceKm / calmSpeed) * 60.0)
        let actualMovingMinutes = JSCompat.jsRoundInt((route.distanceKm / effectiveSpeedKmH) * 60.0)
        let weatherHeadwindImpactMinutes = max(0, actualMovingMinutes - rawMovingMinutes)
        let severeHeadwindWarning = weather.isHeadwindActive && weatherHeadwindImpactMinutes > 45 && route.distanceKm < 100.0

        let totalRideMinutes = actualMovingMinutes
        let routeBuffer = (isEscapade || isBikepacking) ? 15 : (isSport ? 5 : Int(route.urbanTrafficDelayMinutes))
        let arrivalBuffer = (isEscapade || isBikepacking) ? 10 : (isSport ? 5 : Int(route.gateSecurityDelayMinutes))

        let defaultAnchor = isSport ? "11:00" : (isBikepacking ? "18:00" : (isEscapade ? "15:00" : "08:30"))
        let totalEnRouteMinutes = totalRideMinutes + routeBuffer + arrivalBuffer + extraBufferMinutes

        let isDepartAtMode = physicsSpeedOverride?.arriveAtMode == false && (physicsSpeedOverride?.departureTime?.isEmpty == false)

        let lockerRefuelMinutes = max(0, Int(office.lockerRefuelMinutes))
        let showerChangeMinutes = max(0, Int(office.showerChangeMinutes))
        let breakRoomBreakfastMinutes = max(0, Int(office.breakRoomBreakfastMinutes))
        let postGateOfficeMinutes = lockerRefuelMinutes + showerChangeMinutes + breakRoomBreakfastMinutes

        let isCommute = !isSport && !isBikepacking && !isEscapade
        var arriveAnchor = !office.targetGateArrivalTime.isEmpty
            ? office.targetGateArrivalTime
            : (!office.shiftStartTime.isEmpty ? office.shiftStartTime : defaultAnchor)
        if isCommute && !isDepartAtMode && !office.shiftStartTime.isEmpty && postGateOfficeMinutes > 0 {
            let gapToShiftMin = JSCompat.posMod(parseHHMM(office.shiftStartTime) - parseHHMM(arriveAnchor), 1440)
            if gapToShiftMin < postGateOfficeMinutes || gapToShiftMin > 720 {
                arriveAnchor = subtractMinutesFromTime(office.shiftStartTime, postGateOfficeMinutes)
            }
        }

        let hardDepartureTime = isDepartAtMode
            ? physicsSpeedOverride!.departureTime!
            : subtractMinutesFromTime(arriveAnchor, totalEnRouteMinutes)

        let targetArrival = isDepartAtMode
            ? addMinutesToTime(hardDepartureTime, totalEnRouteMinutes)
            : arriveAnchor

        let recoveryRule = StationaryRecoveryEngine.getStationaryRecoveryRule(
            rolloutTimeHHMM: hardDepartureTime,
            departureDate: physicsSpeedOverride?.departureDate,
            coordinates: route.coordinates?.first,
            now: now
        )

        let resolvedShiftStartTime: String
        if isSport || isBikepacking || isEscapade {
            resolvedShiftStartTime = targetArrival
        } else if isDepartAtMode {
            resolvedShiftStartTime = addMinutesToTime(targetArrival, postGateOfficeMinutes)
        } else {
            resolvedShiftStartTime = !office.shiftStartTime.isEmpty
                ? office.shiftStartTime
                : addMinutesToTime(targetArrival, postGateOfficeMinutes)
        }

        let bikePrepTime = subtractMinutesFromTime(hardDepartureTime, 15)
        let preStyle = physicsSpeedOverride?.logistics?.preRideStyle ?? "full-breakfast"
        let preBufferMin = preStyle == "full-breakfast" ? 45 : (preStyle == "light-liquid" ? 20 : 15)
        let preRideMealTime = subtractMinutesFromTime(hardDepartureTime, preBufferMin)
        let wakeUpTime = subtractMinutesFromTime(hardDepartureTime, 60)

        let destTitle = !destinationName.isEmpty
            ? destinationName
            : ((route.destination?.isEmpty == false) ? route.destination! : "Destination")
        let fallbackGate = isEscapade
            ? (isFr ? "Réception Hôtel" : "Hotel Check-in")
            : isBikepacking
            ? (isFr ? "Zone de Bivouac" : "Camp / Bivouac Site")
            : isSport
            ? (isFr ? "Ligne d’arrivée" : "Finish Line")
            : (isFr ? "Porte" : "Gate")

        let gateRegex = #"gate\s*(b|17)|porte\s*(b|17)|atlantis|campus|office|bureau|workplace|entreprise"#
        let hasCommuterGateText = office.gateName.range(of: gateRegex, options: [.regularExpression, .caseInsensitive]) != nil
        let rawGate = (office.gateName.trimmingCharacters(in: .whitespaces).isEmpty || ((isEscapade || isBikepacking || isSport) && hasCommuterGateText))
            ? fallbackGate
            : office.gateName

        let localizedGate: String
        if isFr {
            localizedGate = rawGate.replacingOccurrences(of: #"^Gate\b"#, with: "Porte", options: [.regularExpression, .caseInsensitive])
        } else {
            localizedGate = rawGate.replacingOccurrences(of: #"^Porte\b"#, with: "Gate", options: [.regularExpression, .caseInsensitive])
        }

        let compliantPantry = PantryCatalog.resolveCompliantPantry(specs: riderSpecs)
        let telemetryMode = riderSpecs.telemetryMode ?? .quantitative
        let isQuant = telemetryMode == .quantitative
        let showWatts = isQuant && (riderSpecs.pacingInputMode ?? .feel) == .power
        let bidonMl = Int(riderSpecs.bidonSizeMl ?? 650)
        let slots = riderSpecs.frameBottleSlots ?? 2
        let riderCarbs = Int(riderSpecs.carbTargetGPerHr)
        let fuelRateText = Self.formatFuelTarget(carbGPerHr: riderCarbs, mode: telemetryMode, lang: lang)

        var steps: [TimelineStep] = []

        if isSport {
            let warmupTime = hardDepartureTime
            let midIntervalTime = addMinutesToTime(hardDepartureTime, JSCompat.jsRoundInt(Double(totalRideMinutes) * 0.5))
            let recoveryWindowTime = addMinutesToTime(targetArrival, 15)

            steps = [
                TimelineStep(
                    id: "sport-fuel-primer",
                    time: wakeUpTime,
                    title: isFr ? "Hydratation & Charge Glucides Rapides" : "Hydration & Fast Carbs Primer",
                    location: isFr ? "Domicile" : "Home Base",
                    category: "nutrition",
                    isCrucialCheckpoint: true,
                    description: isQuant
                        ? (isFr ? "500 ml électrolytes + 60 g glucides rapides. Contrôle charge GPS/cardio." : "500 ml electrolytes + 60 g fast carbs. Check GPS/HR battery.")
                        : (isFr ? "Grand verre électrolytes + \(compliantPantry.preRide.nameFr.lowercased())." : "Tall glass electrolytes + \(compliantPantry.preRide.nameEn.lowercased())."),
                    iconName: "AlarmClock"
                ),
                TimelineStep(
                    id: "sport-cockpit-check",
                    time: bikePrepTime,
                    title: isFr ? "Contrôle vélo & pression des pneus" : "Tire pressure & bike check",
                    location: isFr ? "Zone de départ" : "Roll-Out Point",
                    category: "prep",
                    isCrucialCheckpoint: false,
                    description: isFr
                        ? "Pression des pneus ajustée pour un bon rendement. Vérification lubrification chaîne et mise en place des \(slots) bidon\(slots > 1 ? "s" : "") de \(bidonMl) ml."
                        : "Tire pressures dialed for smooth rolling. Lube check and \(slots)× \(bidonMl) ml water bottle\(slots > 1 ? "s" : "").",
                    iconName: "CheckCircle2"
                ),
                TimelineStep(
                    id: "sport-rollout",
                    time: warmupTime,
                    title: isFr ? "Départ & échauffement progressif" : "Start ride & gentle warmup",
                    location: isFr ? "Départ" : "Origin",
                    category: "ride",
                    isCrucialCheckpoint: true,
                    description: isFr
                        ? "15 min de vélocité progressive avant de caler l'allure cible (~\(Int(route.targetSpeedKmH > 0 ? route.targetSpeedKmH : 30)) km/h)."
                        : "15-min progressive spin before settling into target pace (~\(Int(route.targetSpeedKmH > 0 ? route.targetSpeedKmH : 30)) km/h).",
                    iconName: "Navigation"
                ),
                TimelineStep(
                    id: "sport-mid-fuel",
                    time: midIntervalTime,
                    title: isFr ? "Fenêtre Ravito Glucides & Électrolytes" : "Mid-Ride Carb & Electrolyte Window",
                    location: isFr ? "Secteur Allure" : "Pacing Sector",
                    category: "nutrition",
                    isCrucialCheckpoint: false,
                    description: isQuant
                        ? (isFr ? "Ravito en selle : ~\(riderCarbs) g glucides/h et hydratation régulière." : "On-bike fuel: ~\(riderCarbs) g carbs/h with steady hydration.")
                        : (isFr ? "Ravito en selle (\(fuelRateText)) — reste régulier." : "On-bike fuel (\(fuelRateText)) — keep a steady rhythm."),
                    iconName: "Wind"
                ),
                TimelineStep(
                    id: "sport-session-finish",
                    time: targetArrival,
                    title: isFr ? "Arrivée d'étape : \(destTitle)" : "Stage Finish: \(destTitle)",
                    location: destTitle,
                    category: "transit",
                    isCrucialCheckpoint: true,
                    description: isFr
                        ? "Passage de la ligne d’arrivée. 5 min de retour au calme souple sous 120 bpm."
                        : "Cross route finish marker. 5-min easy spin down below 120 bpm.",
                    iconName: "ShieldCheck"
                ),
                TimelineStep(
                    id: "sport-post-recovery",
                    time: recoveryWindowTime,
                    title: isFr ? "Récupération & étirements" : "Post-Ride Recovery & Stretch",
                    location: isFr ? "Après la sortie" : "Post-ride",
                    category: "prep",
                    isCrucialCheckpoint: false,
                    description: isQuant
                        ? (isFr ? "25 g protéines + 500 ml eau fraîche et étirements légers." : "25 g protein + 500 ml cold water and light stretch.")
                        : (isFr ? "\(compliantPantry.postRide.nameFr) + grand verre d’eau fraîche." : "\(compliantPantry.postRide.nameEn) + tall glass of cold water."),
                    iconName: "Coffee"
                )
            ]

            if customChips.contains("climbing-kom-hunt") {
                steps.append(TimelineStep(
                    id: "sport-kom-repeats",
                    time: addMinutesToTime(hardDepartureTime, JSCompat.jsRoundInt(Double(totalRideMinutes) * 0.4)),
                    title: isFr ? "Chasse aux KOM & Répétitions en Côte" : "KOM Segment Attacks & Ridge Climbs",
                    location: isFr ? "Secteur Bosses" : "KOM Ridge Segment",
                    category: "ride",
                    isCrucialCheckpoint: true,
                    description: showWatts
                        ? (isFr ? "Attaques à 380 W+ sur les segments clés, relances explosives en danseuse et descente souple en récupération." : "Punchy 380 W+ surges on target segments, out-of-the-saddle attacks and smooth recovery descents.")
                        : (isFr ? "Attaques soutenues sur les segments clés, relances dynamiques en danseuse et descente souple en récupération." : "Punchy hard surges on target segments, out-of-the-saddle attacks and smooth recovery descents."),
                    iconName: "Trophy"
                ))
            }

            if customChips.contains("interval-training") {
                steps.append(TimelineStep(
                    id: "sport-threshold-intervals",
                    time: addMinutesToTime(hardDepartureTime, JSCompat.jsRoundInt(Double(totalRideMinutes) * 0.35)),
                    title: showWatts
                        ? (isFr ? "Fractionné au Seuil (Séries à 310 W+)" : "Threshold VO2max Interval Sets (310 W+)")
                        : (isFr ? "Fractionné soutenu au seuil" : "Sustained Threshold Interval Sets"),
                    location: isFr ? "Zone d’effort" : "Interval Stretch",
                    category: "ride",
                    isCrucialCheckpoint: true,
                    description: showWatts
                        ? (isFr ? "Répétitions au seuil (310 W+) avec maintien d’une cadence régulière à 95–100 tr/min." : "Structured threshold repetitions holding 310 W+ with steady cadence (95–100 RPM).")
                        : (isFr ? "Répétitions soutenues au seuil avec maintien d’une cadence fluide à 95–100 tr/min." : "Structured hard threshold repetitions with smooth cadence control (95-100 RPM)."),
                    iconName: "Flame"
                ))
            }

            if customChips.contains("paceline-drafting") {
                steps.append(TimelineStep(
                    id: "sport-paceline-echelon",
                    time: addMinutesToTime(hardDepartureTime, JSCompat.jsRoundInt(Double(totalRideMinutes) * 0.6)),
                    title: isFr ? "Peloton & Relais Organisés (33 km/h)" : "Paceline Rotations (33 km/h)",
                    location: isFr ? "Groupe" : "Open Road",
                    category: "ride",
                    isCrucialCheckpoint: false,
                    description: isFr
                        ? "Relais réguliers de 20–30 s à 33 km/h avec 15–20 % d’économie d’effort à l’abri du vent."
                        : "Smooth 20–30 s pulls at 33 km/h, saving 15–20% effort riding in the draft.",
                    iconName: "Users"
                ))
            }

            if customChips.contains("hydration-electrolytes"),
               let idx = steps.firstIndex(where: { $0.id == "sport-mid-fuel" }) {
                steps[idx].title = isQuant
                    ? (isFr ? "Ravitaillement \(riderCarbs) g glucides/h & électrolytes" : "Tailored Carb Pacing (\(riderCarbs) g/h) & Electrolytes")
                    : (isFr ? "Ravitaillement (\(fuelRateText)) & électrolytes" : "Steady Fueling (\(fuelRateText)) & Electrolytes")
                steps[idx].description = isQuant
                    ? (isFr ? "Apport régulier calibré sur votre tolérance digestive (\(riderCarbs) g/h) + recharge sodium 500–750 mg pour éviter toute fringale." : "Steady fueling calibrated to your carb target (\(riderCarbs) g/h) + 500–750 mg sodium reload to prevent bonking and cramping.")
                    : (isFr ? "Apport régulier calibré sur votre confort digestif (\(fuelRateText)) + boisson électrolytes pour éviter le coup de mou." : "Steady fueling calibrated to your digestion comfort (\(fuelRateText)) + electrolyte sips to prevent energy dips.")
            }
        } else if isBikepacking {
            let midStageTime = addMinutesToTime(hardDepartureTime, JSCompat.jsRoundInt(Double(totalRideMinutes) * 0.5))
            let campPitchTime = addMinutesToTime(targetArrival, 20)

            steps = [
                TimelineStep(
                    id: "bp-stowage-check",
                    time: wakeUpTime,
                    title: isFr ? "Répartition du poids sacoches & repas" : "Pannier / Saddlebag weight distribution & meals",
                    location: isFr ? "Camp / Départ" : "Camp / Base",
                    category: "prep",
                    isCrucialCheckpoint: true,
                    description: isFr ? "Compression sacs étanches, équilibrage sacoches et filtre à eau." : "Pack dry bags, balance panniers/saddlebag, check water filter.",
                    iconName: "AlarmClock"
                ),
                TimelineStep(
                    id: "bp-harness-inspection",
                    time: bikePrepTime,
                    title: isFr ? "Contrôle sacoches, freins & kit réparation" : "Check bags, brakes & repair kit",
                    location: isFr ? "Départ" : "Trailhead",
                    category: "prep",
                    isCrucialCheckpoint: false,
                    description: isFr
                        ? "Serrage du harnais de cintre, maintien de la sacoche de selle et vérification des flancs de pneus sous charge."
                        : "Torque check handlebar harness, secure seat-pack sway, check tire sidewalls for loaded clearance.",
                    iconName: "CheckCircle2"
                ),
                TimelineStep(
                    id: "bp-departure",
                    time: hardDepartureTime,
                    title: isFr ? "Départ expédition vers \(destTitle)" : "Trailhead rollout toward \(destTitle)",
                    location: isFr ? "Départ" : "Origin",
                    category: "ride",
                    isCrucialCheckpoint: true,
                    description: isFr
                        ? "Cadence d’endurance régulière (~\(Int(route.targetSpeedKmH > 0 ? route.targetSpeedKmH : 18)) km/h) avec vélo chargé."
                        : "Steady endurance cadence (~\(Int(route.targetSpeedKmH > 0 ? route.targetSpeedKmH : 18)) km/h) under loaded cargo mass.",
                    iconName: "Navigation"
                ),
                TimelineStep(
                    id: "bp-mid-refuel",
                    time: midStageTime,
                    title: isFr ? "Ravito Mi-Étape, Eau & Sanglage" : "Mid-Stage Water Resupply & Bag Check",
                    location: isFr ? "Mi-Parcours" : "Midway Sector",
                    category: "nutrition",
                    isCrucialCheckpoint: false,
                    description: isFr ? "Contrôle de tension des sangles après vibrations et remplissage des réserves d’eau." : "Check frame bag straps for trail vibration looseness. Top off water bladders.",
                    iconName: "Wind"
                ),
                TimelineStep(
                    id: "bp-destination-arrive",
                    time: targetArrival,
                    title: isFr ? "Arrivée à \(destTitle)" : "Arrival at \(destTitle)",
                    location: destTitle,
                    category: "transit",
                    isCrucialCheckpoint: true,
                    description: isFr ? "Arrivée sur la zone de bivouac avant le crépuscule. Repérage d’un sol plat." : "Reach destination or bivouac zone. Survey ground for camp setup.",
                    iconName: "ShieldCheck"
                ),
                TimelineStep(
                    id: "bp-camp-settle",
                    time: campPitchTime,
                    title: isFr ? "Montage Bivouac, Recharge & Récupération" : "Bivouac Setup, Evening Charging & Recovery",
                    location: isFr ? "Zone de Bivouac" : "Bivouac Site",
                    category: "prep",
                    isCrucialCheckpoint: false,
                    description: isFr ? "Montage tente, recharge GPS/feux sur batterie et dîner chaud." : "Pitch shelter, charge GPS/lights on power bank, warm dinner.",
                    iconName: "Coffee"
                )
            ]

            if customChips.contains("mountain-adventure") {
                steps.append(TimelineStep(
                    id: "bp-mountain-col-clearance",
                    time: addMinutesToTime(hardDepartureTime, JSCompat.jsRoundInt(Double(totalRideMinutes) * 0.45)),
                    title: isFr ? "Franchissement de Col & Contrôle Freins" : "Alpine Pass Summit & Brake Pad Check",
                    location: isFr ? "Sommet du Col" : "Alpine Pass Summit",
                    category: "ride",
                    isCrucialCheckpoint: true,
                    description: isFr
                        ? "Contrôle du mordant des freins avant la descente technique, hydratation haute altitude et coupe-vent enfilé."
                        : "Brake pad bite check before technical descent, altitude hydration and wind gilet deployed.",
                    iconName: "Mountain"
                ))
                if let idx = steps.firstIndex(where: { $0.id == "bp-destination-arrive" }) {
                    steps[idx].title = isFr ? "Arrivée Bivouac Montagne avant Crépuscule" : "Mountain Bivouac Arrival before Dusk"
                    steps[idx].description = isFr
                        ? "Arrivée conseillée avant 19:30 pour installer le campement abrité du vent d’altitude."
                        : "Target arrival before 19:30 to secure sheltered mountain camp against altitude wind."
                }
            }

            if customChips.contains("resupply-points") {
                let resupplyTime = addMinutesToTime(hardDepartureTime, JSCompat.jsRoundInt(Double(totalRideMinutes) * 0.35))
                if isOffHoursCommercialWindow(resupplyTime) {
                    steps.append(buildSelfSupportedFuelStep(
                        id: "bp-resupply-stop",
                        time: resupplyTime,
                        location: isFr ? "En autonomie sur le parcours" : "On-route self-supported",
                        isFr: isFr,
                        closedStopName: isFr ? "Boulangerie de village" : "Village Bakery"
                    ))
                } else {
                    steps.append(TimelineStep(
                        id: "bp-resupply-stop",
                        time: resupplyTime,
                        formattedDuration: recoveryRule.isRestricted ? "5 min max" : nil,
                        title: isFr ? "Ravitaillement Boulangerie & Eau de Source" : "Village Bakery & Spring Water Resupply",
                        location: isFr ? "Fontaine du Village" : "Village Spring Waypoint",
                        category: "nutrition",
                        isCrucialCheckpoint: false,
                        description: recoveryRule.isRestricted
                            ? (isFr ? "Arrêt express de 5 min max (départ hivernal avant l’aube) pour éviter le refroidissement : recharge eau et pain/fruits secs." : "Quick 5-min max stop (pre-dawn winter cap) to prevent core temp drop: top off water & grab rations.")
                            : (isFr ? "Recharge des 2L d’eau, approvisionnement en pain frais, fruits secs et bananes." : "Top off 2L water capacity, pick up fresh bread, dried fruit & energy rations."),
                        iconName: "UtensilsCrossed"
                    ))
                }
            }

            if customChips.contains("bivouac-camp"), let idx = steps.firstIndex(where: { $0.id == "bp-camp-settle" }) {
                steps[idx].title = isFr ? "Bivouac Sauvage : Zéro Trace & Filtration d’Eau" : "Wild Bivouac: Leave-No-Trace & Gravity Filter"
                steps[idx].description = isFr
                    ? "Montage de l’abri ultraléger, filtration d’eau à la flasque et repas chaud lyophilisé au réchaud."
                    : "Pitch ultralight shelter, gravity water filtration, hot camp stove stew, and pristine leave-no-trace protocol."
            }

            if customChips.contains("gravel-trail-master"), let idx = steps.firstIndex(where: { $0.id == "bp-harness-inspection" }) {
                steps[idx].title = isFr ? "Calibrage Pression Tout-Terrain & Mèches" : "Off-Grid Trail Pressure & Tubeless Dart Check"
                steps[idx].description = isFr
                    ? "Pression descendue à 2,4 bar pour maximiser l’adhérence sur piste caillouteuse, outil mèches accessible."
                    : "Pressures dialed to 2.4 bar for loose trail grip, tubeless dart plug tool mounted within reach."
            }
        } else if isEscapade {
            let arrivalTime = subtractMinutesFromTime(targetArrival, 5)
            let roomSettleTime = addMinutesToTime(targetArrival, 25)
            let exploreTime = addMinutesToTime(roomSettleTime, 30)
            let speedStr = Self.jsNumberStr(route.targetSpeedKmH)

            steps = [
                TimelineStep(
                    id: "prep-hydration",
                    time: wakeUpTime,
                    title: isFr ? "Répartition sacoches & hydratation" : "Pannier balance & hydration primer",
                    location: isFr ? "Départ" : "Home / Start",
                    category: "prep",
                    isCrucialCheckpoint: false,
                    description: isFr ? "400 ml eau + électrolytes ; contrôle équilibrage sacoches." : "Drink 400 ml electrolytes; balance pannier/saddlebag load.",
                    iconName: "AlarmClock"
                ),
                TimelineStep(
                    id: "pre-ride-fuel",
                    time: preRideMealTime,
                    title: preStyle == "fasted-rollout"
                        ? (isFr ? "Hydratation pré-départ (à jeun)" : "Fasted hydration")
                        : (isFr ? "Collation Énergétique Pré-Départ" : "Pre-Ride Energy Breakfast"),
                    location: isFr ? "Cuisine" : "Kitchen Counter",
                    category: "nutrition",
                    isCrucialCheckpoint: true,
                    description: preStyle == "fasted-rollout"
                        ? (isFr ? "Hydratation légère (eau + expresso ou thé). Remplissage des \(slots) bidon\(slots > 1 ? "s" : "") pour la route." : "Light hydration (water + espresso or tea). Fill \(slots)× water bottle\(slots > 1 ? "s" : "") for the road.")
                        : (isFr ? "\(compliantPantry.preRide.nameFr) + expresso. Remplissage des \(slots) bidon\(slots > 1 ? "s" : "") pour la route." : "\(compliantPantry.preRide.nameEn) + espresso. Fill \(slots)× water bottle\(slots > 1 ? "s" : "") for the road."),
                    iconName: "Utensils"
                ),
                TimelineStep(
                    id: "garage-rollout",
                    time: bikePrepTime,
                    title: isFr ? "Contrôle rapide du vélo" : "Quick bike check",
                    location: isFr ? "Départ" : "Start",
                    category: "prep",
                    isCrucialCheckpoint: false,
                    description: isFr ? "Pression pneus cyclo, sacoches sanglées, kit anti-crève et trace GPS chargée." : "Tire pressures at touring spec, panniers strapped, GPS route locked.",
                    iconName: "CheckCircle2"
                ),
                TimelineStep(
                    id: "hard-departure",
                    time: hardDepartureTime,
                    title: isFr ? "Départ vers \(destTitle)" : "Rollout toward \(destTitle)",
                    location: isFr ? "Départ" : "Origin",
                    category: "ride",
                    isCrucialCheckpoint: true,
                    description: isFr ? "Allure cyclo régulière (~\(speedStr) km/h). Arrivée cible à \(targetArrival)." : "Steady touring pace (~\(speedStr) km/h). Target arrival by \(targetArrival).",
                    iconName: "Navigation"
                ),
                TimelineStep(
                    id: "mid-ride-transit",
                    time: addMinutesToTime(hardDepartureTime, JSCompat.jsRoundInt(Double(totalRideMinutes) * 0.5)),
                    title: isFr ? "Pause Ravito & Mi-Parcours" : "Scenic Mid-Route Transition",
                    location: isFr ? "Mi-Parcours" : "Midway Sector",
                    category: "ride",
                    isCrucialCheckpoint: false,
                    description: isFr ? "Hydratation & encas énergétique. Gardez une cadence souple et confortable." : "Hydration check & energy bar. Maintain smooth, sustainable cadence.",
                    iconName: "Wind"
                ),
                TimelineStep(
                    id: "destination-arrival",
                    time: arrivalTime,
                    title: isFr ? "Arrivée à \(destTitle)" : "Arrival in \(destTitle)",
                    location: destTitle,
                    category: "transit",
                    isCrucialCheckpoint: true,
                    description: isFr ? "Entrée dans \(destTitle). Approche calme jusqu'à la réception de l'hébergement." : "Roll into \(destTitle). Navigate to accommodation entrance.",
                    iconName: "ShieldCheck"
                ),
                TimelineStep(
                    id: "hotel-checkin",
                    time: targetArrival,
                    title: isFr ? "Check-In Hôtel & Local Vélo Sécurisé" : "Hotel Check-In & Secure Bike Storage",
                    location: isFr ? "Réception Hôtel" : "Hotel Reception",
                    category: "office",
                    isCrucialCheckpoint: true,
                    description: isFr ? "Enregistrement à la réception, rangement du vélo au local fermé et dépôt des bagages." : "Hotel Check-in at reception, secure bike in dedicated storage/room, and unload panniers.",
                    iconName: "Briefcase"
                ),
                TimelineStep(
                    id: "freshen-up",
                    time: roomSettleTime,
                    title: isFr ? "Recharge Soir, Douche & Récupération" : "Evening Charging, Shower & Recovery",
                    location: isFr ? "Chambre d'Hôtel" : "Hotel Room",
                    category: "prep",
                    isCrucialCheckpoint: false,
                    description: isFr ? "Recharge GPS/feux, douche chaude et tenue du soir." : "Charge GPS/lights, hot shower, and casual evening kit.",
                    iconName: "ShowerHead"
                ),
                TimelineStep(
                    id: "town-explore",
                    time: exploreTime,
                    title: isFr ? "Découverte de \(destTitle) & Dîner" : "Explore \(destTitle) & Evening Dining",
                    location: isFr ? "Centre de \(destTitle)" : "\(destTitle) Center",
                    category: "nutrition",
                    isCrucialCheckpoint: false,
                    description: isFr ? "Balade à pied dans le centre, découverte locale et dîner détendu sans contrainte horaire." : "Stroll town center, visit local sights, relaxed dinner without timeline stress.",
                    iconName: "Coffee"
                )
            ]

            if customChips.contains("picnic-outing") && !recoveryRule.disableLunchBreak {
                let hasDietaryFilters = !(riderSpecs.dietaryFilters?.isEmpty ?? true)
                let primarySolid = compliantPantry.onBikeSolids.first ?? compliantPantry.preRide
                steps.append(TimelineStep(
                    id: "esc-picnic-lunch",
                    time: addMinutesToTime(hardDepartureTime, JSCompat.jsRoundInt(Double(totalRideMinutes) * 0.5)),
                    title: isFr ? "Déjeuner Pique-Nique au Bord de l’Eau (45 min)" : "Waterside Scenic Picnic Lunch (45 min)",
                    location: isFr ? "Halte Fluviale / Lac" : "Scenic Riverbank Halt",
                    category: "nutrition",
                    isCrucialCheckpoint: true,
                    description: hasDietaryFilters
                        ? (isFr ? "Pause détente de 45 min : \(primarySolid.nameFr.lowercased()), fruits frais et spécialités locales adaptées au soleil." : "45-min waterside pause: \(primarySolid.nameEn.lowercased()), fresh fruit and local specialties in the sun.")
                        : (isFr ? "Pause détente de 45 min : pain frais, fromage local du terroir, fruits frais et hydratation au soleil." : "45-min waterside pause: artisanal sourdough, regional cheese, fresh fruit and hydration in the sun."),
                    iconName: "Utensils"
                ))
            }

            if customChips.contains("historical-tour") && !recoveryRule.disableLunchBreak {
                steps.append(TimelineStep(
                    id: "esc-historical-chateau",
                    time: addMinutesToTime(hardDepartureTime, JSCompat.jsRoundInt(Double(totalRideMinutes) * 0.35)),
                    title: isFr ? "Visite Patrimoine & Pause Château (30 min)" : "Château & Heritage Site Visit (30 min)",
                    location: isFr ? "Site Historique" : "Heritage Monument",
                    category: "ride",
                    isCrucialCheckpoint: false,
                    description: isFr ? "Stationnement sécurisé du vélo au pied des remparts et découverte à pied des monuments classés." : "Secure bike parking at castle gates, 30-min walking exploration of historic grounds.",
                    iconName: "Landmark"
                ))
            }

            if (customChips.contains("local-gastronomy") || customChips.contains("wine-tasting")),
               let idx = steps.firstIndex(where: { $0.id == "town-explore" }) {
                steps[idx].title = isFr ? "Dîner Gastronomique du Terroir & Vignoble" : "Regional Gastronomy & Terroir Dining"
                steps[idx].description = isFr ? "Table réservée pour 19:45 : accords mets-vins de terroir, spécialités régionales et récupération gourmande." : "Table booked for 19:45: local wine pairings, regional farm-to-table cuisine, and relaxed recovery."
                steps[idx].iconName = "Wine"
            }

            if customChips.contains("photography-spots") {
                steps.append(TimelineStep(
                    id: "esc-golden-hour-photo",
                    time: addMinutesToTime(hardDepartureTime, JSCompat.jsRoundInt(Double(totalRideMinutes) * 0.75)),
                    title: isFr ? "Spot Photo : Halte Lumière Dorée" : "Golden Hour Scenic Photography Stop",
                    location: isFr ? "Belvédère Panoramique" : "Scenic Overlook",
                    category: "ride",
                    isCrucialCheckpoint: false,
                    description: isFr ? "Pause de 15 min pour immortaliser les paysages dans la lumière rasante de fin d’après-midi." : "15-min pause to capture golden hour panoramas with handlebar camera gear.",
                    iconName: "Camera"
                ))
            }
        } else {
            let gateArrivalAnchor = targetArrival
            let gateTurnstileTime = subtractMinutesFromTime(gateArrivalAnchor, arrivalBuffer)
            let showerStartTime = addMinutesToTime(gateArrivalAnchor, lockerRefuelMinutes)
            let isFasted = physicsSpeedOverride?.logistics?.preRideStyle == "fasted-rollout"
            let speedStr = Self.jsNumberStr(route.targetSpeedKmH)

            let openRoadDesc: String
            if weather.isHeadwindActive {
                if severeHeadwindWarning {
                    openRoadDesc = isFr
                        ? "Vent de face sévère (+\(weatherHeadwindImpactMinutes) min de pénalité sur \(JSCompat.jsRoundInt(route.distanceKm)) km). Envisagez de revoir votre itinéraire ou de prendre le train."
                        : "Severe headwind (+\(weatherHeadwindImpactMinutes) min penalty on a \(JSCompat.jsRoundInt(route.distanceKm)) km route). Consider reconsidering the route or taking the train."
                } else if showWatts {
                    let windStr = Self.jsNumberStr(windKmh)
                    let savedW = JSCompat.jsRoundInt(windKmh * 3.5)
                    openRoadDesc = isFr
                        ? "Vent de face détecté (\(windStr) km/h). Position basse sur les cocottes pour économiser ~\(savedW) W."
                        : "Headwind detected (\(windStr) km/h). Tuck low on the hoods to save ~\(savedW) W."
                } else {
                    let windStr = Self.jsNumberStr(windKmh)
                    openRoadDesc = isFr
                        ? "Vent de face détecté (\(windStr) km/h). Position basse sur les cocottes pour protéger votre allure face au vent."
                        : "Headwind detected (\(windStr) km/h). Hold a low riding posture to save energy into the wind."
                }
            } else {
                openRoadDesc = isFr
                    ? "Vent calme sur le parcours. Cadence régulière (88–92 tr/min)."
                    : "Calm road conditions. Cruise at a steady cadence (88–92 RPM)."
            }

            steps = [
                TimelineStep(
                    id: "wake-prep",
                    time: wakeUpTime,
                    title: isFr ? "Réveil & hydratation" : "Wake up and drink water",
                    location: isFr ? "Domicile" : "Home Base",
                    category: "prep",
                    isCrucialCheckpoint: false,
                    description: isFr ? "Boire 300 ml d’eau fraîche avec une pincée de sel. Mise en route." : "Drink 300 ml fresh water with pinch of salt. Wake up and get ready.",
                    iconName: "AlarmClock"
                ),
                TimelineStep(
                    id: "pre-ride-fuel",
                    time: preRideMealTime,
                    title: isFasted ? (isFr ? "Hydratation pré-départ (à jeun)" : "Fasted hydration") : (isFr ? "Petit-déjeuner" : "Breakfast"),
                    location: isFr ? "Cuisine" : "Kitchen Counter",
                    category: "nutrition",
                    isCrucialCheckpoint: true,
                    description: isFasted
                        ? (isFr ? "Hydratation légère (eau + café ou thé). Votre encas vous attend à l’arrivée." : "Light hydration (water + coffee or tea). Your breakfast awaits at arrival.")
                        : (isFr ? "\(compliantPantry.preRide.nameFr) (\(compliantPantry.preRide.portionLabelFr)) + café ou thé. Digestion matinale légère." : "\(compliantPantry.preRide.nameEn) (\(compliantPantry.preRide.portionLabelEn)) + coffee or tea. Easy morning digestion."),
                    iconName: "Utensils"
                ),
                TimelineStep(
                    id: "garage-rollout",
                    time: bikePrepTime,
                    title: isFr ? "Contrôle rapide du vélo" : "Quick bike check",
                    location: isFr ? "Départ" : "By the door",
                    category: "prep",
                    isCrucialCheckpoint: false,
                    description: isFr ? "Vérifier pression des pneus, batteries feux/radar, bidons montés et badge d’accès." : "Verify tire pressure, battery status, bottles mounted, badge secured.",
                    iconName: "CheckCircle2"
                ),
                TimelineStep(
                    id: "hard-departure",
                    time: hardDepartureTime,
                    title: isFr ? "Heure de départ : \(hardDepartureTime)" : "Time to go: \(hardDepartureTime)",
                    location: isFr ? "Départ" : "Start",
                    category: "ride",
                    isCrucialCheckpoint: true,
                    description: isFr ? "Départ à l'allure cible (\(speedStr) km/h). Marge vent de face : +\(weatherHeadwindImpactMinutes) min." : "Roll out at target pace (\(speedStr) km/h). Headwind buffer: +\(weatherHeadwindImpactMinutes) min.",
                    iconName: "Navigation"
                ),
                TimelineStep(
                    id: "estuary-transit",
                    time: addMinutesToTime(hardDepartureTime, JSCompat.jsRoundInt(Double(totalRideMinutes) * 0.45)),
                    title: severeHeadwindWarning
                        ? (isFr ? "Alerte vent de face sévère" : "Severe Headwind Warning")
                        : (isFr ? "Secteur Allure & Traversée Exposée" : "Mid-Ride Pacing Sector"),
                    location: isFr ? "Route Ouverte" : "Open Road Sector",
                    category: "ride",
                    isCrucialCheckpoint: severeHeadwindWarning,
                    description: openRoadDesc,
                    iconName: severeHeadwindWarning ? "AlertTriangle" : "Wind"
                ),
                TimelineStep(
                    id: "gate-security",
                    time: gateTurnstileTime,
                    title: isFr ? "Arrivée & stationnement vélo (\(localizedGate))" : "Arrival & Bike Lockup (\(localizedGate))",
                    location: localizedGate,
                    category: "transit",
                    isCrucialCheckpoint: true,
                    description: isFr ? "Arrivée à \(localizedGate) et stationnement du vélo." : "Arrive at \(localizedGate) and lock your bike.",
                    iconName: "ShieldCheck"
                ),
                TimelineStep(
                    id: "locker-refuel",
                    time: gateArrivalAnchor,
                    title: isFr ? "Collation à l’arrivée" : "Arrival snack",
                    location: isFr ? "À l’arrivée" : "At work",
                    category: "nutrition",
                    isCrucialCheckpoint: true,
                    description: showerChangeMinutes > 0
                        ? (isFr ? "Collation rapide avant la douche." : "Quick snack before showering.")
                        : (isFr ? "Collation rapide et rangement du vélo." : "Quick snack and bike lockup."),
                    iconName: "Zap"
                )
            ]

            if showerChangeMinutes > 0 {
                steps.append(TimelineStep(
                    id: "shower-groom",
                    time: showerStartTime,
                    formattedDuration: "\(showerChangeMinutes) min",
                    title: isFr ? "Douche & Tenue de Travail" : "Shower & Clean Kit Change",
                    location: isFr ? "Douches" : "Showers",
                    category: "office",
                    isCrucialCheckpoint: true,
                    description: isFr
                        ? "Douche et passage en tenue de bureau propre (\(showerChangeMinutes) min, prêt pour \(resolvedShiftStartTime))."
                        : "Shower and swap into work attire (\(showerChangeMinutes) min, ready by \(resolvedShiftStartTime)).",
                    iconName: "ShowerHead"
                ))
            }

            steps.append(TimelineStep(
                id: "shift-start",
                time: resolvedShiftStartTime,
                title: isFr ? "Au bureau / Prise de poste" : "At work / Shift start",
                location: isFr ? "Poste de Travail" : "Work Desk",
                category: "office",
                isCrucialCheckpoint: true,
                description: isFr ? "Installation au poste à l’heure, ravitaillé et prêt pour la journée." : "Arrive composed, fully fueled, and ready for work.",
                iconName: "Briefcase"
            ))

            if customChips.contains("coffee-stop") {
                let coffeeTime = addMinutesToTime(hardDepartureTime, max(10, JSCompat.jsRoundInt(Double(totalRideMinutes) * 0.35)))
                if isOffHoursCommercialWindow(coffeeTime) {
                    steps.append(buildSelfSupportedFuelStep(
                        id: "commute-coffee-pause",
                        time: coffeeTime,
                        location: isFr ? "En autonomie sur le parcours" : "On-route self-supported",
                        isFr: isFr,
                        closedStopName: isFr ? "Café / Roaster" : "Cafe / Roastery"
                    ))
                } else {
                    let cafeSnack = PantryCatalog.getCafeSnackSuggestion(filters: riderSpecs.dietaryFilters ?? [], lang: lang)
                    let coffeeCapMin = StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(
                        requestedMinutes: physicsSpeedOverride?.logistics?.coffeeDurationMin ?? 15,
                        rule: recoveryRule
                    )
                    steps.append(TimelineStep(
                        id: "commute-coffee-pause",
                        time: coffeeTime,
                        formattedDuration: recoveryRule.isRestricted ? "\(coffeeCapMin) min" : nil,
                        title: isFr ? "Pause Café & Ravitaillement Roaster" : "Cafe Waypoint & Espresso Pause",
                        location: isFr ? "Café d’Étape" : "Roastery Waypoint",
                        category: "nutrition",
                        isCrucialCheckpoint: true,
                        description: recoveryRule.isRestricted
                            ? (isFr ? "Pause express limitée à \(coffeeCapMin) min max (départ hivernal avant l’aube) pour éviter le refroidissement. \(cafeSnack)." : "Quick stop capped at \(coffeeCapMin) min max (pre-dawn winter rule) to prevent core temp drop. \(cafeSnack).")
                            : (isFr ? "Pause café matinale planifiée (\(coffeeCapMin) min). \(cafeSnack) avant la relance." : "Scheduled \(coffeeCapMin)-min morning coffee stop. \(cafeSnack) before rolling again."),
                        iconName: "Coffee"
                    ))
                }
            }

            if customChips.contains("night-ride"), let idx = steps.firstIndex(where: { $0.id == "garage-rollout" }) {
                steps[idx].title = isFr ? "Sécurité Nocturne & Contrôle Phare 800+ lm" : "Night Ride Prep & 800+ lm Check"
                steps[idx].description = isFr ? "Phare 800+ lumens vérifié en mode plein faisceau, baudrier rétro-réfléchissant ajusté et radar actif." : "800+ lm headlight high-beam verified, hi-vis reflective sash adjusted, rear radar active."
                steps[idx].iconName = "Moon"
            }

            if customChips.contains("fitness-boost"), let idx = steps.firstIndex(where: { $0.id == "estuary-transit" }) {
                steps[idx].title = isFr ? "Secteur Allure & Relais Cardio Tempo" : "Tempo Cadence & Cardio Surge Sector"
                steps[idx].description = showWatts
                    ? (isFr ? "Relance en Zone 3 soutenue (~260W). Rythme cardio soutenu pour maximiser le bénéfice entraînement." : "Sustained Zone 3 tempo (~260W). High-output aerobic pacing to turn commute into a structured workout.")
                    : (isFr ? "Relance soutenue en rythme tempo. Effort cardio régulier pour dynamiser le trajet." : "Sustained tempo effort. Steady aerobic pacing to turn your ride into an energizing workout.")
            }

            if customChips.contains("rush-hour-buffer"), let idx = steps.firstIndex(where: { $0.id == "gate-security" }) {
                steps[idx].title = isFr ? "Arrivée Portillon avec Marge Heure de Pointe (\(localizedGate))" : "Arrival with Peak Rush Buffer (\(localizedGate))"
                steps[idx].description = isFr ? "Franchissement sécurisé avec marge de +12 min pour parer aux goulets d’étranglement urbains." : "Arrival cushion with +12 min buffer factoring bridge bottlenecks and urban traffic."
            }

            if customChips.contains("cargo-laptop-pack"), let idx = steps.firstIndex(where: { $0.id == "garage-rollout" }) {
                steps[idx].description += isFr ? " Ordinateur portable 15\" rangé dans la sacoche étanche IPX6." : " 15\" Work laptop secured in IPX6 waterproof pannier."
            }
        }

        let isMultiDayTour = physicsSpeedOverride?.isMultiDayTour ?? false
        let enableSavory = riderSpecs.enableSavoryPalateResets ?? true

        if isMultiDayTour {
            let savoryCount = physicsSpeedOverride?.savoryResetCount ?? ((enableSavory && totalRideMinutes >= 150) ? (totalRideMinutes / 90) : 0)
            if savoryCount > 0 && totalRideMinutes >= 150 {
                var m = 90
                while m <= totalRideMinutes - 10 {
                    steps.append(TimelineStep(
                        id: "savory-palate-reset-\(m)",
                        time: addMinutesToTime(hardDepartureTime, m),
                        title: isFr ? "Pause salée (T + \(m) min)" : "Savory palate reset (T + \(m) min)",
                        location: isFr ? "En selle" : "On-bike",
                        category: "nutrition",
                        isCrucialCheckpoint: false,
                        description: isFr ? "Pause salée : Alternez le sucré avec une collation salée + gorgée d’eau pure" : "Savory palate reset: Swap sweet fuel for salted snack + plain water sip",
                        iconName: "Utensils"
                    ))
                    m += 90
                }
            }
        } else {
            var m = 45
            while m <= totalRideMinutes - 10 {
                steps.append(TimelineStep(
                    id: "carb-intake-\(m)",
                    time: addMinutesToTime(hardDepartureTime, m),
                    title: isFr ? "Apport glucides (T + \(m) min)" : "Carb Intake (T + \(m) min)",
                    location: isFr ? "En selle" : "On-bike",
                    category: "nutrition",
                    isCrucialCheckpoint: false,
                    description: isFr ? "Rappel ravitaillement : prenez une portion de glucides + gorgée d’eau" : "Carb intake reminder: take a carbohydrate serving + sip of water",
                    iconName: "Zap"
                ))
                m += 45
            }
        }

        let rawLongStopMin = max(0, JSCompat.jsRoundInt(physicsSpeedOverride?.logistics?.plannedLongStopMin ?? 0))
        let longStopMin = StationaryRecoveryEngine.resolveEffectiveRestStopMinutes(requestedMinutes: Double(rawLongStopMin), rule: recoveryRule)
        if longStopMin > 0 {
            let trimmedLabel = physicsSpeedOverride?.logistics?.plannedLongStopLabel?.trimmingCharacters(in: .whitespaces)
            let longStopLabel = (trimmedLabel?.isEmpty == false) ? trimmedLabel! : (isFr ? "Pause longue & récupération" : "Planned recovery stop")
            let midKm = JSCompat.jsRoundInt(route.distanceKm * 0.5)
            steps.append(TimelineStep(
                id: "planned-long-stop",
                time: addMinutesToTime(hardDepartureTime, max(10, JSCompat.jsRoundInt(Double(totalRideMinutes) * 0.5))),
                formattedDuration: "\(longStopMin) min",
                title: "\(longStopLabel) (\(longStopMin) min)",
                location: midKm > 0 ? (isFr ? "Mi-parcours · km \(midKm)" : "Mid-route · km \(midKm)") : (isFr ? "Mi-parcours" : "Mid-route"),
                category: "nutrition",
                isCrucialCheckpoint: true,
                description: recoveryRule.isRestricted
                    ? (isFr ? "Pause express limitée à \(longStopMin) min max (départ hivernal avant l’aube) pour maintenir la température corporelle." : "Quick stop capped at \(longStopMin) min max (pre-dawn winter rule) to prevent core temperature drop.")
                    : (isFr ? "Pause planifiée de \(longStopMin) min pour récupérer, manger du solide et recharger les bidons." : "Scheduled \(longStopMin)-min break to stretch, eat real food, and refill bottles."),
                iconName: "Coffee"
            ))
        }

        let intermediateStops = buildIntermediateStopSteps(
            route: route,
            pinnedAmenities: physicsSpeedOverride?.pinnedAmenities ?? [],
            hardDepartureTime: hardDepartureTime,
            totalRideMinutes: totalRideMinutes,
            isFr: isFr,
            departureDate: physicsSpeedOverride?.departureDate
        )
        steps.append(contentsOf: intermediateStops)

        let anchorMinutes = parseHHMM(wakeUpTime)
        func sortRank(_ id: String) -> Int {
            if rolloutPriorityIds.contains(id) { return -1 }
            if arrivalPriorityIds.contains(id) { return 1 }
            if postArrivalPriorityIds.contains(id) { return 2 }
            return 0
        }
        steps.sort { a, b in
            let relA = JSCompat.posMod(parseHHMM(a.time) - anchorMinutes, 1440)
            let relB = JSCompat.posMod(parseHHMM(b.time) - anchorMinutes, 1440)
            if relA != relB { return relA < relB }
            return sortRank(a.id) < sortRank(b.id)
        }

        let totalDoorToDeskMinutes = 60 + totalRideMinutes + routeBuffer + arrivalBuffer + extraBufferMinutes + postGateOfficeMinutes

        return ReverseTimelineCalculation(
            shiftStartTime: resolvedShiftStartTime,
            gateArrivalTime: targetArrival,
            hardDepartureTime: hardDepartureTime,
            preRideMealTime: preRideMealTime,
            wakeUpTime: wakeUpTime,
            totalDoorToDeskMinutes: totalDoorToDeskMinutes,
            pureMovingMinutes: actualMovingMinutes,
            bufferMinutes: routeBuffer + arrivalBuffer + extraBufferMinutes,
            steps: steps,
            weatherHeadwindImpactMinutes: weatherHeadwindImpactMinutes,
            severeHeadwindWarning: severeHeadwindWarning,
            stationaryRecoveryRule: recoveryRule
        )
    }

    private static func jsNumberStr(_ v: Double) -> String {
        v == v.rounded() ? String(Int(v)) : String(v)
    }

    private static func formatFuelTarget(carbGPerHr: Int, mode: TelemetryMode, lang: CadenceLang) -> String {
        let isFr = lang == .fr
        switch mode {
        case .fuelFirst:
            let units = max(1, JSCompat.jsRoundInt(Double(carbGPerHr) / 20.0))
            return isFr ? "\(units) \(units > 1 ? "unités de ravito" : "unité de ravito")" : "\(units) fuel unit\(units > 1 ? "s" : "")"
        case .intuitive:
            return isFr ? "Rythme de ravito régulier" : "Steady fueling rhythm"
        case .quantitative:
            return isFr ? "\(carbGPerHr)g glucides" : "\(carbGPerHr)g carbs"
        }
    }
}
