import Foundation

public enum ClimbCategory: String, Codable, Sendable, CaseIterable {
    case hc = "HC"
    case cat1 = "1"
    case cat2 = "2"
    case cat3 = "3"
    case cat4 = "4"
    case hill = "hill"
}

public struct DetectedClimb: Codable, Sendable, Equatable {
    public var index: Int
    public var category: ClimbCategory
    public var name: String
    public var startKm: Double
    public var endKm: Double
    public var lengthKm: Double
    public var elevationGainM: Int
    public var avgGradePct: Double
    public var maxGradePct: Double
    public var startEleM: Int
    public var summitEleM: Int
}

public struct ClimbSplit: Codable, Sendable, Equatable {
    public var index: Int
    public var category: ClimbCategory
    public var name: String
    public var startKm: Double
    public var endKm: Double
    public var lengthKm: Double
    public var elevationGainM: Int
    public var avgGradePct: Double
    public var maxGradePct: Double
    public var startEleM: Int
    public var summitEleM: Int
    public var targetWatts: Int
    public var wattsPerKg: Double
    public var ftpPercent: Double
    public var powerZone: String
    public var climbSpeedKmH: Double
    public var durationMinutes: Int
    public var durationFormatted: String
    public var vamMetersPerHour: Int
    public var etaStartHHMM: String?
    public var fuelingCue: String
}

public struct FuelingCheckpoint: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var distKm: Double
    public var elapsedMinutes: Int
    public var etaHHMM: String?
    public var kind: String // "fuel-and-hydration" | "hydration" | "pre-climb"
    public var carbsGrams: Int
    public var fluidMl: Int
    public var label: String
    public var shortFitCue: String
    public var detail: String
}

public struct ClimbSplitsSummary: Codable, Sendable, Equatable {
    public var climbs: [ClimbSplit]
    public var checkpoints: [FuelingCheckpoint]
    public var totalClimbKm: Double
    public var totalClimbGainM: Int
    public var recommendedCarbsGPerHr: Double
    public var targetFluidMlPerHr: Int
    public var isSynthesizedProfile: Bool
}

public struct DetectClimbsOptions: Sendable {
    public var minLengthKm: Double?
    public var minGainM: Double?
    public var minAvgGradePct: Double?
    public var lang: CadenceLang?

    public init(minLengthKm: Double? = nil, minGainM: Double? = nil, minAvgGradePct: Double? = nil, lang: CadenceLang? = nil) {
        self.minLengthKm = minLengthKm
        self.minGainM = minGainM
        self.minAvgGradePct = minAvgGradePct
        self.lang = lang
    }
}

public struct ClimbSplitsOptions: Sendable {
    public var ftpWatts: Double?
    public var carbTargetGPerHr: Double?
    public var isLockedCarbTarget: Bool?
    public var carbPacingMode: String?
    public var riderLevel: RiderLevel?
    public var nutritionPreference: NutritionPreference?
    public var departureTimeHHMM: String?
    public var bidonSizeMl: Double?
    public var frameBottleSlots: Int?
    public var checkpointIntervalMinutes: Int?
    public var minLengthKm: Double?
    public var minGainM: Double?
    public var minAvgGradePct: Double?

    public init(
        ftpWatts: Double? = nil,
        carbTargetGPerHr: Double? = nil,
        isLockedCarbTarget: Bool? = nil,
        carbPacingMode: String? = nil,
        riderLevel: RiderLevel? = nil,
        nutritionPreference: NutritionPreference? = nil,
        departureTimeHHMM: String? = nil,
        bidonSizeMl: Double? = nil,
        frameBottleSlots: Int? = nil,
        checkpointIntervalMinutes: Int? = nil,
        minLengthKm: Double? = nil,
        minGainM: Double? = nil,
        minAvgGradePct: Double? = nil
    ) {
        self.ftpWatts = ftpWatts
        self.carbTargetGPerHr = carbTargetGPerHr
        self.isLockedCarbTarget = isLockedCarbTarget
        self.carbPacingMode = carbPacingMode
        self.riderLevel = riderLevel
        self.nutritionPreference = nutritionPreference
        self.departureTimeHHMM = departureTimeHHMM
        self.bidonSizeMl = bidonSizeMl
        self.frameBottleSlots = frameBottleSlots
        self.checkpointIntervalMinutes = checkpointIntervalMinutes
        self.minLengthKm = minLengthKm
        self.minGainM = minGainM
        self.minAvgGradePct = minAvgGradePct
    }
}

public enum ClimbSplitsEngine {
    private static func classifyClimbCategory(gainM: Double, avgGradePct: Double) -> ClimbCategory {
        let score = gainM * max(1.0, avgGradePct)
        if score >= 8000 { return .hc }
        if score >= 4000 { return .cat1 }
        if score >= 2000 { return .cat2 }
        if score >= 800 { return .cat3 }
        if score >= 250 { return .cat4 }
        return .hill
    }

    public static func formatClimbCategoryLabel(_ category: ClimbCategory, lang: CadenceLang = .en) -> String {
        let isFr = lang == .fr
        switch category {
        case .hc: return "HC"
        case .cat1: return isFr ? "Cat. 1" : "Cat 1"
        case .cat2: return isFr ? "Cat. 2" : "Cat 2"
        case .cat3: return isFr ? "Cat. 3" : "Cat 3"
        case .cat4: return isFr ? "Cat. 4" : "Cat 4"
        case .hill: return isFr ? "Côte" : "Hill"
        }
    }

    private static func formatClimbDuration(_ minutes: Double) -> String {
        let m = max(1, JSCompat.jsRoundInt(minutes))
        let h = m / 60
        let rem = m % 60
        if h == 0 { return "\(m) min" }
        return "\(h) h \(String(format: "%02d", rem))"
    }

    private static func shiftHHMM(_ hhmm: String?, addMinutes: Double) -> String? {
        guard let hhmm = hhmm, hhmm.contains(":") else { return nil }
        let parts = hhmm.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 2 else { return nil }
        let total = JSCompat.posMod(parts[0] * 60 + parts[1] + JSCompat.jsRoundInt(addMinutes), 1440)
        return String(format: "%02d:%02d", total / 60, total % 60)
    }

    private static func segmentGradePct(_ prev: ElevationProfilePoint, _ curr: ElevationProfilePoint) -> Double {
        let segKm = curr.distKm - prev.distKm
        if segKm > 0.005 {
            return ((curr.eleM - prev.eleM) / (segKm * 1000.0)) * 100.0
        }
        return curr.gradePct
    }

    public static func detectClimbs(
        _ elevationProfile: [ElevationProfilePoint]?,
        options: DetectClimbsOptions = DetectClimbsOptions()
    ) -> [DetectedClimb] {
        guard let profile = elevationProfile, profile.count >= 2 else { return [] }

        let minLengthKm = options.minLengthKm ?? 0.4
        let minGainM = options.minGainM ?? 35.0
        let minAvgGradePct = options.minAvgGradePct ?? 2.5
        let isFr = options.lang == .fr

        var rawClimbs: [(startIdx: Int, endIdx: Int, maxGrade: Double)] = []

        var i = 1
        while i < profile.count {
            let g = segmentGradePct(profile[i - 1], profile[i])
            if g < 2.0 {
                i += 1
                continue
            }

            let startIdx = i - 1
            var summitIdx = i
            var maxEle = profile[i].eleM
            var maxGrade = g
            var flatBridgeKm = 0.0
            var dipM = 0.0
            var j = i + 1

            while j < profile.count {
                let prev = profile[j - 1]
                let curr = profile[j]
                let segKm = max(0.0, curr.distKm - prev.distKm)
                let segG = segmentGradePct(prev, curr)

                if curr.eleM >= maxEle {
                    maxEle = curr.eleM
                    summitIdx = j
                }

                if segG >= 1.5 {
                    if segG > maxGrade { maxGrade = segG }
                    flatBridgeKm = 0
                    dipM = 0
                } else {
                    flatBridgeKm += segKm
                    dipM += max(0.0, prev.eleM - curr.eleM)
                    if flatBridgeKm > 0.45 || dipM > 12.0 || segG <= -2.5 {
                        break
                    }
                }
                j += 1
            }

            var trimmedMaxGrade = 0.0
            if startIdx + 1 <= summitIdx {
                for k in (startIdx + 1)...summitIdx {
                    let sg = segmentGradePct(profile[k - 1], profile[k])
                    if sg > trimmedMaxGrade { trimmedMaxGrade = sg }
                }
            }

            if summitIdx > startIdx {
                rawClimbs.append((startIdx, summitIdx, trimmedMaxGrade))
            }
            i = max(summitIdx + 1, i + 1)
        }

        var climbs: [DetectedClimb] = []
        for rc in rawClimbs {
            let pStart = profile[rc.startIdx]
            let pEnd = profile[rc.endIdx]
            let lengthKm2 = JSCompat.roundTo(pEnd.distKm - pStart.distKm, decimals: 2)
            let netGainM = JSCompat.jsRoundInt(pEnd.eleM - pStart.eleM)
            if lengthKm2 < minLengthKm || Double(netGainM) < minGainM { continue }

            let avgGradePct = JSCompat.roundTo((Double(netGainM) / (lengthKm2 * 1000.0)) * 100.0, decimals: 1)
            if avgGradePct < minAvgGradePct { continue }

            let idx = climbs.count + 1
            let category = classifyClimbCategory(gainM: Double(netGainM), avgGradePct: avgGradePct)
            let catLabel = formatClimbCategoryLabel(category, lang: isFr ? .fr : .en)
            climbs.append(DetectedClimb(
                index: idx,
                category: category,
                name: isFr ? "Ascension \(idx) (\(catLabel))" : "Climb \(idx) (\(catLabel))",
                startKm: JSCompat.roundTo(pStart.distKm, decimals: 1),
                endKm: JSCompat.roundTo(pEnd.distKm, decimals: 1),
                lengthKm: JSCompat.roundTo(lengthKm2, decimals: 1),
                elevationGainM: netGainM,
                avgGradePct: avgGradePct,
                maxGradePct: JSCompat.roundTo(min(28.0, max(avgGradePct, rc.maxGrade)), decimals: 1),
                startEleM: JSCompat.jsRoundInt(pStart.eleM),
                summitEleM: JSCompat.jsRoundInt(pEnd.eleM)
            ))
        }

        return climbs
    }

    private static func buildFuelUnitLabel(
        carbsG: Int,
        fluidMl: Int,
        pref: NutritionPreference,
        lang: CadenceLang
    ) -> String {
        let isFr = lang == .fr
        var parts: [String] = []

        if carbsG >= 15 {
            if pref == .realFood {
                let dates = max(1, JSCompat.jsRoundInt(Double(carbsG) / NutritionEngine.medjoolDateCarbsG))
                parts.append(isFr ? "\(dates) datte\(dates > 1 ? "s" : "") (ou barre)" : "\(dates) date\(dates > 1 ? "s" : "") (or bar)")
            } else {
                let gels = max(1, JSCompat.jsRoundInt(Double(carbsG) / NutritionEngine.energyGelCarbsG))
                parts.append("\(gels) gel\(gels > 1 ? "s" : "")")
            }
        }

        if fluidMl >= 150 {
            if fluidMl >= 500 {
                parts.append(isFr ? "1 bidon" : "1 bottle")
            } else if fluidMl >= 250 {
                parts.append(isFr ? "1/2 bidon" : "1/2 bottle")
            } else {
                parts.append("\(fluidMl) ml")
            }
        }

        return parts.isEmpty ? (isFr ? "Hydratation" : "Hydrate") : parts.joined(separator: " + ")
    }

    private static func buildShortFitCue(carbsG: Int, fluidMl: Int, isFr: Bool) -> String {
        if carbsG >= 15 && fluidMl >= 150 {
            return isFr ? "Ravito \(carbsG)g+Eau" : "Fuel \(carbsG)g+H2O"
        }
        if carbsG >= 15 {
            return isFr ? "Manger \(carbsG)g" : "Eat \(carbsG)g"
        }
        return isFr ? "Boire \(fluidMl)ml" : "Drink \(fluidMl)ml"
    }

    public static func buildClimbAdjustedPacingCurve(
        _ profile: [ElevationProfilePoint]?,
        totalDistanceKm: Double,
        avgFlatSpeedKmH: Double,
        totalMassKg: Double = 80.0
    ) -> [PacingCurvePoint] {
        let safeDistKm = max(0.5, totalDistanceKm)
        let v0 = max(2.5, avgFlatSpeedKmH / 3.6)
        let massKg = max(45.0, totalMassKg)

        guard let profile = profile, profile.count >= 2 else {
            return [
                PacingCurvePoint(distKm: 0, elapsedSec: 0),
                PacingCurvePoint(distKm: safeDistKm, elapsedSec: (safeDistKm * 1000.0) / v0)
            ]
        }

        let cAero = 0.21
        let cRoll = massKg * 9.81 * 0.0045
        let pFlat = cAero * v0 * v0 * v0 + cRoll * v0

        let profileLastKm = profile[profile.count - 1].distKm
        let scaleKm = profileLastKm > 0 ? safeDistKm / profileLastKm : 1.0

        var curve: [PacingCurvePoint] = [PacingCurvePoint(distKm: 0, elapsedSec: 0)]
        var elapsedSec = 0.0

        for i in 1..<profile.count {
            let prevKm = profile[i - 1].distKm * scaleKm
            let currKm = profile[i].distKm * scaleKm
            let segDistKm = currKm - prevKm
            if segDistKm <= 0.0001 { continue }

            let dEleM = profile[i].eleM - profile[i - 1].eleM
            let gradePct = max(-15.0, min(25.0, (dEleM / (segDistKm * 1000.0)) * 100.0))

            var segSpeedMs = v0
            if gradePct > 0.3 {
                let effortMult = 1.0 + min(0.24, gradePct * 0.022)
                let targetPower = pFlat * effortMult
                let kLin = cRoll + massKg * 9.81 * (gradePct / 100.0)
                var v = max(1.5, v0 * 0.55)
                for _ in 0..<8 {
                    let f = cAero * v * v * v + kLin * v - targetPower
                    let df = 3.0 * cAero * v * v + kLin
                    v = max(1.3, v - f / max(1e-3, df))
                }
                segSpeedMs = v
            } else if gradePct < -0.5 {
                segSpeedMs = min(v0 * 1.45, v0 * (1.0 + min(0.45, -gradePct * 0.055)))
            }

            elapsedSec += (segDistKm * 1000.0) / max(1.3, segSpeedMs)
            curve.append(PacingCurvePoint(distKm: currKm, elapsedSec: elapsedSec))
        }

        if curve.count == 1 {
            curve.append(PacingCurvePoint(distKm: safeDistKm, elapsedSec: (safeDistKm * 1000.0) / v0))
        }
        return curve
    }

    public static func interpolateElapsedSecondsAtKm(_ curve: [PacingCurvePoint], _ distKm: Double) -> Double {
        if curve.isEmpty { return 0 }
        if distKm <= curve[0].distKm { return curve[0].elapsedSec }
        let last = curve[curve.count - 1]
        if distKm >= last.distKm { return last.elapsedSec }

        for i in 1..<curve.count {
            if curve[i].distKm >= distKm {
                let a = curve[i - 1]
                let b = curve[i]
                let span = b.distKm - a.distKm
                let ratio = span > 0 ? (distKm - a.distKm) / span : 0.0
                return a.elapsedSec + ratio * (b.elapsedSec - a.elapsedSec)
            }
        }
        return last.elapsedSec
    }

    public static func interpolateDistKmAtSeconds(_ curve: [PacingCurvePoint], _ targetSec: Double) -> Double {
        if curve.isEmpty { return 0 }
        if targetSec <= curve[0].elapsedSec { return curve[0].distKm }
        let last = curve[curve.count - 1]
        if targetSec >= last.elapsedSec { return last.distKm }

        for i in 1..<curve.count {
            if curve[i].elapsedSec >= targetSec {
                let a = curve[i - 1]
                let b = curve[i]
                let span = b.elapsedSec - a.elapsedSec
                let ratio = span > 0 ? (targetSec - a.elapsedSec) / span : 0.0
                return a.distKm + ratio * (b.distKm - a.distKm)
            }
        }
        return last.distKm
    }

    public static func computeClimbSplitsAndFueling(
        _ trip: TripProfile,
        physicsResult: PhysicsCalculationResult,
        lang: CadenceLang = .en,
        options: ClimbSplitsOptions = ClimbSplitsOptions(),
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) -> ClimbSplitsSummary {
        let isFr = lang == .fr
        let hasExplicitProfile = (trip.route.elevationProfile?.count ?? 0) >= 3
        let profile = hasExplicitProfile
            ? trip.route.elevationProfile!
            : GpxParserEngine.synthesizeRouteElevationProfile(trip.route).elevationProfile

        let detected = detectClimbs(profile, options: DetectClimbsOptions(
            minLengthKm: options.minLengthKm,
            minGainM: options.minGainM,
            minAvgGradePct: options.minAvgGradePct,
            lang: lang
        ))

        let ftpWatts = max(80.0, JSCompat.jsRound(options.ftpWatts ?? physicsResult.ftpWatts))
        let rideHours = max(0.25, physicsResult.movingTimeSeconds / 3600.0)
        let gutCeiling = max(25.0, min(120.0, options.carbTargetGPerHr ?? riderSpecs.carbTargetGPerHr))
        let resolvedRiderLevel = options.riderLevel ?? riderSpecs.riderLevel
        let resolvedCarbPacingMode = options.carbPacingMode ?? riderSpecs.carbPacingMode
        let isLockedCarbTarget = options.isLockedCarbTarget ?? (
            resolvedCarbPacingMode == "locked" ||
            (resolvedCarbPacingMode != "auto" && resolvedRiderLevel == .pro && gutCeiling >= 60)
        )
        let pref = options.nutritionPreference ?? .mixed
        let bidonSizeMl = options.bidonSizeMl ?? 650.0
        let frameBottleSlots = options.frameBottleSlots ?? 2

        let carbTarget = NutritionEngine.calculateIntensityModulatedCarbTarget(IntensityModulatedCarbTargetParams(
            rideHours: rideHours,
            pctFtp: physicsResult.ftpPercent,
            carbOxidationGramPerHour: physicsResult.carbOxidationGramPerHour,
            gutCeilingGPerHr: gutCeiling,
            totalDays: max(1, trip.stages?.count ?? 1),
            activeChips: trip.customChips ?? [],
            isLockedCarbTarget: isLockedCarbTarget
        ))

        let hydrationPlan = NutritionEngine.calculateHydrationPlan(HydrationPlanParams(
            rideHours: rideHours,
            tempC: trip.weather.temperatureC,
            legWatts: physicsResult.legWatts,
            bidonSizeMl: bidonSizeMl,
            frameBottleSlots: frameBottleSlots,
            isShortRide: rideHours < 0.75,
            activeChips: trip.customChips ?? []
        ))

        let avgSpeedKmH = max(10.0, physicsResult.effectiveSpeedKmH > 0 ? physicsResult.effectiveSpeedKmH : (trip.route.targetSpeedKmH > 0 ? trip.route.targetSpeedKmH : 24.0))
        let departureTimeHHMM = options.departureTimeHHMM ?? trip.departureTime
        let totalDistanceKm = max(1.0, trip.route.distanceKm > 0 ? trip.route.distanceKm : 1.0)
        let totalMassKg =
            (trip.physics.riderWeightKg > 0 ? trip.physics.riderWeightKg : 70.0) +
            (trip.physics.bikeWeightKg > 0 ? trip.physics.bikeWeightKg : 9.0) +
            (trip.physics.gearWeightKg > 0 ? trip.physics.gearWeightKg : 2.0)
        let pacingCurve = buildClimbAdjustedPacingCurve(
            profile,
            totalDistanceKm: totalDistanceKm,
            avgFlatSpeedKmH: avgSpeedKmH,
            totalMassKg: totalMassKg
        )

        let climbs: [ClimbSplit] = detected.map { climb in
            let gradeLift = climb.avgGradePct <= 3.5 ? 1.06 : min(1.28, 1.08 + (climb.avgGradePct - 3.5) * 0.035)
            let baseClimbW = max(physicsResult.legWatts, ftpWatts * 0.65) * gradeLift
            let rawTargetWatts = JSCompat.jsRound(min(ftpWatts * 1.15, baseClimbW))

            var climbPhysics = trip.physics
            climbPhysics.gradientPercent = climb.avgGradePct
            var climbRoute = trip.route
            climbRoute.distanceKm = climb.lengthKm
            climbRoute.pacingMode = "effort"
            climbRoute.targetEffortWatts = rawTargetWatts

            let climbPhys = PhysicsEngine.calculatePhysics(
                physics: climbPhysics,
                route: climbRoute,
                weather: trip.weather,
                lang: lang,
                ftpOverride: ftpWatts,
                riderSpecs: riderSpecs
            )

            let targetWatts = JSCompat.jsRoundInt(climbPhys.legWatts)
            let wattsPerKg = climbPhys.wattsPerKg
            let durationMinutes = max(1, JSCompat.jsRoundInt(climbPhys.movingTimeSeconds / 60.0))
            let vamMetersPerHour = JSCompat.jsRoundInt((Double(climb.elevationGainM) / max(60.0, climbPhys.movingTimeSeconds)) * 3600.0)

            let elapsedToStartMin = JSCompat.jsRound(interpolateElapsedSecondsAtKm(pacingCurve, climb.startKm) / 60.0)
            let etaStartHHMM = shiftHHMM(departureTimeHHMM, addMinutes: elapsedToStartMin)

            let preClimbKm = max(0.5, JSCompat.roundTo(climb.startKm - 1.5, decimals: 1))
            let preClimbCarbs = carbTarget.recommendedGPerHr > 0 ? min(30, JSCompat.jsRoundInt(carbTarget.recommendedGPerHr * 0.4)) : 0
            let baseFluid = hydrationPlan.targetFluidMlPerHr > 0 ? Double(hydrationPlan.targetFluidMlPerHr) : 450.0
            let preClimbFluid = max(200, JSCompat.jsRoundInt(baseFluid * 0.45))
            let cueItems = buildFuelUnitLabel(carbsG: preClimbCarbs, fluidMl: preClimbFluid, pref: pref, lang: lang)
            let preKmStr = Self.jsNum(preClimbKm)
            let gradeStr = Self.jsNum(climb.avgGradePct)
            let fuelingCue = isFr
                ? "Km \(preKmStr) : \(cueItems) avant la rampe (\(gradeStr) %)"
                : "Km \(preKmStr): \(cueItems) before \(gradeStr)% climb"

            return ClimbSplit(
                index: climb.index,
                category: climb.category,
                name: climb.name,
                startKm: climb.startKm,
                endKm: climb.endKm,
                lengthKm: climb.lengthKm,
                elevationGainM: climb.elevationGainM,
                avgGradePct: climb.avgGradePct,
                maxGradePct: climb.maxGradePct,
                startEleM: climb.startEleM,
                summitEleM: climb.summitEleM,
                targetWatts: targetWatts,
                wattsPerKg: wattsPerKg,
                ftpPercent: climbPhys.ftpPercent,
                powerZone: climbPhys.powerZone,
                climbSpeedKmH: climbPhys.effectiveSpeedKmH,
                durationMinutes: durationMinutes,
                durationFormatted: formatClimbDuration(Double(durationMinutes)),
                vamMetersPerHour: vamMetersPerHour,
                etaStartHHMM: etaStartHHMM,
                fuelingCue: fuelingCue
            )
        }

        let intervalMin = max(25, min(45, options.checkpointIntervalMinutes ?? 35))
        let curveTotalSec = pacingCurve.last?.elapsedSec ?? (rideHours * 3600.0)
        let totalRideMin = max(JSCompat.jsRoundInt(rideHours * 60.0), JSCompat.jsRoundInt(curveTotalSec / 60.0))
        var checkpoints: [FuelingCheckpoint] = []

        if totalRideMin >= intervalMin {
            let hourlyFluid = max(350, hydrationPlan.targetFluidMlPerHr > 0 ? hydrationPlan.targetFluidMlPerHr : 450)
            let hourlyCarbs = carbTarget.recommendedGPerHr

            var tMin = intervalMin
            while tMin <= totalRideMin - 10 {
                let distKm = JSCompat.roundTo(min(totalDistanceKm - 0.5, interpolateDistKmAtSeconds(pacingCurve, Double(tMin * 60))), decimals: 1)
                if distKm >= 1 {
                    let intervalHours = Double(intervalMin) / 60.0
                    let carbsGrams = hourlyCarbs > 0 ? JSCompat.jsRoundInt((hourlyCarbs * intervalHours) / 5.0) * 5 : 0
                    let fluidMl = JSCompat.jsRoundInt((Double(hourlyFluid) * intervalHours) / 50.0) * 50
                    let unitDesc = buildFuelUnitLabel(carbsG: carbsGrams, fluidMl: fluidMl, pref: pref, lang: lang)

                    let upcomingClimb = climbs.first(where: { $0.startKm - distKm >= 0 && $0.startKm - distKm <= 2.5 })
                    let distStr = Self.jsNum(distKm)
                    let label = isFr ? "Km \(distStr) : \(unitDesc)" : "Km \(distStr): \(unitDesc)"

                    var detailParts: [String] = []
                    if carbsGrams > 0 { detailParts.append(isFr ? "\(carbsGrams) g glucides" : "\(carbsGrams) g carbs") }
                    detailParts.append("\(fluidMl) ml")
                    detailParts.append(formatClimbDuration(Double(tMin)))
                    if let up = upcomingClimb {
                        detailParts.append(isFr ? "avant \(up.name)" : "pre-\(up.name)")
                    }

                    checkpoints.append(FuelingCheckpoint(
                        id: "cp-\(tMin)",
                        distKm: distKm,
                        elapsedMinutes: tMin,
                        etaHHMM: shiftHHMM(departureTimeHHMM, addMinutes: Double(tMin)),
                        kind: upcomingClimb != nil ? "pre-climb" : (carbsGrams > 0 ? "fuel-and-hydration" : "hydration"),
                        carbsGrams: carbsGrams,
                        fluidMl: fluidMl,
                        label: label,
                        shortFitCue: buildShortFitCue(carbsG: carbsGrams, fluidMl: fluidMl, isFr: isFr),
                        detail: detailParts.joined(separator: " · ")
                    ))
                }
                tMin += intervalMin
            }
        }

        let totalClimbKm = JSCompat.roundTo(climbs.reduce(0.0) { $0 + $1.lengthKm }, decimals: 1)
        let totalClimbGainM = climbs.reduce(0) { $0 + $1.elevationGainM }

        return ClimbSplitsSummary(
            climbs: climbs,
            checkpoints: checkpoints,
            totalClimbKm: totalClimbKm,
            totalClimbGainM: totalClimbGainM,
            recommendedCarbsGPerHr: carbTarget.recommendedGPerHr,
            targetFluidMlPerHr: hydrationPlan.targetFluidMlPerHr > 0 ? hydrationPlan.targetFluidMlPerHr : 450,
            isSynthesizedProfile: !hasExplicitProfile
        )
    }

    private static func jsNum(_ v: Double) -> String {
        v == v.rounded() ? String(Int(v)) : String(v)
    }
}
