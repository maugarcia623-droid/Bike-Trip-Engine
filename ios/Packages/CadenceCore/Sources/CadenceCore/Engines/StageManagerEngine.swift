import Foundation

public enum StageManagerEngine {
    public static func downsampleCoordinates(_ coords: [LatLon]?, maxPoints: Int = 450) -> [LatLon]? {
        guard let coords = coords else { return nil }
        if coords.count <= maxPoints { return coords }
        if maxPoints <= 0 { return [] }
        if maxPoints == 1 { return [coords[0]] }

        var sampled: [LatLon] = []
        sampled.reserveCapacity(maxPoints)
        let total = coords.count
        for i in 0..<maxPoints {
            let idx = min(total - 1, JSCompat.jsRoundInt(Double(i * (total - 1)) / Double(maxPoints - 1)))
            sampled.append(coords[idx])
        }
        return sampled
    }

    public static func addDaysToIso(_ dateStr: String?, days: Int = 1, now: Date = Date()) -> String {
        if let dateStr = dateStr, dateStr.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil {
            let parts = dateStr.split(separator: "-").compactMap { Int($0) }
            if parts.count == 3 {
                var cal = Calendar(identifier: .gregorian)
                cal.timeZone = TimeZone(secondsFromGMT: 0)!
                var comps = DateComponents()
                comps.year = parts[0]
                comps.month = parts[1]
                comps.day = parts[2] + days
                if let d = cal.date(from: comps) {
                    let c = cal.dateComponents([.year, .month, .day], from: d)
                    return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
                }
            }
        }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(secondsFromGMT: 0)!
        let shifted = cal.date(byAdding: .day, value: days, to: now) ?? now
        let c = cal.dateComponents([.year, .month, .day], from: shifted)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    public static func formatDurationHoursMins(_ totalMinutes: Double) -> String {
        let mins = max(0, JSCompat.jsRoundInt(totalMinutes))
        let h = mins / 60
        let m = mins % 60
        if h == 0 { return "\(m) min" }
        return "\(h) h \(String(format: "%02d", m)) min"
    }

    public static func extractCurrentStage(_ trip: TripProfile, dayNumber: Int, now: Date = Date()) -> TripStage {
        let existingStage = trip.stages?.first(where: { $0.dayNumber == dayNumber }) ?? {
            if let idx = trip.activeStageIndex, let stages = trip.stages, idx >= 0, idx < stages.count {
                return stages[idx]
            }
            return nil
        }()

        let cal = Calendar(identifier: .gregorian)
        let c = cal.dateComponents([.year, .month, .day], from: now)
        let fallbackDate = String(format: "%04d-%02d-%02d", c.year ?? 2026, c.month ?? 1, c.day ?? 1)
        let departureDate = (trip.departureDate?.isEmpty == false) ? trip.departureDate! : (existingStage?.departureDate ?? fallbackDate)
        let departureTime = (trip.departureTime?.isEmpty == false) ? trip.departureTime! : (existingStage?.departureTime ?? "08:00")

        var targetMode = existingStage?.targetMode
        if let arrive = trip.arriveAtMode {
            targetMode = arrive ? "arrive" : "depart"
        }

        let stageId: String
        if let ex = existingStage, ex.dayNumber == dayNumber, !ex.id.isEmpty {
            stageId = ex.id
        } else if let ex = existingStage, !ex.id.isEmpty {
            stageId = ex.id
        } else {
            stageId = "stage-\(dayNumber)-\(Int(now.timeIntervalSince1970 * 1000))"
        }

        var routeCopy = trip.route
        routeCopy.coordinates = downsampleCoordinates(trip.route.coordinates)

        return TripStage(
            id: stageId,
            dayNumber: dayNumber,
            departureDate: departureDate,
            departureTime: departureTime,
            targetMode: targetMode,
            route: routeCopy,
            office: trip.office,
            weather: trip.weather,
            customChips: trip.customChips ?? [],
            accommodationNote: existingStage?.accommodationNote,
            pinnedAmenities: trip.pinnedAmenities ?? existingStage?.pinnedAmenities
        )
    }

    public static func resolveLiveStages(_ trip: TripProfile, now: Date = Date()) -> [TripStage] {
        guard let stages = trip.stages, !stages.isEmpty else {
            return [extractCurrentStage(trip, dayNumber: 1, now: now)]
        }

        let activeIdx = max(0, min(trip.activeStageIndex ?? 0, stages.count - 1))
        return stages.enumerated().map { idx, stage in
            if idx != activeIdx { return stage }
            let live = extractCurrentStage(trip, dayNumber: stage.dayNumber > 0 ? stage.dayNumber : (idx + 1), now: now)
            var updated = live
            if !stage.id.isEmpty { updated.id = stage.id }
            if let coords = trip.route.coordinates {
                updated.route.coordinates = coords
            }
            updated.accommodationNote = stage.accommodationNote ?? live.accommodationNote
            return updated
        }
    }

    public static func isWithinForecastHorizon(_ dateStr: String, now: Date = Date(), timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current) -> Bool {
        guard let target = JSCompat.parseYMDNoon(dateStr, timeZone: timeZone) else { return false }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone
        let nowStart = cal.startOfDay(for: now)
        let targetStart = cal.startOfDay(for: target)
        let days = cal.dateComponents([.day], from: nowStart, to: targetStart).day ?? 999
        return days >= -2 && days <= 14
    }
}
