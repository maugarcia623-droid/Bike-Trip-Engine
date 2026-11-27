import Foundation

public enum StageSliceBalanceMode: String, Codable, Sendable {
    case effort
    case distance
}

public struct FullTourSpine: Codable, Sendable, Equatable {
    public var coordinates: [LatLon]
    public var coordDistKm: [Double]
    public var totalDistanceKm: Double
    public var elevationProfile: [ElevationProfilePoint]
    public var totalElevationGainM: Int
    public var totalElevationLossM: Int
    public var originLabel: String
    public var destLabel: String
    public var initialCutDistancesKm: [Double]?
    public var initialCutLabels: [String]?
    public var initialAccommodationNotes: [String?]?
    public var gpxFileName: String?
}

public struct SlicedStagePreview: Codable, Sendable, Equatable {
    public var dayNumber: Int
    public var startKm: Double
    public var endKm: Double
    public var distanceKm: Double
    public var elevationGainM: Int
    public var elevationLossM: Int
    public var minEleM: Int
    public var maxEleM: Int
    public var coordinates: [LatLon]
    public var elevationProfile: [ElevationProfilePoint]
    public var originCoords: LatLon
    public var destCoords: LatLon
    public var originLabel: String
    public var destLabel: String
    public var departureDate: String
    public var departureTime: String
    public var movingTimeMinutes: Int
    public var movingTimeFormatted: String
    public var estimatedArrivalHHMM: String
    public var sunsetHHMM: String
    public var arrivesAfterSunset: Bool
    public var arrivesNearSunset: Bool
    public var effortEquivalentKm: Double
    public var color: String
    public var accommodationNote: String?
}

public struct SlicePreviewOptions: Sendable {
    public var startDateIso: String
    public var dailyStartTime: String
    public var physics: PhysicsParams
    public var targetSpeedKmH: Double
    public var weather: WeatherCondition
    public var lang: CadenceLang
    public var ftpWatts: Double?
    public var cutLabels: [Int: String]?
    public var originLabelOverride: String?
    public var destLabelOverride: String?
    public var cutAccommodationNotes: [Int: String]?
    public var dailyStopBufferMinutes: Double?

    public init(
        startDateIso: String,
        dailyStartTime: String,
        physics: PhysicsParams,
        targetSpeedKmH: Double,
        weather: WeatherCondition,
        lang: CadenceLang = .en,
        ftpWatts: Double? = nil,
        cutLabels: [Int: String]? = nil,
        originLabelOverride: String? = nil,
        destLabelOverride: String? = nil,
        cutAccommodationNotes: [Int: String]? = nil,
        dailyStopBufferMinutes: Double? = nil
    ) {
        self.startDateIso = startDateIso
        self.dailyStartTime = dailyStartTime
        self.physics = physics
        self.targetSpeedKmH = targetSpeedKmH
        self.weather = weather
        self.lang = lang
        self.ftpWatts = ftpWatts
        self.cutLabels = cutLabels
        self.originLabelOverride = originLabelOverride
        self.destLabelOverride = destLabelOverride
        self.cutAccommodationNotes = cutAccommodationNotes
        self.dailyStopBufferMinutes = dailyStopBufferMinutes
    }
}

public struct NearestDistanceResult: Codable, Sendable, Equatable {
    public var distKm: Double
    public var offRouteKm: Double
    public var coord: LatLon
}

public struct ElevationAtDistanceResult: Codable, Sendable, Equatable {
    public var eleM: Double
    public var gradePct: Double
}

public enum GpxSlicerEngine {
    public static let stageColors: [String] = [
        "#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899",
        "#06B6D4", "#EF4444", "#84CC16", "#F97316", "#6366F1"
    ]

    public static func getStageColor(_ dayIndexZeroBased: Int) -> String {
        let count = stageColors.count
        return stageColors[JSCompat.posMod(dayIndexZeroBased, count)]
    }

    public static func haversineKm(_ lat1: Double, _ lon1: Double, _ lat2: Double, _ lon2: Double) -> Double {
        let R = 6371.0
        let dLat = JSCompat.toRad(lat2 - lat1)
        let dLon = JSCompat.toRad(lon2 - lon1)
        let a = sin(dLat / 2.0) * sin(dLat / 2.0) +
            cos(JSCompat.toRad(lat1)) * cos(JSCompat.toRad(lat2)) *
            sin(dLon / 2.0) * sin(dLon / 2.0)
        let c = 2.0 * atan2(sqrt(a), sqrt(1.0 - a))
        return R * c
    }

    private static func buildNormalizedCoordDistances(_ coords: [LatLon], targetTotalKm: Double) -> [Double] {
        var raw: [Double] = [0.0]
        var sum = 0.0
        for i in 1..<coords.count {
            sum += haversineKm(coords[i - 1].lat, coords[i - 1].lon, coords[i].lat, coords[i].lon)
            raw.append(sum)
        }
        let safeTotal = targetTotalKm > 0.1 ? targetTotalKm : max(0.5, sum)
        if sum <= 0.0001 {
            return coords.indices.map { idx in
                coords.count > 1 ? (Double(idx) / Double(coords.count - 1)) * safeTotal : 0.0
            }
        }
        let scale = safeTotal / sum
        return raw.enumerated().map { idx, d in
            idx == raw.count - 1 ? safeTotal : d * scale
        }
    }

    private static func normalizeElevationProfileToSpan(
        _ profile: [ElevationProfilePoint],
        totalDistanceKm: Double
    ) -> [ElevationProfilePoint] {
        if profile.count < 2 {
            return [
                ElevationProfilePoint(distKm: 0, eleM: 20, gradePct: 0),
                ElevationProfilePoint(distKm: JSCompat.roundTo(totalDistanceKm, decimals: 3), eleM: 20, gradePct: 0)
            ]
        }
        let lastDist = profile[profile.count - 1].distKm
        let scale = lastDist > 0.01 ? totalDistanceKm / lastDist : 1.0
        return profile.enumerated().map { idx, pt in
            var copy = pt
            if idx == 0 {
                copy.distKm = 0
            } else if idx == profile.count - 1 {
                copy.distKm = JSCompat.roundTo(totalDistanceKm, decimals: 3)
            } else {
                copy.distKm = JSCompat.roundTo(pt.distKm * scale, decimals: 3)
            }
            return copy
        }
    }

    private static func measureProfileGainLoss(_ profile: [ElevationProfilePoint]) -> (gainM: Double, lossM: Double) {
        if profile.count < 2 { return (0, 0) }
        var gain = 0.0
        var loss = 0.0
        var anchor = profile[0].eleM
        for i in 1..<profile.count {
            let diff = profile[i].eleM - anchor
            if diff >= 2.0 {
                gain += diff
                anchor = profile[i].eleM
            } else if diff <= -2.0 {
                loss += abs(diff)
                anchor = profile[i].eleM
            }
        }
        if gain == 0 && loss == 0 {
            for i in 1..<profile.count {
                let d = profile[i].eleM - profile[i - 1].eleM
                if d > 0 { gain += d }
                else { loss += abs(d) }
            }
        }
        return (gain, loss)
    }

    public static func extractFullTourSpine(_ trip: TripProfile, now: Date = Date()) -> FullTourSpine? {
        let stages = StageManagerEngine.resolveLiveStages(trip, now: now)
        let routedStages = stages.filter { ($0.route.coordinates?.count ?? 0) >= 2 }
        if routedStages.isEmpty { return nil }

        if routedStages.count == 1 {
            let route = routedStages[0].route
            let coords = route.coordinates!
            let totalDistanceKm = max(0.5, JSCompat.roundTo(route.distanceKm, decimals: 1))
            if totalDistanceKm < 5 { return nil }

            let synth = GpxParserEngine.synthesizeRouteElevationProfile(route)
            let elevationProfile = normalizeElevationProfileToSpan(synth.elevationProfile, totalDistanceKm: totalDistanceKm)
            let measured = measureProfileGainLoss(elevationProfile)
            let totalElevationGainM = (route.elevationGainM != nil && route.elevationGainM! >= 0)
                ? JSCompat.jsRoundInt(route.elevationGainM!)
                : JSCompat.jsRoundInt(measured.gainM)
            let totalElevationLossM = (route.elevationLossM != nil && route.elevationLossM! >= 0)
                ? JSCompat.jsRoundInt(route.elevationLossM!)
                : JSCompat.jsRoundInt(measured.lossM)

            return FullTourSpine(
                coordinates: coords,
                coordDistKm: buildNormalizedCoordDistances(coords, targetTotalKm: totalDistanceKm),
                totalDistanceKm: totalDistanceKm,
                elevationProfile: elevationProfile,
                totalElevationGainM: totalElevationGainM,
                totalElevationLossM: totalElevationLossM,
                originLabel: (route.origin?.isEmpty == false) ? route.origin! : (!trip.name.isEmpty ? trip.name : "Start"),
                destLabel: (route.destination?.isEmpty == false) ? route.destination! : "Finish",
                initialCutDistancesKm: nil,
                initialCutLabels: nil,
                initialAccommodationNotes: nil,
                gpxFileName: route.gpxFileName
            )
        }

        var stitchedCoords: [LatLon] = []
        var stitchedProfile: [ElevationProfilePoint] = []
        var initialCutDistancesKm: [Double] = []
        var initialCutLabels: [String] = []
        var initialAccommodationNotes: [String?] = []

        var cumDistOffset = 0.0
        var totalGainM = 0.0
        var totalLossM = 0.0

        for (s, stage) in routedStages.enumerated() {
            let r = stage.route
            let stageCoords = r.coordinates!
            let stageDistKm = max(0.5, JSCompat.roundTo(r.distanceKm, decimals: 1))
            let stageSynth = GpxParserEngine.synthesizeRouteElevationProfile(r)
            let stageProfile = normalizeElevationProfileToSpan(stageSynth.elevationProfile, totalDistanceKm: stageDistKm)
            let stageMeasured = measureProfileGainLoss(stageProfile)

            totalGainM += (r.elevationGainM != nil && r.elevationGainM! >= 0) ? r.elevationGainM! : stageMeasured.gainM
            totalLossM += (r.elevationLossM != nil && r.elevationLossM! >= 0) ? r.elevationLossM! : stageMeasured.lossM

            for (i, pt) in stageCoords.enumerated() {
                if i == 0, let prev = stitchedCoords.last, haversineKm(prev.lat, prev.lon, pt.lat, pt.lon) < 0.05 {
                    continue
                }
                stitchedCoords.append(pt)
            }

            for (i, pt) in stageProfile.enumerated() {
                if i == 0 && !stitchedProfile.isEmpty { continue }
                var copy = pt
                copy.distKm = JSCompat.roundTo(cumDistOffset + pt.distKm, decimals: 3)
                stitchedProfile.append(copy)
            }

            cumDistOffset += stageDistKm
            initialAccommodationNotes.append(stage.accommodationNote)

            if s < routedStages.count - 1 {
                initialCutDistancesKm.append(JSCompat.roundTo(cumDistOffset, decimals: 1))
                let nextOrigin = routedStages[s + 1].route.origin ?? ""
                let dest = (r.destination?.isEmpty == false) ? r.destination! : nextOrigin
                initialCutLabels.append(dest)
            }
        }

        let totalDistanceKm = max(0.5, JSCompat.roundTo(cumDistOffset, decimals: 1))
        if stitchedCoords.count < 2 || totalDistanceKm < 5 { return nil }

        let firstOrigin = routedStages.first?.route.origin
        let lastDest = routedStages.last?.route.destination

        return FullTourSpine(
            coordinates: stitchedCoords,
            coordDistKm: buildNormalizedCoordDistances(stitchedCoords, targetTotalKm: totalDistanceKm),
            totalDistanceKm: totalDistanceKm,
            elevationProfile: stitchedProfile,
            totalElevationGainM: JSCompat.jsRoundInt(totalGainM),
            totalElevationLossM: JSCompat.jsRoundInt(totalLossM),
            originLabel: (firstOrigin?.isEmpty == false) ? firstOrigin! : (!trip.name.isEmpty ? trip.name : "Start"),
            destLabel: (lastDest?.isEmpty == false) ? lastDest! : "Finish",
            initialCutDistancesKm: initialCutDistancesKm,
            initialCutLabels: initialCutLabels,
            initialAccommodationNotes: initialAccommodationNotes,
            gpxFileName: routedStages.first?.route.gpxFileName ?? trip.route.gpxFileName
        )
    }

    public static func suggestDayCount(totalDistanceKm: Double, totalElevationGainM: Double = 0) -> Int {
        let effortKm = max(0.0, totalDistanceKm) + (max(0.0, totalElevationGainM) / 1000.0) * 25.0
        return max(2, min(10, JSCompat.jsRoundInt(effortKm / 135.0)))
    }

    public static func getMinStageDistanceKm(totalDistanceKm: Double, dayCount: Int) -> Double {
        let safeDays = max(2, dayCount)
        return max(1.0, min(10.0, JSCompat.roundTo(totalDistanceKm / Double(safeDays * 3), decimals: 1)))
    }

    public static func clampAndSortCuts(
        _ cutsKm: [Double],
        totalDistanceKm: Double,
        minStageKm: Double? = nil
    ) -> [Double] {
        let count = cutsKm.count
        if count == 0 { return [] }
        let gap = minStageKm ?? getMinStageDistanceKm(totalDistanceKm: totalDistanceKm, dayCount: count + 1)
        var sorted = cutsKm.sorted()

        for i in 0..<count {
            let lower = i == 0 ? gap : sorted[i - 1] + gap
            let upper = totalDistanceKm - gap * Double(count - i)
            sorted[i] = max(lower, min(upper, sorted[i]))
        }

        for i in stride(from: count - 1, through: 0, by: -1) {
            let upper = i == count - 1 ? totalDistanceKm - gap : sorted[i + 1] - gap
            let lower = gap * Double(i + 1)
            sorted[i] = max(lower, min(upper, sorted[i]))
        }

        return sorted.map { JSCompat.roundTo($0, decimals: 1) }
    }

    public static func moveSingleCut(
        _ cutsKm: [Double],
        cutIndex: Int,
        targetKm: Double,
        totalDistanceKm: Double
    ) -> [Double] {
        if cutIndex < 0 || cutIndex >= cutsKm.count { return cutsKm }
        let gap = getMinStageDistanceKm(totalDistanceKm: totalDistanceKm, dayCount: cutsKm.count + 1)
        let minAllowed = cutIndex == 0 ? gap : cutsKm[cutIndex - 1] + gap
        let maxAllowed = cutIndex == cutsKm.count - 1 ? totalDistanceKm - gap : cutsKm[cutIndex + 1] - gap
        let clamped = max(minAllowed, min(maxAllowed, targetKm))
        var next = cutsKm
        next[cutIndex] = JSCompat.roundTo(clamped, decimals: 1)
        return next
    }

    public static func computeDefaultCutDistances(
        _ spine: FullTourSpine,
        dayCount: Int,
        mode: StageSliceBalanceMode = .effort
    ) -> [Double] {
        let safeDays = max(2, min(10, dayCount))
        let cutsNeeded = safeDays - 1
        let totalKm = spine.totalDistanceKm

        if mode == .distance || spine.elevationProfile.count < 3 {
            let equalCuts = (1...cutsNeeded).map { (Double($0) / Double(safeDays)) * totalKm }
            return clampAndSortCuts(equalCuts, totalDistanceKm: totalKm)
        }

        let profile = spine.elevationProfile
        var cumEffort: [Double] = [0.0]
        var totalEffort = 0.0

        for i in 1..<profile.count {
            let dKm = max(0.0, profile[i].distKm - profile[i - 1].distKm)
            let dEle = max(0.0, profile[i].eleM - profile[i - 1].eleM)
            totalEffort += dKm + (dEle / 100.0) * 8.0
            cumEffort.append(totalEffort)
        }

        if totalEffort <= 0.01 {
            let fallback = (1...cutsNeeded).map { (Double($0) / Double(safeDays)) * totalKm }
            return clampAndSortCuts(fallback, totalDistanceKm: totalKm)
        }

        var cuts: [Double] = []
        var cursor = 0
        for k in 1...cutsNeeded {
            let targetEffort = (Double(k) / Double(safeDays)) * totalEffort
            while cursor < cumEffort.count - 2 && cumEffort[cursor + 1] < targetEffort {
                cursor += 1
            }
            let e0 = cumEffort[cursor]
            let e1 = cumEffort[min(cumEffort.count - 1, cursor + 1)]
            let d0 = profile[cursor].distKm
            let d1 = profile[min(profile.count - 1, cursor + 1)].distKm
            let ratio = e1 - e0 > 0.0001 ? max(0.0, min(1.0, (targetEffort - e0) / (e1 - e0))) : 0.0
            cuts.append(d0 + (d1 - d0) * ratio)
        }

        return clampAndSortCuts(cuts, totalDistanceKm: totalKm)
    }

    public static func interpolateCoordAtDistance(_ spine: FullTourSpine, targetKm: Double) -> LatLon {
        let coords = spine.coordinates
        let dists = spine.coordDistKm
        if coords.isEmpty { return LatLon(lat: 47.2184, lon: -1.5536) }
        if coords.count == 1 || targetKm <= dists[0] { return coords[0] }
        let lastIdx = coords.count - 1
        if targetKm >= dists[lastIdx] { return coords[lastIdx] }

        var lo = 0
        var hi = lastIdx
        while lo + 1 < hi {
            let mid = (lo + hi) >> 1
            if dists[mid] <= targetKm { lo = mid }
            else { hi = mid }
        }
        let d0 = dists[lo]
        let d1 = dists[hi]
        let ratio = d1 - d0 > 1e-6 ? max(0.0, min(1.0, (targetKm - d0) / (d1 - d0))) : 0.0
        let lat = coords[lo].lat + (coords[hi].lat - coords[lo].lat) * ratio
        let lon = coords[lo].lon + (coords[hi].lon - coords[lo].lon) * ratio
        return LatLon(lat: JSCompat.roundTo(lat, decimals: 5), lon: JSCompat.roundTo(lon, decimals: 5))
    }

    public static func interpolateElevationAtDistance(
        _ profile: [ElevationProfilePoint],
        targetKm: Double
    ) -> ElevationAtDistanceResult {
        if profile.isEmpty { return ElevationAtDistanceResult(eleM: 20, gradePct: 0) }
        if profile.count == 1 || targetKm <= profile[0].distKm {
            return ElevationAtDistanceResult(eleM: profile[0].eleM, gradePct: profile[0].gradePct)
        }
        let lastIdx = profile.count - 1
        if targetKm >= profile[lastIdx].distKm {
            return ElevationAtDistanceResult(eleM: profile[lastIdx].eleM, gradePct: profile[lastIdx].gradePct)
        }

        var lo = 0
        var hi = lastIdx
        while lo + 1 < hi {
            let mid = (lo + hi) >> 1
            if profile[mid].distKm <= targetKm { lo = mid }
            else { hi = mid }
        }
        let p0 = profile[lo]
        let p1 = profile[hi]
        let span = p1.distKm - p0.distKm
        let ratio = span > 1e-6 ? max(0.0, min(1.0, (targetKm - p0.distKm) / span)) : 0.0
        return ElevationAtDistanceResult(
            eleM: JSCompat.roundTo(p0.eleM + (p1.eleM - p0.eleM) * ratio, decimals: 1),
            gradePct: JSCompat.roundTo(p0.gradePct + (p1.gradePct - p0.gradePct) * ratio, decimals: 1)
        )
    }

    public static func findNearestDistanceOnSpine(
        _ spine: FullTourSpine,
        lat: Double,
        lng: Double,
        minKm: Double = 0,
        maxKm explicitMaxKm: Double? = nil
    ) -> NearestDistanceResult {
        let coords = spine.coordinates
        let dists = spine.coordDistKm
        let clampedMin = max(0.0, min(minKm, spine.totalDistanceKm))
        let clampedMax = max(clampedMin, min(explicitMaxKm ?? spine.totalDistanceKm, spine.totalDistanceKm))

        var bestDistKm = (clampedMin + clampedMax) / 2.0
        var bestOffRouteKm = Double.infinity
        var bestCoord = interpolateCoordAtDistance(spine, targetKm: bestDistKm)

        for i in 0..<coords.count {
            let dKm = dists[i]
            if dKm < clampedMin || dKm > clampedMax { continue }
            let dist = haversineKm(lat, lng, coords[i].lat, coords[i].lon)
            if dist < bestOffRouteKm {
                bestOffRouteKm = dist
                bestDistKm = dKm
                bestCoord = coords[i]
            }
        }

        for boundKm in [clampedMin, clampedMax] {
            let c = interpolateCoordAtDistance(spine, targetKm: boundKm)
            let dist = haversineKm(lat, lng, c.lat, c.lon)
            if dist < bestOffRouteKm {
                bestOffRouteKm = dist
                bestDistKm = boundKm
                bestCoord = c
            }
        }

        return NearestDistanceResult(
            distKm: JSCompat.roundTo(bestDistKm, decimals: 1),
            offRouteKm: JSCompat.roundTo(bestOffRouteKm, decimals: 2),
            coord: bestCoord
        )
    }

    private static func sliceCoordinatesRange(_ spine: FullTourSpine, startKm: Double, endKm: Double) -> [LatLon] {
        let startCoord = interpolateCoordAtDistance(spine, targetKm: startKm)
        let endCoord = interpolateCoordAtDistance(spine, targetKm: endKm)
        var out: [LatLon] = [startCoord]

        for i in 0..<spine.coordinates.count {
            let d = spine.coordDistKm[i]
            if d > startKm + 0.005 && d < endKm - 0.005 {
                out.append(spine.coordinates[i])
            }
        }

        if let last = out.last, haversineKm(last.lat, last.lon, endCoord.lat, endCoord.lon) > 0.002 || out.count < 2 {
            out.append(endCoord)
        }
        return out
    }

    private static func sliceElevationProfileRange(
        _ profile: [ElevationProfilePoint],
        startKm: Double,
        endKm: Double
    ) -> [ElevationProfilePoint] {
        let spanKm = max(0.1, endKm - startKm)
        let startVal = interpolateElevationAtDistance(profile, targetKm: startKm)
        let endVal = interpolateElevationAtDistance(profile, targetKm: endKm)

        var sliced: [ElevationProfilePoint] = [
            ElevationProfilePoint(distKm: 0, eleM: startVal.eleM, gradePct: 0)
        ]

        for pt in profile {
            if pt.distKm > startKm + 0.005 && pt.distKm < endKm - 0.005 {
                sliced.append(ElevationProfilePoint(
                    distKm: JSCompat.roundTo(pt.distKm - startKm, decimals: 3),
                    eleM: pt.eleM,
                    gradePct: pt.gradePct,
                    surfaceType: pt.surfaceType
                ))
            }
        }

        sliced.append(ElevationProfilePoint(
            distKm: JSCompat.roundTo(spanKm, decimals: 3),
            eleM: endVal.eleM,
            gradePct: endVal.gradePct
        ))

        if sliced.count < 24 {
            var resampled: [ElevationProfilePoint] = []
            let samples = 28
            for i in 0...samples {
                let localDist = (Double(i) / Double(samples)) * spanKm
                let interp = interpolateElevationAtDistance(sliced, targetKm: localDist)
                var gradePct = 0.0
                if i > 0, let prev = resampled.last {
                    let dMeters = max(20.0, (localDist - prev.distKm) * 1000.0)
                    gradePct = JSCompat.roundTo(max(-22.0, min(24.0, ((interp.eleM - prev.eleM) / dMeters) * 100.0)), decimals: 1)
                }
                resampled.append(ElevationProfilePoint(
                    distKm: JSCompat.roundTo(localDist, decimals: 3),
                    eleM: interp.eleM,
                    gradePct: gradePct
                ))
            }
            return resampled
        }

        return sliced
    }

    public static func sliceRouteIntoStagePreviews(
        _ spine: FullTourSpine,
        rawCutDistancesKm: [Double],
        options: SlicePreviewOptions,
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) -> [SlicedStagePreview] {
        let cuts = clampAndSortCuts(rawCutDistancesKm, totalDistanceKm: spine.totalDistanceKm)
        let boundaries = [0.0] + cuts + [spine.totalDistanceKm]
        let stopBufferMin = options.dailyStopBufferMinutes ?? 45.0
        let startDateBase = options.startDateIso
        let dailyStart = options.dailyStartTime.isEmpty ? "08:30" : options.dailyStartTime
        let startMinutes = SolarVisibilityEngine.hhmmToMinutes(dailyStart)

        struct RawSlice {
            var startKm: Double
            var endKm: Double
            var distKm: Double
            var coords: [LatLon]
            var profile: [ElevationProfilePoint]
            var gainM: Double
            var lossM: Double
        }

        var rawSlices: [RawSlice] = []
        var sumRawGain = 0.0
        var sumRawLoss = 0.0

        for i in 0..<(boundaries.count - 1) {
            let startKm = boundaries[i]
            let endKm = boundaries[i + 1]
            let distKm = max(0.5, JSCompat.roundTo(endKm - startKm, decimals: 1))
            let coords = sliceCoordinatesRange(spine, startKm: startKm, endKm: endKm)
            let profile = sliceElevationProfileRange(spine.elevationProfile, startKm: startKm, endKm: endKm)
            let measured = measureProfileGainLoss(profile)
            sumRawGain += measured.gainM
            sumRawLoss += measured.lossM
            rawSlices.append(RawSlice(startKm: startKm, endKm: endKm, distKm: distKm, coords: coords, profile: profile, gainM: measured.gainM, lossM: measured.lossM))
        }

        let gainScale = (sumRawGain > 1 && spine.totalElevationGainM > 0)
            ? max(0.8, min(1.35, Double(spine.totalElevationGainM) / sumRawGain))
            : 1.0
        let lossScale = (sumRawLoss > 1 && spine.totalElevationLossM > 0)
            ? max(0.8, min(1.35, Double(spine.totalElevationLossM) / sumRawLoss))
            : 1.0

        let isFr = options.lang == .fr
        var previews: [SlicedStagePreview] = []

        for (i, s) in rawSlices.enumerated() {
            let dayNumber = i + 1
            let departureDate = i == 0 ? startDateBase : StageManagerEngine.addDaysToIso(startDateBase, days: i)
            let elevationGainM = JSCompat.jsRoundInt(s.gainM * gainScale)
            let elevationLossM = JSCompat.jsRoundInt(s.lossM * lossScale)

            var minEleM = s.profile.first?.eleM ?? 0.0
            var maxEleM = minEleM
            for pt in s.profile {
                if pt.eleM < minEleM { minEleM = pt.eleM }
                if pt.eleM > maxEleM { maxEleM = pt.eleM }
            }

            let originLabel: String
            if i == 0 {
                let ov = options.originLabelOverride?.trimmingCharacters(in: .whitespaces)
                originLabel = (ov?.isEmpty == false) ? ov! : spine.originLabel
            } else {
                let lbl = options.cutLabels?[i - 1]?.trimmingCharacters(in: .whitespaces)
                originLabel = (lbl?.isEmpty == false)
                    ? lbl!
                    : (isFr ? "Étape \(i) (km \(JSCompat.jsRoundInt(s.startKm)))" : "Stop \(i) (km \(JSCompat.jsRoundInt(s.startKm)))")
            }

            let destLabel: String
            if i == rawSlices.count - 1 {
                let ov = options.destLabelOverride?.trimmingCharacters(in: .whitespaces)
                destLabel = (ov?.isEmpty == false) ? ov! : spine.destLabel
            } else {
                let lbl = options.cutLabels?[i]?.trimmingCharacters(in: .whitespaces)
                destLabel = (lbl?.isEmpty == false)
                    ? lbl!
                    : (isFr ? "Étape \(dayNumber) (km \(JSCompat.jsRoundInt(s.endKm)))" : "Stop \(dayNumber) (km \(JSCompat.jsRoundInt(s.endKm)))")
            }

            let stageAvgGradePct = s.distKm > 0
                ? min(8.0, max(0.0, ((Double(elevationGainM) / (s.distKm * 1000.0)) * 100.0) * 0.35))
                : 0.0

            let stageRoute = RouteParams(
                elevationGainM: Double(elevationGainM),
                elevationLossM: Double(elevationLossM),
                origin: originLabel,
                destination: destLabel,
                distanceKm: s.distKm,
                targetSpeedKmH: max(10.0, options.targetSpeedKmH > 0 ? options.targetSpeedKmH : 21.0),
                urbanTrafficDelayMinutes: 0,
                gateSecurityDelayMinutes: 0,
                coordinates: s.coords,
                routeMode: "gpx",
                originCoords: s.coords.first,
                destCoords: s.coords.last,
                elevationProfile: s.profile
            )

            let stageWeather: WeatherCondition = i == 0 ? options.weather : WeatherCondition(
                source: "simulated",
                airDensityRho: 1.225,
                effectiveHeadwindKmH: 0,
                isHeadwindActive: false,
                baseWindSpeedKmH: 10,
                windDirection: "calm",
                windDirectionDegrees: 240,
                temperatureC: options.weather.temperatureC,
                precipitationRiskPercent: 10,
                estuaryGustKmH: 14,
                visibilityKm: 20
            )

            var stagePhysics = options.physics
            stagePhysics.gradientPercent = stageAvgGradePct
            let phys = PhysicsEngine.calculatePhysics(
                physics: stagePhysics,
                route: stageRoute,
                weather: stageWeather,
                lang: options.lang,
                ftpOverride: options.ftpWatts,
                riderSpecs: riderSpecs
            )

            let movingTimeMinutes = max(15, JSCompat.jsRoundInt(phys.movingTimeSeconds / 60.0))
            let arrivalMins = Double(startMinutes) + Double(movingTimeMinutes) + stopBufferMin
            let estimatedArrivalHHMM = SolarVisibilityEngine.minutesToHHMM(arrivalMins)

            let destCoord = s.coords[s.coords.count - 1]
            let solar = SolarVisibilityEngine.getSolarEphemeris(lat: destCoord.lat, lon: destCoord.lon, dateStr: departureDate)
            let sunsetMins = Double(SolarVisibilityEngine.hhmmToMinutes(solar.sunset))
            let arrivesAfterSunset = arrivalMins >= sunsetMins
            let arrivesNearSunset = !arrivesAfterSunset && arrivalMins >= sunsetMins - 35.0
            let effortEquivalentKm = JSCompat.roundTo(s.distKm + (Double(elevationGainM) / 100.0) * 8.0, decimals: 1)

            previews.append(SlicedStagePreview(
                dayNumber: dayNumber,
                startKm: JSCompat.roundTo(s.startKm, decimals: 1),
                endKm: JSCompat.roundTo(s.endKm, decimals: 1),
                distanceKm: s.distKm,
                elevationGainM: elevationGainM,
                elevationLossM: elevationLossM,
                minEleM: JSCompat.jsRoundInt(minEleM),
                maxEleM: JSCompat.jsRoundInt(maxEleM),
                coordinates: s.coords,
                elevationProfile: s.profile,
                originCoords: s.coords[0],
                destCoords: destCoord,
                originLabel: originLabel,
                destLabel: destLabel,
                departureDate: departureDate,
                departureTime: dailyStart,
                movingTimeMinutes: movingTimeMinutes,
                movingTimeFormatted: StageManagerEngine.formatDurationHoursMins(Double(movingTimeMinutes)),
                estimatedArrivalHHMM: estimatedArrivalHHMM,
                sunsetHHMM: solar.sunset,
                arrivesAfterSunset: arrivesAfterSunset,
                arrivesNearSunset: arrivesNearSunset,
                effortEquivalentKm: effortEquivalentKm,
                color: getStageColor(i),
                accommodationNote: i < rawSlices.count - 1 ? options.cutAccommodationNotes?[i] : nil
            ))
        }

        return previews
    }

    public static func applyStageSlicesToTrip(
        _ trip: TripProfile,
        spine: FullTourSpine,
        previews: [SlicedStagePreview],
        now: Date = Date()
    ) -> TripProfile {
        if previews.isEmpty { return trip }

        let targetSpeedKmH = trip.route.targetSpeedKmH > 0 ? trip.route.targetSpeedKmH : 21.0
        var seenChips = Set<String>()
        var baseChips: [String] = []
        for chip in trip.customChips ?? [] {
            if seenChips.insert(chip).inserted { baseChips.append(chip) }
        }
        let nowStamp = Int(now.timeIntervalSince1970 * 1000)

        let stages: [TripStage] = previews.enumerated().map { idx, p in
            let isAvailable = StageManagerEngine.isWithinForecastHorizon(p.departureDate, now: now)
            let sameDateAsTrip = idx == 0 && p.departureDate == trip.departureDate

            let stageWeather: WeatherCondition = sameDateAsTrip ? trip.weather : WeatherCondition(
                source: "simulated",
                airDensityRho: 1.225,
                effectiveHeadwindKmH: 0,
                isBeyondForecastWindow: !isAvailable,
                isHeadwindActive: false,
                baseWindSpeedKmH: 10,
                windDirection: "calm",
                windDirectionDegrees: 240,
                temperatureC: trip.weather.temperatureC,
                precipitationRiskPercent: 10,
                estuaryGustKmH: 14,
                visibilityKm: 20
            )

            let stageCoords = StageManagerEngine.downsampleCoordinates(p.coordinates, maxPoints: 450) ?? p.coordinates
            let terrainSummary = GpxParserEngine.buildTerrainSummaryFromProfile(
                p.elevationProfile,
                distanceKm: p.distanceKm,
                elevationGainM: Double(p.elevationGainM),
                titleHint: "\(p.originLabel) \(p.destLabel) \(spine.gpxFileName ?? "")",
                coordinates: stageCoords
            )

            var stageRoute = trip.route
            stageRoute.origin = p.originLabel
            stageRoute.destination = p.destLabel
            stageRoute.originCoords = p.originCoords
            stageRoute.destCoords = p.destCoords
            stageRoute.distanceKm = p.distanceKm
            stageRoute.elevationGainM = Double(p.elevationGainM)
            stageRoute.elevationLossM = Double(p.elevationLossM)
            stageRoute.targetSpeedKmH = targetSpeedKmH
            stageRoute.routeMode = "gpx"
            stageRoute.gpxFileName = spine.gpxFileName ?? trip.route.gpxFileName
            stageRoute.coordinates = stageCoords
            stageRoute.elevationProfile = p.elevationProfile
            stageRoute.terrainSummary = terrainSummary
            stageRoute.surfaceBreakdown = nil
            stageRoute.waypoints = nil
            stageRoute.cueSheet = nil
            stageRoute.radiusMeters = nil

            var stageOffice = trip.office
            stageOffice.gateName = p.destLabel
            stageOffice.targetGateArrivalTime = p.estimatedArrivalHHMM

            return TripStage(
                id: "stage-\(p.dayNumber)-\(nowStamp)-\(idx)",
                dayNumber: p.dayNumber,
                departureDate: p.departureDate,
                departureTime: p.departureTime,
                targetMode: "depart",
                route: stageRoute,
                office: stageOffice,
                weather: stageWeather,
                customChips: baseChips,
                accommodationNote: p.accommodationNote,
                pinnedAmenities: nil
            )
        }

        let day1 = stages[0]
        let day1AvgGrade = day1.route.distanceKm > 0
            ? min(8.0, max(0.0, (((day1.route.elevationGainM ?? 0) / (day1.route.distanceKm * 1000.0)) * 100.0) * 0.35))
            : 0.0

        var updated = trip
        updated.tag = stages.count > 1 ? "BIKEPACKING" : trip.tag
        updated.departureDate = day1.departureDate
        updated.departureTime = day1.departureTime
        updated.arriveAtMode = false
        updated.physics.gradientPercent = JSCompat.roundTo(day1AvgGrade, decimals: 2)
        updated.route = day1.route
        updated.office = day1.office
        updated.weather = day1.weather
        updated.customChips = day1.customChips
        updated.stages = stages.count > 1 ? stages : nil
        updated.activeStageIndex = stages.count > 1 ? 0 : nil
        updated.pinnedAmenities = nil
        return updated
    }

    public static func mergeTourStagesToSingleDay(_ trip: TripProfile, now: Date = Date()) -> TripProfile {
        guard let spine = extractFullTourSpine(trip, now: now) else { return trip }

        let mergedCoords = StageManagerEngine.downsampleCoordinates(spine.coordinates, maxPoints: 1200) ?? spine.coordinates
        let terrainSummary = GpxParserEngine.buildTerrainSummaryFromProfile(
            spine.elevationProfile,
            distanceKm: spine.totalDistanceKm,
            elevationGainM: Double(spine.totalElevationGainM),
            titleHint: "\(spine.originLabel) \(spine.destLabel) \(spine.gpxFileName ?? "")",
            coordinates: mergedCoords
        )

        let avgGrade = spine.totalDistanceKm > 0
            ? min(8.0, max(0.0, ((Double(spine.totalElevationGainM) / (spine.totalDistanceKm * 1000.0)) * 100.0) * 0.35))
            : 0.0

        let firstStage = trip.stages?.first
        var updated = trip
        updated.departureDate = firstStage?.departureDate ?? trip.departureDate
        updated.departureTime = firstStage?.departureTime ?? trip.departureTime
        updated.physics.gradientPercent = JSCompat.roundTo(avgGrade, decimals: 2)
        updated.route.origin = spine.originLabel
        updated.route.destination = spine.destLabel
        updated.route.originCoords = mergedCoords.first
        updated.route.destCoords = mergedCoords.last
        updated.route.distanceKm = spine.totalDistanceKm
        updated.route.elevationGainM = Double(spine.totalElevationGainM)
        updated.route.elevationLossM = Double(spine.totalElevationLossM)
        updated.route.routeMode = "gpx"
        updated.route.gpxFileName = spine.gpxFileName ?? trip.route.gpxFileName
        updated.route.coordinates = mergedCoords
        updated.route.elevationProfile = spine.elevationProfile
        updated.route.terrainSummary = terrainSummary
        updated.route.surfaceBreakdown = nil
        updated.route.waypoints = nil
        updated.route.cueSheet = nil
        updated.stages = nil
        updated.activeStageIndex = nil
        return updated
    }
}
