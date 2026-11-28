import Foundation

public struct StationaryRecoveryRule: Codable, Sendable, Equatable {
    public var isRestricted: Bool
    public var maxRestMinutes: Int?
    public var disableLunchBreak: Bool
    public var isWinter: Bool
    public var isBeforeDawn: Bool
    public var civilDawnHHMM: String
    public var rolloutHHMM: String

    public init(
        isRestricted: Bool,
        maxRestMinutes: Int?,
        disableLunchBreak: Bool,
        isWinter: Bool,
        isBeforeDawn: Bool,
        civilDawnHHMM: String,
        rolloutHHMM: String
    ) {
        self.isRestricted = isRestricted
        self.maxRestMinutes = maxRestMinutes
        self.disableLunchBreak = disableLunchBreak
        self.isWinter = isWinter
        self.isBeforeDawn = isBeforeDawn
        self.civilDawnHHMM = civilDawnHHMM
        self.rolloutHHMM = rolloutHHMM
    }
}

public enum StationaryRecoveryEngine {
    public static let preDawnWinterMaxRestMin = 5
    public static let lunchBreakMinDuration = 30

    public static func getStationaryRecoveryRule(
        rolloutTimeHHMM: String,
        departureDate: String? = nil,
        coordinates: LatLon? = nil,
        now: Date = Date()
    ) -> StationaryRecoveryRule {
        let dateStr: String
        if let dep = departureDate, !dep.isEmpty {
            dateStr = dep
        } else {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withFullDate]
            dateStr = formatter.string(from: now)
        }

        let parts = dateStr.split(separator: "-").compactMap { Int($0) }
        let monthNum = parts.count >= 2 ? parts[1] : 1
        let isWinter = monthNum == 11 || monthNum == 12 || monthNum == 1 || monthNum == 2

        let coords = coordinates ?? LatLon(lat: 47.2184, lon: -1.5536)
        let solar = SolarVisibilityEngine.getSolarEphemeris(
            lat: coords.lat,
            lon: coords.lon,
            dateStr: dateStr
        )

        let civilDawnMin = SolarVisibilityEngine.hhmmToMinutes(solar.civilDawn)
        let rolloutHHMM = rolloutTimeHHMM.isEmpty ? "07:15" : rolloutTimeHHMM
        let rolloutMin = SolarVisibilityEngine.hhmmToMinutes(rolloutHHMM)
        let isBeforeDawn = rolloutMin < max(civilDawnMin, 7 * 60)
        let isRestricted = isWinter && isBeforeDawn

        return StationaryRecoveryRule(
            isRestricted: isRestricted,
            maxRestMinutes: isRestricted ? preDawnWinterMaxRestMin : nil,
            disableLunchBreak: isRestricted,
            isWinter: isWinter,
            isBeforeDawn: isBeforeDawn,
            civilDawnHHMM: solar.civilDawn,
            rolloutHHMM: rolloutTimeHHMM
        )
    }

    public static func estimateTripRolloutTimeHHMM(_ trip: TripProfile) -> String {
        if trip.arriveAtMode == false, let dep = trip.departureTime, !dep.isEmpty {
            return dep
        }

        let tagUpper = trip.tag.uppercased()
        let isSport = tagUpper.contains("SPORT") || tagUpper.contains("FONDO") || tagUpper.contains("TEMPO")
        let isBikepacking = tagUpper.contains("BIKEPACK") || tagUpper.contains("BIVOUAC")
        let isEscapade = !isSport && !isBikepacking && (
            tagUpper.contains("ESCAPADE") ||
            tagUpper.contains("TOURING") ||
            tagUpper.contains("LEISURE") ||
            tagUpper.contains("WEEKEND")
        )

        let defaultAnchor = isSport ? "11:00" : (isBikepacking ? "18:00" : (isEscapade ? "15:00" : "08:30"))
        let anchorHHMM: String
        if !trip.office.targetGateArrivalTime.isEmpty {
            anchorHHMM = trip.office.targetGateArrivalTime
        } else if !trip.office.shiftStartTime.isEmpty {
            anchorHHMM = trip.office.shiftStartTime
        } else if let a = trip.ruleSettings?.anchorTimeHHMM, !a.isEmpty {
            anchorHHMM = a
        } else {
            anchorHHMM = defaultAnchor
        }

        let speed = max(5.0, trip.route.targetSpeedKmH > 0 ? trip.route.targetSpeedKmH : 25.0)
        let distKm = trip.route.distanceKm > 0 ? trip.route.distanceKm : 20.0
        let movingMin = JSCompat.jsRoundInt((distKm / speed) * 60.0)
        let routeBuffer = (isEscapade || isBikepacking) ? 15 : (isSport ? 5 : trip.route.urbanTrafficDelayMinutes)
        let arrivalBuffer = (isEscapade || isBikepacking) ? 10 : (isSport ? 5 : trip.route.gateSecurityDelayMinutes)

        return SolarVisibilityEngine.minutesToHHMM(
            Double(SolarVisibilityEngine.hhmmToMinutes(anchorHHMM)) - (Double(movingMin) + routeBuffer + arrivalBuffer)
        )
    }

    public static func getStationaryRecoveryRuleForTrip(
        _ trip: TripProfile,
        overrideRolloutHHMM: String? = nil,
        now: Date = Date()
    ) -> StationaryRecoveryRule {
        let activeStage: TripStage?
        if let stages = trip.stages, let idx = trip.activeStageIndex, idx >= 0, idx < stages.count {
            activeStage = stages[idx]
        } else {
            activeStage = nil
        }

        let departureDate = activeStage?.departureDate ?? trip.departureDate
        let rolloutTimeHHMM = (overrideRolloutHHMM?.isEmpty == false)
            ? overrideRolloutHHMM!
            : estimateTripRolloutTimeHHMM(trip)

        return getStationaryRecoveryRule(
            rolloutTimeHHMM: rolloutTimeHHMM,
            departureDate: departureDate,
            coordinates: trip.route.coordinates?.first,
            now: now
        )
    }

    public static func resolveEffectiveRestStopMinutes(
        requestedMinutes: Double,
        rule: StationaryRecoveryRule
    ) -> Int {
        let clean = max(0, JSCompat.jsRoundInt(requestedMinutes.isFinite ? requestedMinutes : 0.0))
        if !rule.isRestricted { return clean }
        if clean >= lunchBreakMinDuration { return 0 }
        return min(preDawnWinterMaxRestMin, clean)
    }

    public static func getPlannedRestStopMinutes(_ trip: TripProfile, now: Date = Date()) -> Int {
        let ruleSettings = trip.ruleSettings
        let chips = trip.customChips ?? []
        let recoveryRule = getStationaryRecoveryRuleForTrip(trip, now: now)
        var rest = resolveEffectiveRestStopMinutes(
            requestedMinutes: ruleSettings?.plannedLongStopMin ?? 0,
            rule: recoveryRule
        )
        if chips.contains("coffee-stop") {
            rest += resolveEffectiveRestStopMinutes(
                requestedMinutes: ruleSettings?.coffeeDurationMin ?? 15,
                rule: recoveryRule
            )
        }
        if chips.contains("picnic-outing") {
            rest += resolveEffectiveRestStopMinutes(
                requestedMinutes: ruleSettings?.picnicDurationMin ?? 45,
                rule: recoveryRule
            )
        }
        return rest
    }
}
