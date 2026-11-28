import Foundation

public enum TcxPointType: String, Codable, Sendable, CaseIterable, Equatable {
    case water = "Water"
    case food = "Food"
    case firstAid = "First Aid"
    case left = "Left"
    case right = "Right"
    case straight = "Straight"
    case generic = "Generic"
    case horsCategory = "Hors Category"
    case firstCategory = "1st Category"
    case secondCategory = "2nd Category"
    case thirdCategory = "3rd Category"
    case fourthCategory = "4th Category"
}

public struct OsrmManeuver: Codable, Sendable, Equatable {
    public var type: String?
    public var modifier: String?
    public var location: [Double]?

    public init(type: String? = nil, modifier: String? = nil, location: [Double]? = nil) {
        self.type = type
        self.modifier = modifier
        self.location = location
    }
}

public struct OsrmRouteStep: Codable, Sendable, Equatable {
    public var distance: Double?
    public var name: String?
    public var maneuver: OsrmManeuver?

    public init(distance: Double? = nil, name: String? = nil, maneuver: OsrmManeuver? = nil) {
        self.distance = distance
        self.name = name
        self.maneuver = maneuver
    }
}

public struct OsrmRouteLeg: Codable, Sendable, Equatable {
    public var steps: [OsrmRouteStep]?

    public init(steps: [OsrmRouteStep]? = nil) {
        self.steps = steps
    }
}

public struct CueSheetEntry: Codable, Sendable, Equatable {
    public var lat: Double
    public var lng: Double
    public var distKm: Double
    public var instruction: String
    public var direction: RouteCueDirection
    public var streetName: String?
    public var shortName: String
    public var cmt: String
    public var desc: String
    public var sym: String
    public var typeLabel: String
    public var tcxPointType: TcxPointType
    public var amenity: StageAmenity?

    public init(
        lat: Double,
        lng: Double,
        distKm: Double,
        instruction: String,
        direction: RouteCueDirection,
        streetName: String? = nil,
        shortName: String,
        cmt: String,
        desc: String,
        sym: String,
        typeLabel: String,
        tcxPointType: TcxPointType,
        amenity: StageAmenity? = nil
    ) {
        self.lat = lat
        self.lng = lng
        self.distKm = distKm
        self.instruction = instruction
        self.direction = direction
        self.streetName = streetName
        self.shortName = shortName
        self.cmt = cmt
        self.desc = desc
        self.sym = sym
        self.typeLabel = typeLabel
        self.tcxPointType = tcxPointType
        self.amenity = amenity
    }
}

public enum CueSheetEngine {
    private static func jsNum(_ value: Double) -> String {
        guard value.isFinite else { return "0" }
        let safe = value == 0 ? 0.0 : value
        if safe.truncatingRemainder(dividingBy: 1) == 0, abs(safe) < 9_007_199_254_740_992 {
            return String(Int64(safe))
        }
        return String(safe)
    }

    public static func estimateAmenityDetourKm(_ detourMeters: Double) -> Double {
        OverpassWaterGapEngine.estimateAmenityDetourKm(detourMeters)
    }

    public static func formatAmenityCategoryLabel(
        _ category: AmenityCategory,
        lang: CadenceLang = .en
    ) -> String {
        OverpassWaterGapEngine.formatAmenityCategoryLabel(category, lang: lang)
    }

    public static func getAmenityGpxSymbol(_ category: AmenityCategory) -> String {
        switch category {
        case .water, .cemetery:
            return "Drinking Water"
        case .food:
            return "Restaurant"
        case .mechanix:
            return "Repair Service"
        case .essentials:
            return "Restroom"
        case .bailout:
            return "Crossing"
        }
    }

    public static func getAmenityTcxPointType(_ category: AmenityCategory) -> TcxPointType {
        switch category {
        case .water, .cemetery:
            return .water
        case .food:
            return .food
        case .mechanix, .essentials:
            return .firstAid
        case .bailout:
            return .generic
        }
    }

    public static func getCueDirectionTcxPointType(_ direction: RouteCueDirection) -> TcxPointType {
        switch direction {
        case .left, .slightLeft, .sharpLeft:
            return .left
        case .right, .slightRight, .sharpRight:
            return .right
        case .straight:
            return .straight
        default:
            return .generic
        }
    }

    private static func mapOsrmModifierToDirection(
        type: String,
        modifier: String?
    ) -> RouteCueDirection {
        if type == "depart" { return .depart }
        if type == "arrive" { return .arrive }
        if type == "roundabout" || type == "rotary" { return .roundabout }

        switch modifier {
        case "left":
            return .left
        case "slight left":
            return .slightLeft
        case "sharp left":
            return .sharpLeft
        case "right":
            return .right
        case "slight right":
            return .slightRight
        case "sharp right":
            return .sharpRight
        case "straight":
            return .straight
        default:
            return .straight
        }
    }

    private static func buildOsrmInstruction(
        type: String,
        modifier: String?,
        streetName: String?
    ) -> String {
        let trimmedStreet = streetName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let road = trimmedStreet.isEmpty ? "" : " onto \(trimmedStreet)"
        if type == "depart" {
            return trimmedStreet.isEmpty ? "Depart" : "Depart on \(trimmedStreet)"
        }
        if type == "arrive" {
            return "Arrive at destination"
        }
        if type == "roundabout" || type == "rotary" {
            return "Enter roundabout\(road)"
        }

        let actionMap: [String: String] = [
            "left": "Turn left",
            "slight left": "Keep left",
            "sharp left": "Sharp left",
            "right": "Turn right",
            "slight right": "Keep right",
            "sharp right": "Sharp right",
            "straight": "Continue straight",
            "uturn": "Make a U-turn",
        ]

        if type == "fork" {
            let forkSide = (modifier?.contains("left") == true) ? "left" : "right"
            return "Take \(forkSide) fork\(road)"
        }

        let verb = modifier.flatMap { actionMap[$0] } ?? "Continue"
        return "\(verb)\(road)"
    }

    public static func parseOsrmRouteSteps(_ legs: [OsrmRouteLeg]) -> [RouteCueStep] {
        if legs.isEmpty { return [] }

        var steps: [RouteCueStep] = []
        var runningMeters = 0.0

        for (legIdx, leg) in legs.enumerated() {
            let rawSteps = leg.steps ?? []
            for step in rawSteps {
                let maneuver = step.maneuver
                guard let loc = maneuver?.location, loc.count >= 2 else {
                    runningMeters += step.distance ?? 0
                    continue
                }

                let type = (maneuver?.type?.isEmpty == false) ? maneuver!.type! : "continue"
                let modifier = maneuver?.modifier
                let streetName = (step.name ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                let distKm = JSCompat.roundTo(runningMeters / 1000.0, decimals: 1)

                let isFirstDepart = legIdx == 0 && type == "depart"
                let isFinalArrive = legIdx == legs.count - 1 && type == "arrive"
                let isIntermediateStop = legIdx > 0 && type == "depart"

                if type == "arrive" && !isFinalArrive {
                    runningMeters += step.distance ?? 0
                    continue
                }

                let isTrivialContinue =
                    (type == "continue" || type == "new name") &&
                    (modifier == nil || modifier == "straight") &&
                    streetName.isEmpty

                if !isTrivialContinue || isFirstDepart || isFinalArrive || isIntermediateStop {
                    let direction = isIntermediateStop
                        ? RouteCueDirection.waypoint
                        : mapOsrmModifierToDirection(type: type, modifier: modifier)
                    let instruction = isIntermediateStop
                        ? "Continue past intermediate stop\(streetName.isEmpty ? "" : " onto \(streetName)")"
                        : buildOsrmInstruction(type: type, modifier: modifier, streetName: streetName)

                    steps.append(RouteCueStep(
                        lat: JSCompat.jsToFixedNumber(loc[1], decimals: 6),
                        lng: JSCompat.jsToFixedNumber(loc[0], decimals: 6),
                        distKm: distKm,
                        instruction: instruction,
                        direction: direction,
                        streetName: streetName.isEmpty ? nil : streetName
                    ))
                }

                runningMeters += step.distance ?? 0
            }
        }

        return steps
    }

    private static func initialBearingDeg(
        lat1: Double,
        lon1: Double,
        lat2: Double,
        lon2: Double
    ) -> Double {
        let phi1 = JSCompat.toRad(lat1)
        let phi2 = JSCompat.toRad(lat2)
        let dLon = JSCompat.toRad(lon2 - lon1)
        let y = sin(dLon) * cos(phi2)
        let x = cos(phi1) * sin(phi2) - sin(phi1) * cos(phi2) * cos(dLon)
        let brng = JSCompat.toDeg(atan2(y, x))
        return JSCompat.posMod(brng + 360.0, 360.0)
    }

    private static func signedBearingDelta(fromDeg: Double, toDeg: Double) -> Double {
        JSCompat.posMod(toDeg - fromDeg + 540.0, 360.0) - 180.0
    }

    public static func synthesizeCueSheetFromCoordinates(
        _ coords: [LatLon],
        totalDistanceKm: Double,
        originLabel: String? = nil,
        destLabel: String? = nil
    ) -> [RouteCueStep] {
        guard coords.count >= 2 else { return [] }

        var cumMeters: [Double] = [0.0]
        cumMeters.reserveCapacity(coords.count)
        var rawTotalMeters = 0.0
        for i in 1..<coords.count {
            rawTotalMeters += OverpassWaterGapEngine.haversineDistanceMeters(
                lat1: coords[i - 1].lat,
                lon1: coords[i - 1].lon,
                lat2: coords[i].lat,
                lon2: coords[i].lon
            )
            cumMeters.append(rawTotalMeters)
        }

        let baseDistKm = totalDistanceKm > 0 ? totalDistanceKm : (rawTotalMeters > 0 ? rawTotalMeters / 1000.0 : 1.0)
        let targetMeters = baseDistKm * 1000.0
        let scale = rawTotalMeters > 10.0 ? targetMeters / rawTotalMeters : 1.0

        let startLabel = (originLabel?.isEmpty == false) ? originLabel! : "Start"
        var steps: [RouteCueStep] = [
            RouteCueStep(
                lat: coords[0].lat,
                lng: coords[0].lon,
                distKm: 0,
                instruction: "Depart \(startLabel)",
                direction: .depart
            ),
        ]

        var lastCueMeters = 0.0
        let minCueSpacingMeters = 250.0

        if coords.count > 2 {
            for i in 1..<(coords.count - 1) {
                let currMeters = cumMeters[i] * scale
                if currMeters - lastCueMeters < minCueSpacingMeters { continue }

                var prevIdx = i - 1
                while prevIdx > 0 && (cumMeters[i] - cumMeters[prevIdx]) < 45.0 {
                    prevIdx -= 1
                }
                var nextIdx = i + 1
                while nextIdx < coords.count - 1 && (cumMeters[nextIdx] - cumMeters[i]) < 45.0 {
                    nextIdx += 1
                }

                let bIn = initialBearingDeg(
                    lat1: coords[prevIdx].lat,
                    lon1: coords[prevIdx].lon,
                    lat2: coords[i].lat,
                    lon2: coords[i].lon
                )
                let bOut = initialBearingDeg(
                    lat1: coords[i].lat,
                    lon1: coords[i].lon,
                    lat2: coords[nextIdx].lat,
                    lon2: coords[nextIdx].lon
                )
                let delta = signedBearingDelta(fromDeg: bIn, toDeg: bOut)
                let absDelta = abs(delta)

                if absDelta >= 35.0 {
                    let direction: RouteCueDirection
                    let instruction: String

                    if delta > 0 {
                        if absDelta >= 115.0 {
                            direction = .sharpRight
                            instruction = "Sharp right"
                        } else if absDelta >= 55.0 {
                            direction = .right
                            instruction = "Turn right"
                        } else {
                            direction = .slightRight
                            instruction = "Keep right"
                        }
                    } else {
                        if absDelta >= 115.0 {
                            direction = .sharpLeft
                            instruction = "Sharp left"
                        } else if absDelta >= 55.0 {
                            direction = .left
                            instruction = "Turn left"
                        } else {
                            direction = .slightLeft
                            instruction = "Keep left"
                        }
                    }

                    steps.append(RouteCueStep(
                        lat: coords[i].lat,
                        lng: coords[i].lon,
                        distKm: JSCompat.roundTo(currMeters / 1000.0, decimals: 1),
                        instruction: instruction,
                        direction: direction
                    ))
                    lastCueMeters = currMeters
                }
            }
        }

        let last = coords[coords.count - 1]
        let endLabel = (destLabel?.isEmpty == false) ? destLabel! : "Finish"
        steps.append(RouteCueStep(
            lat: last.lat,
            lng: last.lon,
            distKm: JSCompat.roundTo(targetMeters / 1000.0, decimals: 1),
            instruction: "Arrive at \(endLabel)",
            direction: .arrive
        ))

        return steps
    }

    public static func formatAmenityCueNote(
        _ amenity: StageAmenity,
        eta: String,
        lang: CadenceLang = .en
    ) -> (cmt: String, desc: String) {
        let isFr = (lang == .fr)
        let catLabel = formatAmenityCategoryLabel(amenity.category, lang: lang)
        let detourKm = estimateAmenityDetourKm(amenity.detourMeters)
        let detourMetersStr = jsNum(amenity.detourMeters)
        let detourText: String
        if amenity.detourMeters < 75.0 {
            detourText = isFr ? "Sur la trace" : "On route"
        } else if detourKm >= 0.1 {
            let kmStr = JSCompat.jsFixed(detourKm, decimals: 1)
            let suffix = isFr ? "+\(kmStr) km détour" : "+\(kmStr) km detour"
            detourText = "+\(detourMetersStr) m (\(suffix))"
        } else {
            detourText = "+\(detourMetersStr) m"
        }

        let hoursPart: String
        if let oh = amenity.openingHours, !oh.isEmpty {
            hoursPart = " · \(isFr ? "Horaires" : "Hours"): \(oh)"
        } else {
            hoursPart = ""
        }

        let routeKmStr = jsNum(amenity.routeKm)
        let cmt = "km \(routeKmStr) · \(isFr ? "Passage" : "Est.") \(eta) · \(detourText)\(hoursPart)"

        let actionHint: String
        if amenity.category == .water || amenity.category == .cemetery {
            actionHint = isFr ? "Remplir les bidons" : "Refill water bottles"
        } else if amenity.category == .food {
            actionHint = isFr ? "Ravitaillement alimentation / eau" : "Resupply food & water"
        } else {
            actionHint = isFr ? "Point mécanique / abri" : "Bike repair / shelter stop"
        }

        let desc = "[\(catLabel)] \(amenity.name) — KM \(routeKmStr) (ETA \(eta)) · \(detourText)\(hoursPart) · Cue: \(actionHint)"
        return (cmt, desc)
    }

    public static func buildStageCueSheet(
        route: RouteParams,
        coords: [LatLon],
        pinnedAmenities: [StageAmenity] = [],
        departureTime: String = "08:00",
        speedKmH: Double? = nil,
        dayPrefix: String? = nil,
        lang: CadenceLang = .en
    ) -> [CueSheetEntry] {
        let resolvedSpeed = speedKmH ?? (route.targetSpeedKmH > 0 ? route.targetSpeedKmH : 24.0)
        let baseTurns: [RouteCueStep]
        if let cueSheet = route.cueSheet, cueSheet.count >= 2 {
            baseTurns = cueSheet
        } else {
            baseTurns = synthesizeCueSheetFromCoordinates(
                coords,
                totalDistanceKm: route.distanceKm > 0 ? route.distanceKm : 30.0,
                originLabel: route.origin,
                destLabel: route.destination
            )
        }

        var entries: [CueSheetEntry] = baseTurns.map { step in
            let distStr = JSCompat.jsFixed(step.distKm, decimals: 1)
            let sym: String
            let typeLabel: String
            switch step.direction {
            case .depart:
                sym = "Flag, Green"
                typeLabel = "Start"
            case .arrive:
                sym = "Flag, Red"
                typeLabel = "Finish"
            default:
                sym = "Waypoint"
                typeLabel = "Cue"
            }
            let shortName = (dayPrefix?.isEmpty == false) ? "\(dayPrefix!) \(step.instruction)" : step.instruction
            return CueSheetEntry(
                lat: step.lat,
                lng: step.lng,
                distKm: step.distKm,
                instruction: step.instruction,
                direction: step.direction,
                streetName: step.streetName,
                shortName: shortName,
                cmt: "KM \(distStr)",
                desc: "\(step.instruction) at KM \(distStr)",
                sym: sym,
                typeLabel: typeLabel,
                tcxPointType: getCueDirectionTcxPointType(step.direction),
                amenity: nil
            )
        }

        for amenity in pinnedAmenities {
            let eta = OverpassWaterGapEngine.calculateAmenityEta(
                departureTime: departureTime,
                routeKm: amenity.routeKm,
                effectiveSpeedKmH: resolvedSpeed
            )
            let (cmt, desc) = formatAmenityCueNote(amenity, eta: eta, lang: lang)
            let catLabel = formatAmenityCategoryLabel(amenity.category, lang: lang)
            let shortName = (dayPrefix?.isEmpty == false) ? "\(dayPrefix!) \(amenity.name)" : amenity.name

            entries.append(CueSheetEntry(
                lat: amenity.lat,
                lng: amenity.lon,
                distKm: amenity.routeKm,
                instruction: "Stop: \(amenity.name) (\(catLabel))",
                direction: .resupply,
                streetName: nil,
                shortName: shortName,
                cmt: cmt,
                desc: desc,
                sym: getAmenityGpxSymbol(amenity.category),
                typeLabel: catLabel,
                tcxPointType: getAmenityTcxPointType(amenity.category),
                amenity: amenity
            ))
        }

        if let waypoints = route.waypoints, !waypoints.isEmpty {
            for (idx, wp) in waypoints.enumerated() {
                guard let wpCoords = wp.coordinates else { continue }
                let matchesPinned = pinnedAmenities.contains { p in
                    wp.sourceAmenityId == p.id ||
                    wp.id == "wp-poi-\(p.id)" ||
                    OverpassWaterGapEngine.haversineDistanceMeters(
                        lat1: p.lat, lon1: p.lon, lat2: wpCoords.lat, lon2: wpCoords.lon
                    ) < 60.0
                }
                if matchesPinned { continue }

                let distKm = wp.distanceFromStartKm ?? 0.0
                let distStr = JSCompat.jsFixed(distKm, decimals: 1)
                let eta = OverpassWaterGapEngine.calculateAmenityEta(
                    departureTime: departureTime,
                    routeKm: distKm,
                    effectiveSpeedKmH: resolvedSpeed
                )
                let shortName = (dayPrefix?.isEmpty == false)
                    ? "\(dayPrefix!) Via \(idx + 1): \(wp.name)"
                    : "Via: \(wp.name)"
                entries.append(CueSheetEntry(
                    lat: wpCoords.lat,
                    lng: wpCoords.lon,
                    distKm: distKm,
                    instruction: "Via \(idx + 1): \(wp.name)",
                    direction: .waypoint,
                    streetName: nil,
                    shortName: shortName,
                    cmt: "KM \(distStr) · ETA \(eta)",
                    desc: "Intermediate stop \(idx + 1): \(wp.name) (KM \(distStr), ETA \(eta))",
                    sym: "Flag, Blue",
                    typeLabel: "Waypoint",
                    tcxPointType: .generic,
                    amenity: nil
                ))
            }
        }

        return entries.sorted { $0.distKm < $1.distKm }
    }
}
