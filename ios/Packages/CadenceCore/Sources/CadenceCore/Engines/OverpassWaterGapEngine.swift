import Foundation

public struct PolylineSnapResult: Codable, Sendable, Equatable {
    public var routeKm: Double
    public var detourMeters: Int
    public var elevationMeters: Int?
    public var nearestIdx: Int

    public init(routeKm: Double, detourMeters: Int, elevationMeters: Int? = nil, nearestIdx: Int) {
        self.routeKm = routeKm
        self.detourMeters = detourMeters
        self.elevationMeters = elevationMeters
        self.nearestIdx = nearestIdx
    }
}

public struct AmenityEtaDetails: Codable, Sendable, Equatable {
    public var etaHHMM: String
    public var dayOffset: Int

    public init(etaHHMM: String, dayOffset: Int) {
        self.etaHHMM = etaHHMM
        self.dayOffset = dayOffset
    }
}

public struct PacingCurvePoint: Codable, Sendable, Equatable {
    public var distKm: Double
    public var elapsedSec: Double

    public init(distKm: Double, elapsedSec: Double) {
        self.distKm = distKm
        self.elapsedSec = elapsedSec
    }
}

public enum OverpassWaterGapEngine {
    public static func haversineDistanceMeters(
        lat1: Double,
        lon1: Double,
        lat2: Double,
        lon2: Double
    ) -> Double {
        let R = 6371000.0
        let dLat = ((lat2 - lat1) * Double.pi) / 180.0
        let dLon = ((lon2 - lon1) * Double.pi) / 180.0
        let a =
            sin(dLat / 2.0) * sin(dLat / 2.0) +
            cos((lat1 * Double.pi) / 180.0) *
            cos((lat2 * Double.pi) / 180.0) *
            sin(dLon / 2.0) *
            sin(dLon / 2.0)
        let c = 2.0 * atan2(sqrt(a), sqrt(1.0 - a))
        return R * c
    }

    public static func computeCumulativeDistances(_ coordinates: [LatLon]) -> [Double] {
        if coordinates.isEmpty { return [] }
        var cumDistancesMeters: [Double] = [0.0]
        cumDistancesMeters.reserveCapacity(coordinates.count)
        for i in 1..<coordinates.count {
            let prev = coordinates[i - 1]
            let curr = coordinates[i]
            let segDist = haversineDistanceMeters(lat1: prev.lat, lon1: prev.lon, lat2: curr.lat, lon2: curr.lon)
            cumDistancesMeters.append(cumDistancesMeters[i - 1] + segDist)
        }
        return cumDistancesMeters
    }

    public static func snapToPolyline(
        lat: Double,
        lon: Double,
        coordinates: [LatLon],
        cumDistancesMeters: [Double],
        elevationProfile: [ElevationProfilePoint]? = nil
    ) -> PolylineSnapResult {
        var minDetour = Double.infinity
        var nearestIdx = 0

        for i in 0..<coordinates.count {
            let dist = haversineDistanceMeters(lat1: lat, lon1: lon, lat2: coordinates[i].lat, lon2: coordinates[i].lon)
            if dist < minDetour {
                minDetour = dist
                nearestIdx = i
            }
        }

        let snappedMeters = nearestIdx < cumDistancesMeters.count ? cumDistancesMeters[nearestIdx] : 0.0
        let routeKm = JSCompat.roundTo(snappedMeters / 1000.0, decimals: 1)
        let detourMeters = JSCompat.jsRoundInt(minDetour)

        var elevationMeters: Int? = nil
        if let profile = elevationProfile, !profile.isEmpty {
            var bestElevDiff = Double.infinity
            for pt in profile {
                let diff = abs(pt.distKm - routeKm)
                if diff < bestElevDiff {
                    bestElevDiff = diff
                    elevationMeters = JSCompat.jsRoundInt(pt.eleM)
                }
            }
        }

        return PolylineSnapResult(
            routeKm: routeKm,
            detourMeters: detourMeters,
            elevationMeters: elevationMeters,
            nearestIdx: nearestIdx
        )
    }

    public static func calculateAmenityEtaDetails(
        departureTime: String = "08:00",
        routeKm: Double,
        effectiveSpeedKmH: Double = 24.0,
        pacingCurve: [PacingCurvePoint]? = nil
    ) -> AmenityEtaDetails {
        let parts = departureTime.split(separator: ":")
        let parsedH = parts.count > 0 ? Int(parts[0]) : nil
        let parsedM = parts.count > 1 ? Int(parts[1]) : nil
        let depH = parsedH ?? 8
        let depM = parsedM ?? 0
        let depMinutes = depH * 60 + depM

        let rideMinutes: Int
        if let curve = pacingCurve, curve.count >= 2 {
            var elapsedSec = curve[curve.count - 1].elapsedSec
            if routeKm <= curve[0].distKm {
                elapsedSec = curve[0].elapsedSec
            } else {
                for i in 1..<curve.count {
                    if curve[i].distKm >= routeKm {
                        let a = curve[i - 1]
                        let b = curve[i]
                        let span = b.distKm - a.distKm
                        let ratio = span > 0 ? (routeKm - a.distKm) / span : 0.0
                        elapsedSec = a.elapsedSec + ratio * (b.elapsedSec - a.elapsedSec)
                        break
                    }
                }
            }
            rideMinutes = JSCompat.jsRoundInt(elapsedSec / 60.0)
        } else {
            let speed = max(10.0, effectiveSpeedKmH)
            rideMinutes = JSCompat.jsRoundInt((routeKm / speed) * 60.0)
        }

        let rawTotal = depMinutes + rideMinutes
        let dayOffset = Int(floor(Double(rawTotal) / 1440.0))
        let totalMin = JSCompat.posMod(rawTotal, 1440)
        let etaH = totalMin / 60
        let etaM = totalMin % 60
        let etaHHMM = String(format: "%02d:%02d", etaH, etaM)
        return AmenityEtaDetails(etaHHMM: etaHHMM, dayOffset: dayOffset)
    }

    public static func calculateAmenityEta(
        departureTime: String = "08:00",
        routeKm: Double,
        effectiveSpeedKmH: Double = 24.0
    ) -> String {
        calculateAmenityEtaDetails(
            departureTime: departureTime,
            routeKm: routeKm,
            effectiveSpeedKmH: effectiveSpeedKmH
        ).etaHHMM
    }

    public static func estimateAmenityDetourKm(_ detourMeters: Double) -> Double {
        if !detourMeters.isFinite || detourMeters < 25.0 {
            return 0.0
        }
        return max(0.1, JSCompat.roundTo((detourMeters * 2.0) / 1000.0, decimals: 1))
    }

    public static func formatAmenityCategoryLabel(
        _ category: AmenityCategory,
        lang: CadenceLang = .en
    ) -> String {
        let isFr = lang == .fr
        switch category {
        case .water:
            return isFr ? "Point d'eau" : "Water"
        case .cemetery:
            return isFr ? "Cimetière (Eau)" : "Cemetery Water"
        case .food:
            return isFr ? "Ravitaillement" : "Food"
        case .mechanix:
            return isFr ? "Atelier / Abri" : "Repair / Shelter"
        case .essentials:
            return isFr ? "WC / Pharm. / Station" : "Toilet / Fuel / Med"
        case .bailout:
            return isFr ? "Gare (Repli)" : "Train Bailout"
        }
    }

    public static func resnapAmenitiesToRoute(
        _ amenities: [StageAmenity],
        coordinates: [LatLon],
        elevationProfile: [ElevationProfilePoint]? = nil
    ) -> [StageAmenity] {
        if coordinates.count < 2 || amenities.isEmpty {
            return amenities
        }
        let cumDistancesMeters = computeCumulativeDistances(coordinates)
        return amenities.map { item in
            let snapped = snapToPolyline(
                lat: item.lat,
                lon: item.lon,
                coordinates: coordinates,
                cumDistancesMeters: cumDistancesMeters,
                elevationProfile: elevationProfile
            )
            var copy = item
            copy.routeKm = snapped.routeKm
            copy.detourMeters = Double(snapped.detourMeters)
            copy.elevationMeters = snapped.elevationMeters.map(Double.init) ?? item.elevationMeters
            return copy
        }.sorted { $0.routeKm < $1.routeKm }
    }

    public struct WaterGapsOptions: Sendable {
        public var sectorSpeedKmH: Double?
        public var targetFluidMlPerHr: Double?
        public var bidonSizeMl: Double?
        public var frameBottleSlots: Int?
        public var cautionThresholdKm: Double?
        public var criticalThresholdKm: Double?

        public init(
            sectorSpeedKmH: Double? = nil,
            targetFluidMlPerHr: Double? = nil,
            bidonSizeMl: Double? = nil,
            frameBottleSlots: Int? = nil,
            cautionThresholdKm: Double? = nil,
            criticalThresholdKm: Double? = nil
        ) {
            self.sectorSpeedKmH = sectorSpeedKmH
            self.targetFluidMlPerHr = targetFluidMlPerHr
            self.bidonSizeMl = bidonSizeMl
            self.frameBottleSlots = frameBottleSlots
            self.cautionThresholdKm = cautionThresholdKm
            self.criticalThresholdKm = criticalThresholdKm
        }
    }

    public static func calculateWaterGaps(
        amenities: [StageAmenity],
        totalDistanceKm: Double,
        options: WaterGapsOptions? = nil,
        legacyCautionThresholdKm: Double? = nil,
        legacyCriticalThresholdKm: Double? = nil,
        legacyBidonSizeMl: Double? = nil
    ) -> WaterGapsSummary {
        let isOptionsMode = options != nil
        let opts = options ?? WaterGapsOptions()

        let sectorSpeedKmH = max(8.0, opts.sectorSpeedKmH ?? 25.0)
        let targetFluidMlPerHr = max(100.0, opts.targetFluidMlPerHr ?? 500.0)
        let bidonSizeMl = opts.bidonSizeMl ?? legacyBidonSizeMl ?? 650.0
        let frameBottleSlots = max(1, opts.frameBottleSlots ?? 2)
        let cautionThresholdKm = legacyCautionThresholdKm ?? opts.cautionThresholdKm ?? 35.0
        let criticalThresholdKm = legacyCriticalThresholdKm ?? opts.criticalThresholdKm ?? 50.0

        let waterStops = amenities
            .filter { $0.category == .water || $0.category == .cemetery }
            .map(\.routeKm)
            .sorted()

        let checkMarks = [0.0] + waterStops + [max(totalDistanceKm, 0.0)]
        var uniqueMarks: [Double] = []
        for mark in checkMarks {
            let rounded = JSCompat.roundTo(mark, decimals: 1)
            if uniqueMarks.isEmpty || rounded > uniqueMarks[uniqueMarks.count - 1] + 0.1 {
                uniqueMarks.append(rounded)
            }
        }

        var gaps: [WaterGapAlert] = []
        var maxGapKm = 0.0

        if uniqueMarks.count >= 2 {
            for i in 0..<(uniqueMarks.count - 1) {
                let startKm = uniqueMarks[i]
                let endKm = uniqueMarks[i + 1]
                let distKm = JSCompat.roundTo(endKm - startKm, decimals: 1)
                if distKm > maxGapKm { maxGapKm = distKm }

                let gapHours = distKm / sectorSpeedKmH
                let gapFluidNeedMl = JSCompat.jsRoundInt(gapHours * targetFluidMlPerHr)
                let onboardCapacityMl = Double(frameBottleSlots) * bidonSizeMl
                let depletionPct = JSCompat.jsRoundInt((Double(gapFluidNeedMl) / onboardCapacityMl) * 100.0)
                let recommendedBidonsForGap = max(1, Int(ceil(Double(gapFluidNeedMl) / bidonSizeMl)))
                let extraPackableBidons = max(0, recommendedBidonsForGap - frameBottleSlots)

                let legacyCritical = !isOptionsMode && distKm > criticalThresholdKm
                let legacyCaution = !isOptionsMode && distKm >= cautionThresholdKm

                let severity: WaterGapSeverity
                if Double(depletionPct) > 100 || distKm > 60 || legacyCritical {
                    severity = .critical
                } else if Double(depletionPct) >= 65 || legacyCaution {
                    severity = .caution
                } else {
                    severity = .clear
                }

                gaps.append(WaterGapAlert(
                    startKm: startKm,
                    endKm: endKm,
                    distanceKm: distKm,
                    severity: severity,
                    recommendedBidons: recommendedBidonsForGap,
                    recommendedMl: gapFluidNeedMl,
                    gapHours: gapHours,
                    gapFluidNeedMl: gapFluidNeedMl,
                    onboardCapacityMl: Int(onboardCapacityMl),
                    depletionPct: depletionPct,
                    recommendedBidonsForGap: recommendedBidonsForGap,
                    extraPackableBidons: extraPackableBidons
                ))
            }
        }

        let criticalGaps = gaps.filter { $0.severity == .critical }
        let cautionGaps = gaps.filter { $0.severity == .caution }

        let status: WaterGapSeverity
        if !criticalGaps.isEmpty { status = .critical }
        else if !cautionGaps.isEmpty { status = .caution }
        else { status = .clear }

        return WaterGapsSummary(
            status: status,
            maxGapKm: maxGapKm,
            gaps: gaps,
            cautionGaps: cautionGaps,
            criticalGaps: criticalGaps,
            totalWaterPoints: waterStops.count
        )
    }

    private static func shiftIsoDateByDays(_ dateStr: String?, dayOffset: Int) -> String? {
        guard let dateStr = dateStr, dayOffset != 0 else { return dateStr }
        let parts = dateStr.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return dateStr }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(secondsFromGMT: 0)!
        var comps = DateComponents()
        comps.year = parts[0]
        comps.month = parts[1]
        comps.day = parts[2] + dayOffset
        guard let d = cal.date(from: comps) else { return dateStr }
        let c = cal.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    public struct AutoMarkResupplyResult: Codable, Sendable, Equatable {
        public var selectedStops: [StageAmenity]
        public var addedStops: [StageAmenity]
    }

    public static func autoMarkResupplyStops(
        amenities: [StageAmenity],
        totalDistanceKm: Double,
        existingPinned: [StageAmenity] = [],
        departureTime: String = "08:00",
        targetDate: String? = nil,
        effectiveSpeedKmH: Double = 24.0,
        intervalKm: Double = 25.0
    ) -> AutoMarkResupplyResult {
        func isOpenOrUnknown(_ a: StageAmenity) -> Bool {
            guard let oh = a.openingHours, !oh.isEmpty else { return true }
            let details = calculateAmenityEtaDetails(
                departureTime: departureTime,
                routeKm: a.routeKm,
                effectiveSpeedKmH: effectiveSpeedKmH
            )
            let arrivalDate = shiftIsoDateByDays(targetDate, dayOffset: details.dayOffset)
            let verdict = OpeningHoursParser.evaluateOpeningHoursAtArrival(
                openingHours: oh,
                targetDateStr: arrivalDate,
                arrivalTimeHHMM: details.etaHHMM,
                lang: .en,
                timeZone: TimeZone(identifier: "Europe/Paris") ?? .current
            )
            return verdict?.status != .closed
        }

        var existingIds = Set(existingPinned.map(\.id))
        var merged = existingPinned
        var added: [StageAmenity] = []

        func addStop(_ stop: StageAmenity?) {
            guard let stop = stop, !existingIds.contains(stop.id) else { return }
            existingIds.insert(stop.id)
            var marked = stop
            marked.isPinned = true
            merged.append(marked)
            added.append(marked)
        }

        let bucketSize = max(12.0, intervalKm)
        let startEdgeKm = min(4.0, totalDistanceKm * 0.12)
        let endEdgeKm = max(startEdgeKm + 2.0, totalDistanceKm - min(4.0, totalDistanceKm * 0.12))

        var targetKm = bucketSize
        while targetKm < totalDistanceKm {
            let winStart = max(startEdgeKm, targetKm - bucketSize * 0.45)
            let winEnd = min(endEdgeKm, targetKm + bucketSize * 0.45)
            if winEnd > winStart {
                let alreadyHasWater = merged.contains { p in
                    (p.category == .water || p.category == .cemetery) && p.routeKm >= winStart && p.routeKm <= winEnd
                }
                if !alreadyHasWater {
                    let waterCandidates = amenities
                        .filter { a in
                            (a.category == .water || a.category == .cemetery) &&
                            a.routeKm >= winStart &&
                            a.routeKm <= winEnd &&
                            isOpenOrUnknown(a)
                        }
                        .sorted { a, b in
                            let rankA = a.category == .water ? 0 : 1
                            let rankB = b.category == .water ? 0 : 1
                            if rankA != rankB { return rankA < rankB }
                            return a.detourMeters < b.detourMeters
                        }
                    if let best = waterCandidates.first {
                        addStop(best)
                    }
                }
            }
            targetKm += bucketSize
        }

        let hasFoodPinned = merged.contains { $0.category == .food }
        if !hasFoodPinned && totalDistanceKm >= 18.0 {
            let midStart = totalDistanceKm * 0.22
            let midEnd = totalDistanceKm * 0.78
            let midTarget = totalDistanceKm * 0.5
            let midFoodCandidates = amenities
                .filter { $0.category == .food && $0.routeKm >= midStart && $0.routeKm <= midEnd && isOpenOrUnknown($0) }
                .sorted { a, b in
                    let scoreA = abs(a.routeKm - midTarget) * 150.0 + Double(a.detourMeters)
                    let scoreB = abs(b.routeKm - midTarget) * 150.0 + Double(b.detourMeters)
                    return scoreA < scoreB
                }
            if let best = midFoodCandidates.first {
                addStop(best)
            } else {
                let anyOpenFood = amenities
                    .filter { $0.category == .food && isOpenOrUnknown($0) }
                    .sorted { a, b in
                        let scoreA = abs(a.routeKm - midTarget) * 150.0 + Double(a.detourMeters)
                        let scoreB = abs(b.routeKm - midTarget) * 150.0 + Double(b.detourMeters)
                        return scoreA < scoreB
                    }
                if let best = anyOpenFood.first {
                    addStop(best)
                }
            }
        }

        if added.isEmpty && !amenities.isEmpty {
            let fallbackPool = amenities
                .filter { ($0.category == .water || $0.category == .cemetery || $0.category == .food) && isOpenOrUnknown($0) }
                .sorted { $0.detourMeters < $1.detourMeters }
            if let best = fallbackPool.first {
                addStop(best)
            }
        }

        merged.sort { $0.routeKm < $1.routeKm }
        return AutoMarkResupplyResult(selectedStops: merged, addedStops: added)
    }
}
