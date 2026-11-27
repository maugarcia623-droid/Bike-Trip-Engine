import Foundation

public struct PhysicsEnvironmentContext: Codable, Sendable, Equatable {
    public var isTubeless: Bool?
    public var osmWeightedCrr: Double?
    public var surfaceDataSource: String? // "osm-overpass" | "heuristic-fallback"
    public var surfaceSegments: [SurfaceSegment]?
    public var nightPercent: Double?
    public var twilightPercent: Double?

    public init(
        isTubeless: Bool? = nil,
        osmWeightedCrr: Double? = nil,
        surfaceDataSource: String? = nil,
        surfaceSegments: [SurfaceSegment]? = nil,
        nightPercent: Double? = nil,
        twilightPercent: Double? = nil
    ) {
        self.isTubeless = isTubeless
        self.osmWeightedCrr = osmWeightedCrr
        self.surfaceDataSource = surfaceDataSource
        self.surfaceSegments = surfaceSegments
        self.nightPercent = nightPercent
        self.twilightPercent = twilightPercent
    }
}

public enum PhysicsEngine {
    public static let gravity: Double = 9.81
    public static let osmPavedReferenceCrr: Double = 0.0045

    public static func calculateAirDensity(tempC: Double, pressureHpa: Double = 1013) -> Double {
        let tempK = tempC + 273.15
        let pressurePa = pressureHpa * 100.0
        let rSpecific = 287.058
        let rho = pressurePa / (rSpecific * tempK)
        return JSCompat.roundTo(rho, decimals: 3)
    }

    private static let compassEn = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    private static let compassFr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"]

    public static func degreesToCompassCardinal(_ degrees: Double, lang: CadenceLang = .en) -> String {
        let normalized = JSCompat.posMod(degrees, 360.0)
        let index = JSCompat.jsRoundInt(normalized / 22.5) % 16
        return lang == .fr ? compassFr[index] : compassEn[index]
    }

    public static func classifyRoadSurfaceCondition(_ weather: WeatherCondition) -> RoadSurfaceCondition {
        let rainRisk = weather.precipitationRiskPercent
        let recentMm = weather.recentPrecipitationMm ?? 0
        let code = weather.weatherCode ?? 0
        let tempC = weather.temperatureC
        let humidity = weather.relativeHumidity
        let visKm = weather.visibilityKm

        let isRainCode = (code >= 51 && code <= 67) || (code >= 71 && code <= 77) || (code >= 80 && code <= 86) || code >= 95
        if rainRisk >= 35 || recentMm >= 1.0 || isRainCode {
            return .wet
        }

        let isFogCode = code == 45 || code == 48
        let isColdDew = (humidity ?? 0) >= 88 && tempC <= 13
        let isColdMist = visKm > 0 && visKm <= 3 && tempC <= 12
        if rainRisk >= 16 || recentMm >= 0.2 || isColdDew || isFogCode || isColdMist {
            return .damp
        }

        return .dry
    }

    public struct EnvironmentalAdjustments: Sendable {
        public let roadCondition: RoadSurfaceCondition
        public let effectiveCrr: Double
        public let crrMultiplier: Double
        public let coldCrrMult: Double
        public let wetCrrMult: Double
        public let cautionPaceFactor: Double
        public let cautionReasons: [String]
        public let surfaceCrrSource: String
    }

    public static func resolveEnvironmentalAdjustments(
        baseCrr: Double,
        weather: WeatherCondition,
        isTubeless: Bool,
        context: PhysicsEnvironmentContext? = nil
    ) -> EnvironmentalAdjustments {
        let safeBaseCrr = max(0.002, baseCrr.isFinite ? baseCrr : 0.0055)
        let roadCondition = classifyRoadSurfaceCondition(weather)

        let useOsmSurface =
            context?.surfaceDataSource == "osm-overpass"
            && (context?.osmWeightedCrr ?? 0) > 0
            && (context?.osmWeightedCrr ?? 0).isFinite
        let surfaceCrrDelta = useOsmSurface ? max(0.0, (context?.osmWeightedCrr ?? 0) - osmPavedReferenceCrr) : 0.0
        let surfaceAdjustedCrr = safeBaseCrr + surfaceCrrDelta

        let tempC = weather.temperatureC.isFinite ? weather.temperatureC : 18.0
        let tempDrop = max(0.0, 16.0 - tempC)
        let coldRatePerDeg = isTubeless ? 0.010 : 0.016
        let coldCrrMult = 1.0 + min(0.30, tempDrop * coldRatePerDeg)

        let wetCrrMult = roadCondition == .wet ? 1.12 : (roadCondition == .damp ? 1.06 : 1.0)
        let effectiveCrr = JSCompat.roundTo(surfaceAdjustedCrr * coldCrrMult * wetCrrMult, decimals: 5)
        let crrMultiplier = JSCompat.roundTo(effectiveCrr / safeBaseCrr, decimals: 3)

        var darkShare = 0.0
        if context?.nightPercent != nil || context?.twilightPercent != nil {
            let night = max(0.0, context?.nightPercent ?? 0)
            let twilight = max(0.0, context?.twilightPercent ?? 0)
            darkShare = min(1.0, (night + 0.5 * twilight) / 100.0)
        } else if weather.isDay == false {
            darkShare = 0.75
        }

        let darkPenalty = darkShare * 0.075
        let wetPenalty = roadCondition == .wet ? 0.05 : (roadCondition == .damp ? 0.025 : 0.0)
        let fogPenalty = (weather.visibilityKm > 0 && weather.visibilityKm < 3) ? 0.03 : 0.0
        let cautionSlowdown = min(0.14, darkPenalty + wetPenalty + fogPenalty)
        let cautionPaceFactor = JSCompat.roundTo(1.0 - cautionSlowdown, decimals: 3)

        var cautionReasons: [String] = []
        if darkPenalty >= 0.015 { cautionReasons.append("dark") }
        if roadCondition == .wet { cautionReasons.append("wet") }
        else if roadCondition == .damp { cautionReasons.append("damp") }
        if coldCrrMult >= 1.06 { cautionReasons.append("cold-tires") }
        if surfaceCrrDelta >= 0.0008 { cautionReasons.append("surface") }

        return EnvironmentalAdjustments(
            roadCondition: roadCondition,
            effectiveCrr: effectiveCrr,
            crrMultiplier: crrMultiplier,
            coldCrrMult: coldCrrMult,
            wetCrrMult: wetCrrMult,
            cautionPaceFactor: cautionPaceFactor,
            cautionReasons: cautionReasons,
            surfaceCrrSource: (useOsmSurface && surfaceCrrDelta > 0) ? "osm-surface" : "bike-baseline"
        )
    }

    public static func getPowerZone(_ ftpPercent: Double) -> String {
        if ftpPercent < 56 { return "Z1" }
        if ftpPercent <= 75 { return "Z2" }
        if ftpPercent <= 90 { return "Z3" }
        if ftpPercent <= 105 { return "Z4" }
        return "Z5"
    }

    public static func solveGroundSpeedMsForLegWatts(
        targetLegWatts: Double,
        systemMassKg: Double,
        cda: Double,
        crr: Double,
        rho: Double,
        gradeFraction: Double,
        windSpeedMs: Double,
        eff: Double
    ) -> Double {
        var low = 1.5
        var high = 20.0
        let sinTheta = sin(atan(gradeFraction))

        for _ in 0..<28 {
            let mid = (low + high) * 0.5
            let rollW = crr * systemMassKg * gravity * mid
            let effAirMs = max(0.0, mid + windSpeedMs)
            let aeroW = 0.5 * rho * cda * pow(effAirMs, 2.0) * mid
            let gravW = systemMassKg * gravity * sinTheta * mid
            let legW = max(5.0, rollW + aeroW + gravW) / eff
            if legW < targetLegWatts {
                low = mid
            } else {
                high = mid
            }
        }
        return (low + high) * 0.5
    }

    private static func goReasonText(
        key: String,
        lang: CadenceLang,
        wind: Double = 0,
        watts: Int = 0,
        zone: String = "Z2",
        min: Int = 0,
        pct: Int = 0
    ) -> String {
        let isFr = lang == .fr
        let windStr = wind.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(wind)) : String(wind)
        switch key {
        case "goReasonGale":
            return isFr
                ? "Avis de vent fort (\(windStr) km/h). Fortes rafales latérales — choisis un parcours abrité ou décale la sortie."
                : "High wind alert (\(windStr) km/h gusts) — consider postponing or taking a sheltered route."
        case "goReasonHeadwind":
            return isFr
                ? "Vent de face sensible (\(windStr) km/h) — tout à fait jouable ! Roule à l’effort sans forcer sur la vitesse."
                : "Headwind (\(windStr) km/h) — completely rideable! +\(watts) W at steady speed, or switch to Steady\u{00A0}effort."
        case "goReasonHeadwindEffort":
            return isFr
                ? "Vent de face (\(windStr) km/h) absorbé en douceur : tu restes à \(watts) W (\(zone)) avec +\(min) min intégrés au\u{00A0}départ."
                : "Headwind (\(windStr) km/h) absorbed: your effort stays comfortable at \(watts) W (\(zone)) and adds +\(min) min to your time."
        case "goReasonPowerFtp":
            return isFr
                ? "Effort soutenu (\(watts) W · \(zone)) — passe en Effort constant pour garder de la\u{00A0}marge."
                : "Heads up: this pace is brisk for you. Switch to Steady effort to ride more relaxed."
        case "goReasonBreeze":
            return isFr
                ? "Brise légère (\(windStr) km/h) — conditions agréables, déjà intégrées à ton\u{00A0}horaire."
                : "Light breeze (\(windStr) km/h) — friendly riding air, already built into your\u{00A0}timing."
        default:
            _ = pct
            return isFr
                ? "Air calme et porteur — pédalage fluide et sans\u{00A0}contrainte."
                : "Calm, gentle air — smooth and easy pedaling\u{00A0}ahead."
        }
    }

    public static func buildEnvironmentContext(
        trip: TripProfile,
        specs: RiderBikeSpecs = .defaultSpecs,
        surfaceBreakdown: SurfaceBreakdown? = nil,
        isTubeless: Bool? = nil,
        departureDate: String? = nil,
        extraBufferMinutes: Double = 0,
        timeZone: TimeZone = TimeZone(identifier: "Europe/Paris") ?? .current
    ) -> PhysicsEnvironmentContext {
        let activeBike = specs.bikes.first { $0.id == specs.activeBikeId } ?? specs.bikes.first
        let tubeless = isTubeless ?? activeBike?.isTubeless ?? true
        let surface = surfaceBreakdown ?? trip.route.terrainSummary?.surfaceBreakdown
        let isOsm = surface?.dataSource == "osm-overpass"

        let baseSpeed = max(8.0, trip.route.targetSpeedKmH > 0 ? trip.route.targetSpeedKmH : 25.0)
        let distKm = max(0.5, trip.route.distanceKm > 0 ? trip.route.distanceKm : 20.0)
        let approxMovingMin = JSCompat.jsRoundInt((distKm / baseSpeed) * 60.0)
        let extraMin = max(0, Int(extraBufferMinutes))

        let approxRolloutHHMM: String?
        if trip.arriveAtMode == false, let dep = trip.departureTime, !dep.isEmpty {
            approxRolloutHHMM = dep
        } else {
            let anchorStr = trip.ruleSettings?.anchorTimeHHMM ?? trip.office.targetGateArrivalTime
            let parts = anchorStr.split(separator: ":").compactMap { Int($0) }
            let h = parts.count > 0 ? parts[0] : 8
            let m = parts.count > 1 ? parts[1] : 30
            let anchorMin = h * 60 + m
            let rolloutMin = JSCompat.posMod(anchorMin - approxMovingMin - extraMin, 1440)
            approxRolloutHHMM = String(format: "%02d:%02d", rolloutMin / 60, rolloutMin % 60)
        }

        let activeStage: TripStage? = {
            guard let stages = trip.stages, let idx = trip.activeStageIndex, stages.indices.contains(idx) else { return nil }
            return stages[idx]
        }()
        let depDate = departureDate ?? activeStage?.departureDate ?? trip.departureDate

        let vis = SolarVisibilityEngine.calculateRideVisibility(
            trip: trip,
            customDate: depDate,
            customRolloutTime: approxRolloutHHMM,
            effectiveSpeedOverrideKmH: baseSpeed,
            timeZone: timeZone
        )

        return PhysicsEnvironmentContext(
            isTubeless: tubeless,
            osmWeightedCrr: isOsm ? surface?.weightedCrr : nil,
            surfaceDataSource: surface?.dataSource,
            surfaceSegments: isOsm ? surface?.segments : nil,
            nightPercent: Double(vis.nightPercent),
            twilightPercent: Double(vis.twilightPercent)
        )
    }

    public static func formatCautionPaceSummary(_ result: PhysicsCalculationResult, lang: CadenceLang = .en) -> String? {
        let isFr = lang == .fr
        let pacePct = JSCompat.jsRoundInt((1.0 - result.cautionPaceFactor) * 100.0)
        let crrPct = JSCompat.jsRoundInt((result.crrMultiplier - 1.0) * 100.0)
        let reasons = result.cautionReasons

        if pacePct <= 0 && crrPct < 8 { return nil }

        var reasonLabels: [String] = []
        if reasons.contains("dark") { reasonLabels.append(isFr ? "nuit" : "dark") }
        if reasons.contains("wet") { reasonLabels.append(isFr ? "mouillé" : "wet") }
        else if reasons.contains("damp") { reasonLabels.append(isFr ? "humide" : "damp") }
        if reasons.contains("surface") { reasonLabels.append("surface") }
        else if reasonLabels.isEmpty && reasons.contains("cold-tires") {
            reasonLabels.append(isFr ? "pneus froids" : "cold tyres")
        }

        let joined = reasonLabels.joined(separator: "/")
        if pacePct > 0 {
            return isFr
                ? "−\(pacePct)% allure\(joined.isEmpty ? "" : " (\(joined))")"
                : "−\(pacePct)% pace\(joined.isEmpty ? "" : " (\(joined))")"
        }
        return "+\(crrPct)% Crr\(joined.isEmpty ? "" : " (\(joined))")"
    }

    public static func calculatePhysics(
        physics: PhysicsParams,
        route: RouteParams,
        weather: WeatherCondition,
        lang: CadenceLang = .en,
        ftpOverride: Double? = nil,
        envContext: PhysicsEnvironmentContext? = nil,
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) -> PhysicsCalculationResult {
        let effectiveSpecs = riderSpecs.effectiveRiderSpecs()
        let activeBike = riderSpecs.bikes.first { $0.id == riderSpecs.activeBikeId } ?? riderSpecs.bikes.first
        let effectiveRiderKg = physics.riderWeightKg > 25 ? physics.riderWeightKg : effectiveSpecs.riderWeightKg

        let isTubeless = envContext?.isTubeless ?? activeBike?.isTubeless ?? true
        let envAdj = resolveEnvironmentalAdjustments(
            baseCrr: physics.crr,
            weather: weather,
            isTubeless: isTubeless,
            context: envContext
        )
        let effectiveCrr = envAdj.effectiveCrr
        let cautionPaceFactor = envAdj.cautionPaceFactor

        let safeBikeKg = (physics.bikeWeightKg.isFinite && physics.bikeWeightKg > 0) ? physics.bikeWeightKg : 9.5
        let safeGearKg = (physics.gearWeightKg.isFinite && physics.gearWeightKg >= 0) ? physics.gearWeightKg : 0.0
        let systemMassKg = JSCompat.roundTo(max(10.0, effectiveRiderKg + safeBikeKg + safeGearKg), decimals: 1)

        let safeCda = (physics.cda.isFinite && physics.cda > 0) ? physics.cda : 0.38
        let eff = min(0.99, max(0.70, physics.drivetrainEfficiency.isFinite ? physics.drivetrainEfficiency : 0.95))
        let safeGradientPct = physics.gradientPercent.isFinite ? physics.gradientPercent : 0.0
        let gradeFraction = safeGradientPct / 100.0
        let sinTheta = sin(atan(gradeFraction))
        let rawRho = weather.airDensityRho ?? physics.rho
        let effectiveRho = (rawRho.isFinite && rawRho > 0) ? rawRho : 1.225
        let safeDistanceKm = (route.distanceKm.isFinite && route.distanceKm > 0) ? route.distanceKm : 0.0

        let resolvedFtp: Double
        if let ftpOverride, ftpOverride.isFinite, ftpOverride >= 80 {
            resolvedFtp = ftpOverride
        } else {
            resolvedFtp = effectiveSpecs.ftpWatts
        }
        let ftpWatts = max(80.0, JSCompat.jsRound(resolvedFtp > 0 ? resolvedFtp : 210.0))

        let targetSpeedKmH = max(5.0, (route.targetSpeedKmH.isFinite && route.targetSpeedKmH > 0) ? route.targetSpeedKmH : 25.0)
        let targetGroundSpeedMs = targetSpeedKmH / 3.6
        let cautiousTargetMs = max(1.5, targetGroundSpeedMs * cautionPaceFactor)

        let calmRollW = effectiveCrr * systemMassKg * gravity * cautiousTargetMs
        let calmAeroW = 0.5 * effectiveRho * safeCda * pow(cautiousTargetMs, 3.0)
        let calmGravW = systemMassKg * gravity * sinTheta * cautiousTargetMs
        let baselineLegWatts = max(25.0, (calmRollW + calmAeroW + calmGravW) / eff)

        var axialWindKmH = 0.0
        if weather.isHeadwindActive {
            if let effHead = weather.effectiveHeadwindKmH, effHead > 0 {
                axialWindKmH = effHead
            } else {
                axialWindKmH = max(0.0, weather.baseWindSpeedKmH)
            }
        } else if weather.windDirection == "tailwind" {
            if let effHead = weather.effectiveHeadwindKmH, effHead < 0 {
                axialWindKmH = effHead
            } else {
                axialWindKmH = -0.7 * max(0.0, weather.baseWindSpeedKmH)
            }
        }
        let windSpeedMs = axialWindKmH / 3.6

        let pacingMode = route.pacingMode == "effort" ? "effort" : "speed"

        let groundSpeedMs: Double
        let uncautionedSpeedMs: Double
        let calmSpeedKmH: Double
        let effectiveSpeedKmH: Double
        let rollingResistanceWatts: Double
        let aerodynamicDragWatts: Double
        let gravityWatts: Double
        let wheelWatts: Double
        let legWatts: Double
        let powerDeltaWatts: Double
        let speedDeltaKmH: Double
        let windDelayMinutes: Int

        if pacingMode == "effort" {
            let cappedLegWatts = max(45.0, (route.targetEffortWatts ?? 0) > 0 ? (route.targetEffortWatts ?? 0) : JSCompat.jsRound(baselineLegWatts))
            let calmSolvedMs = solveGroundSpeedMsForLegWatts(
                targetLegWatts: cappedLegWatts,
                systemMassKg: systemMassKg,
                cda: physics.cda,
                crr: effectiveCrr,
                rho: effectiveRho,
                gradeFraction: gradeFraction,
                windSpeedMs: 0,
                eff: eff
            )
            uncautionedSpeedMs = abs(windSpeedMs) > 0.05
                ? solveGroundSpeedMsForLegWatts(
                    targetLegWatts: cappedLegWatts,
                    systemMassKg: systemMassKg,
                    cda: physics.cda,
                    crr: effectiveCrr,
                    rho: effectiveRho,
                    gradeFraction: gradeFraction,
                    windSpeedMs: windSpeedMs,
                    eff: eff
                )
                : calmSolvedMs

            groundSpeedMs = max(1.5, uncautionedSpeedMs * cautionPaceFactor)
            let calmCautiousMs = max(1.5, calmSolvedMs * cautionPaceFactor)

            calmSpeedKmH = JSCompat.roundTo(calmCautiousMs * 3.6, decimals: 1)
            effectiveSpeedKmH = JSCompat.roundTo(groundSpeedMs * 3.6, decimals: 1)

            let airSpeed = max(0.0, groundSpeedMs + windSpeedMs)
            rollingResistanceWatts = effectiveCrr * systemMassKg * gravity * groundSpeedMs
            aerodynamicDragWatts = 0.5 * effectiveRho * physics.cda * pow(airSpeed, 2.0) * groundSpeedMs
            gravityWatts = systemMassKg * gravity * sinTheta * groundSpeedMs
            wheelWatts = max(5.0, rollingResistanceWatts + aerodynamicDragWatts + gravityWatts)
            legWatts = wheelWatts / eff

            powerDeltaWatts = 0
            speedDeltaKmH = weather.isHeadwindActive ? JSCompat.roundTo(max(0.0, calmSpeedKmH - effectiveSpeedKmH), decimals: 1) : 0.0

            let calmMinutes = safeDistanceKm > 0 ? JSCompat.jsRoundInt(((safeDistanceKm * 1000.0) / max(0.5, calmCautiousMs)) / 60.0) : 0
            let actualMinutes = safeDistanceKm > 0 ? JSCompat.jsRoundInt(((safeDistanceKm * 1000.0) / max(0.5, groundSpeedMs)) / 60.0) : 0
            windDelayMinutes = max(0, actualMinutes - calmMinutes)
        } else {
            uncautionedSpeedMs = targetGroundSpeedMs
            groundSpeedMs = cautiousTargetMs
            calmSpeedKmH = JSCompat.roundTo(groundSpeedMs * 3.6, decimals: 1)
            effectiveSpeedKmH = JSCompat.roundTo(groundSpeedMs * 3.6, decimals: 1)

            let airSpeed = max(0.0, groundSpeedMs + windSpeedMs)
            rollingResistanceWatts = effectiveCrr * systemMassKg * gravity * groundSpeedMs
            aerodynamicDragWatts = 0.5 * effectiveRho * physics.cda * pow(airSpeed, 2.0) * groundSpeedMs
            gravityWatts = systemMassKg * gravity * sinTheta * groundSpeedMs
            wheelWatts = max(5.0, rollingResistanceWatts + aerodynamicDragWatts + gravityWatts)
            legWatts = wheelWatts / eff

            powerDeltaWatts = weather.isHeadwindActive ? max(0.0, legWatts - baselineLegWatts) : 0.0
            let eqEffortMs = weather.isHeadwindActive
                ? solveGroundSpeedMsForLegWatts(
                    targetLegWatts: baselineLegWatts,
                    systemMassKg: systemMassKg,
                    cda: physics.cda,
                    crr: effectiveCrr,
                    rho: effectiveRho,
                    gradeFraction: gradeFraction,
                    windSpeedMs: windSpeedMs,
                    eff: eff
                )
                : groundSpeedMs
            speedDeltaKmH = weather.isHeadwindActive ? JSCompat.roundTo(max(0.0, effectiveSpeedKmH - eqEffortMs * 3.6), decimals: 1) : 0.0
            windDelayMinutes = 0
        }

        let airSpeedMs = max(0.0, groundSpeedMs + windSpeedMs)
        let safeRiderKg = max(35.0, effectiveRiderKg > 0 ? effectiveRiderKg : 68.0)
        let wattsPerKg = JSCompat.roundTo(legWatts / safeRiderKg, decimals: 2)
        let ftpPercent = JSCompat.jsRoundInt((legWatts / ftpWatts) * 100.0)
        let powerZone = getPowerZone(Double(ftpPercent))

        let distanceMeters = safeDistanceKm * 1000.0
        let safeGroundMs = max(0.5, groundSpeedMs.isFinite ? groundSpeedMs : 1.5)
        let safeUncautionedMs = max(0.5, uncautionedSpeedMs.isFinite ? uncautionedSpeedMs : safeGroundMs)
        let movingTimeSecondsFloat = distanceMeters > 0 ? distanceMeters / safeGroundMs : 0.0
        let uncautionedMovingSeconds = distanceMeters > 0 ? distanceMeters / safeUncautionedMs : 0.0
        let cautionDelayMinutes = distanceMeters > 0
            ? max(0, JSCompat.jsRoundInt((movingTimeSecondsFloat - uncautionedMovingSeconds) / 60.0))
            : 0

        let hours = Int(floor(movingTimeSecondsFloat / 3600.0))
        let minutes = Int(floor(movingTimeSecondsFloat.truncatingRemainder(dividingBy: 3600.0) / 60.0))
        let seconds = Int(floor(movingTimeSecondsFloat.truncatingRemainder(dividingBy: 60.0)))
        let movingTimeFormatted = "\(hours > 0 ? "\(hours) h " : "")\(minutes) min \(String(format: "%02d", seconds)) s"

        let safeLegWatts = legWatts.isFinite ? legWatts : 0.0
        let totalWorkKj = movingTimeSecondsFloat > 0 ? (safeLegWatts * movingTimeSecondsFloat) / 1000.0 : 0.0
        let grossEff = min(0.26, max(0.15, physics.grossMechanicalEfficiency.isFinite ? physics.grossMechanicalEfficiency : 0.21))
        let totalKcalBurn = totalWorkKj > 0 ? totalWorkKj / (grossEff * 4.184) : 0.0

        let movingHours = movingTimeSecondsFloat / 3600.0
        let hourlyBurnKcal = movingHours > 0 ? totalKcalBurn / movingHours : 0.0
        let carbFraction = min(0.88, max(0.42, 0.38 + (Double(ftpPercent) / 115.0) * 0.48))
        let carbOxidationGramPerHour = movingHours > 0 ? JSCompat.jsRound((hourlyBurnKcal * carbFraction) / 4.0) : 0.0
        let totalCarbsBurnedGrams = movingHours > 0 ? JSCompat.jsRound(carbOxidationGramPerHour * movingHours) : 0.0

        var goStatus = "GO"
        var goStatusReason = goReasonText(key: "goReasonCalm", lang: lang)
        let windKmh = weather.isHeadwindActive ? weather.baseWindSpeedKmH : 0.0

        if windKmh >= 32 || weather.estuaryGustKmH >= 52 {
            goStatus = "NO-GO"
            goStatusReason = goReasonText(key: "goReasonGale", lang: lang, wind: windKmh)
        } else if (windKmh >= 22 && pacingMode == "speed") || windKmh >= 26 || ftpPercent > 90 {
            goStatus = "CAUTION"
            if windKmh >= 22 {
                goStatusReason = pacingMode == "effort"
                    ? goReasonText(key: "goReasonHeadwindEffort", lang: lang, wind: windKmh, watts: JSCompat.jsRoundInt(legWatts), zone: powerZone, min: windDelayMinutes)
                    : goReasonText(key: "goReasonHeadwind", lang: lang, wind: windKmh, watts: JSCompat.jsRoundInt(powerDeltaWatts))
            } else {
                goStatusReason = goReasonText(key: "goReasonPowerFtp", lang: lang, watts: JSCompat.jsRoundInt(legWatts), zone: powerZone, pct: ftpPercent)
            }
        } else {
            goStatus = "GO"
            if windKmh >= 14 && pacingMode == "effort" {
                goStatusReason = goReasonText(key: "goReasonHeadwindEffort", lang: lang, wind: windKmh, watts: JSCompat.jsRoundInt(legWatts), zone: powerZone, min: windDelayMinutes)
            } else {
                goStatusReason = windKmh > 0
                    ? goReasonText(key: "goReasonBreeze", lang: lang, wind: windKmh)
                    : goReasonText(key: "goReasonCalm", lang: lang)
            }
        }

        return PhysicsCalculationResult(
            systemMassKg: systemMassKg,
            groundSpeedMs: groundSpeedMs,
            airSpeedMs: airSpeedMs,
            effectiveSpeedKmH: effectiveSpeedKmH,
            calmSpeedKmH: calmSpeedKmH,
            baselineLegWatts: baselineLegWatts,
            rollingResistanceWatts: rollingResistanceWatts,
            aerodynamicDragWatts: aerodynamicDragWatts,
            gravityWatts: gravityWatts,
            wheelWatts: wheelWatts,
            legWatts: legWatts,
            wattsPerKg: wattsPerKg,
            ftpWatts: ftpWatts,
            ftpPercent: Double(ftpPercent),
            powerZone: powerZone,
            pacingMode: pacingMode,
            windDelayMinutes: windDelayMinutes,
            movingTimeSeconds: movingTimeSecondsFloat,
            movingTimeFormatted: movingTimeFormatted,
            totalWorkKj: totalWorkKj,
            totalKcalBurn: totalKcalBurn,
            carbOxidationGramPerHour: carbOxidationGramPerHour,
            totalCarbsBurnedGrams: totalCarbsBurnedGrams,
            speedDeltaKmH: speedDeltaKmH,
            powerDeltaWatts: powerDeltaWatts,
            goStatus: goStatus,
            goStatusReason: goStatusReason,
            effectiveCrr: envAdj.effectiveCrr,
            crrMultiplier: envAdj.crrMultiplier,
            roadCondition: envAdj.roadCondition,
            cautionPaceFactor: envAdj.cautionPaceFactor,
            cautionDelayMinutes: cautionDelayMinutes,
            cautionReasons: envAdj.cautionReasons,
            surfaceCrrSource: envAdj.surfaceCrrSource
        )
    }

    public struct ZoneTimeShare: Codable, Sendable, Equatable {
        public var zone: String
        public var pctTime: Int
        public var minutes: Int
        public var wattsRange: String
    }

    public struct SectionalEffortBand: Codable, Sendable, Equatable, Identifiable {
        public var id: String
        public var title: String
        public var subtitle: String
        public var pctDistance: Int
        public var distanceKm: Double
        public var avgWatts: Int
        public var peakWatts: Int
        public var zone: String
        public var kcalShare: Int
        public var avgSpeedKmH: Double
    }

    public struct EffortTracePoint: Codable, Sendable, Equatable {
        public var distKm: Double
        public var eleM: Double
        public var watts: Int
        public var gradePct: Double
        public var zone: String
    }

    public struct SectionalEnergySummary: Codable, Sendable, Equatable {
        public var isFromGpx: Bool
        public var zoneShares: [ZoneTimeShare]
        public var bands: [SectionalEffortBand]
        public var peakClimbWatts: Int
        public var peakZone: String
        public var effortTrace: [EffortTracePoint]
        public var peakAtKm: Double
        public var peakGradePct: Double
        public var totalMinutes: Int
        public var totalDistanceKm: Double
        public var elevationGainM: Int
        public var ftpWatts: Int
    }

    public struct WattsDidacticGuide: Codable, Sendable, Equatable {
        public var headline: String
        public var breathingCue: String
        public var everydayAnalogy: String
        public var whatIsWatts: String
        public var whatIsFtp: String
        public var whatIsWkg: String
    }

    public static func calculateSectionalEnergyBreakdown(
        physics: PhysicsParams,
        route: RouteParams,
        weather: WeatherCondition,
        result: PhysicsCalculationResult,
        lang: CadenceLang = .en,
        envContext: PhysicsEnvironmentContext? = nil,
        riderSpecs: RiderBikeSpecs = .defaultSpecs
    ) -> SectionalEnergySummary {
        let isFr = lang == .fr
        let isFromGpx = (route.elevationProfile?.count ?? 0) >= 3
        let elevationProfile = GpxParserEngine.synthesizeRouteElevationProfile(route).elevationProfile

        let systemMassKg = result.systemMassKg
        let eff = min(0.99, max(0.7, physics.drivetrainEfficiency))
        let _ = min(0.26, max(0.15, physics.grossMechanicalEfficiency))
        let effectiveRho = weather.airDensityRho ?? physics.rho
        let ftp = max(80.0, result.ftpWatts)

        let activeBike = riderSpecs.bikes.first(where: { $0.id == riderSpecs.activeBikeId }) ?? riderSpecs.bikes.first
        let isTubeless = envContext?.isTubeless ?? activeBike?.isTubeless ?? true
        let envAdj = resolveEnvironmentalAdjustments(
            baseCrr: physics.crr,
            weather: weather,
            isTubeless: isTubeless,
            context: envContext
        )
        let baseEffectiveCrr = result.effectiveCrr
        let cautionFactor = result.cautionPaceFactor
        let osmSegments: [SurfaceSegment]? = (
            envContext?.surfaceDataSource == "osm-overpass" &&
            (envContext?.surfaceSegments?.isEmpty == false)
        ) ? envContext?.surfaceSegments : nil

        func resolveSegmentCrr(distKm: Double) -> Double {
            guard let segs = osmSegments else { return baseEffectiveCrr }
            let seg = segs.first(where: { distKm >= $0.startKm && distKm <= $0.endKm }) ?? segs.last
            guard let seg = seg, seg.effectiveCrr.isFinite else { return baseEffectiveCrr }
            let segDelta = max(0.0, seg.effectiveCrr - 0.0042)
            return JSCompat.roundTo((physics.crr + segDelta) * envAdj.coldCrrMult * envAdj.wetCrrMult, decimals: 5)
        }

        var axialWindKmH = 0.0
        if weather.isHeadwindActive {
            if let effHead = weather.effectiveHeadwindKmH, effHead > 0 {
                axialWindKmH = effHead
            } else {
                axialWindKmH = max(0.0, weather.baseWindSpeedKmH)
            }
        } else if weather.windDirection == "tailwind" {
            if let effHead = weather.effectiveHeadwindKmH, effHead < 0 {
                axialWindKmH = effHead
            } else {
                axialWindKmH = -0.7 * max(0.0, weather.baseWindSpeedKmH)
            }
        }
        let windMs = axialWindKmH / 3.6

        var zoneSeconds: [String: Double] = ["Z1": 0, "Z2": 0, "Z3": 0, "Z4": 0, "Z5": 0]
        struct BucketAcc {
            var distKm = 0.0
            var timeSec = 0.0
            var workKj = 0.0
            var peakW = 0.0
        }
        var easyBucket = BucketAcc()
        var rollingBucket = BucketAcc()
        var climbsBucket = BucketAcc()

        var peakClimbWatts = JSCompat.jsRoundInt(result.legWatts)
        var peakAtKm = 0.0
        var peakGradePct = 0.0
        var elevationGainM = 0.0
        var rawTrace: [(distKm: Double, eleM: Double, watts: Double, timeSec: Double, gradePct: Double)] = []

        if elevationProfile.count >= 2 {
            for i in 1..<elevationProfile.count {
                let prev = elevationProfile[i - 1]
                let curr = elevationProfile[i]
                let segDistKm = max(0.02, curr.distKm - prev.distKm)
                let gradePct = curr.gradePct
                let gradeFrac = gradePct / 100.0
                let sinTheta = sin(atan(gradeFrac))
                let segCrr = resolveSegmentCrr(distKm: (prev.distKm + curr.distKm) * 0.5)

                let segSpeedMs: Double
                let segLegWatts: Double

                if result.pacingMode == "effort" {
                    let modFactor: Double
                    if gradePct < -2 { modFactor = 0.48 }
                    else if gradePct < 0.8 { modFactor = 0.86 }
                    else if gradePct <= 3.5 { modFactor = 1.04 }
                    else { modFactor = min(1.42, 1.12 + (gradePct - 3.5) * 0.055) }

                    let minClimbSpeedMs = 2.1
                    let minClimbW = gradePct > 3
                        ? max(0.0, (segCrr * systemMassKg * gravity * minClimbSpeedMs + systemMassKg * gravity * sinTheta * minClimbSpeedMs) / eff)
                        : 35.0
                    let targetSegW = max(35.0, minClimbW, result.legWatts * modFactor)
                    let solvedSegMs = solveGroundSpeedMsForLegWatts(
                        targetLegWatts: targetSegW,
                        systemMassKg: systemMassKg,
                        cda: physics.cda,
                        crr: segCrr,
                        rho: effectiveRho,
                        gradeFraction: gradeFrac,
                        windSpeedMs: windMs,
                        eff: eff
                    )
                    segSpeedMs = max(1.5, solvedSegMs * cautionFactor)
                    segLegWatts = targetSegW
                } else {
                    let baseSpeedKmH = route.targetSpeedKmH > 0 ? route.targetSpeedKmH : 25.0
                    let desiredMs = max(2.0, (baseSpeedKmH / 3.6) * cautionFactor)
                    var provisionalSpeedMs = gradePct < -2.5 ? min(13.5, desiredMs * 1.18) : desiredMs

                    let airMs = max(0.0, provisionalSpeedMs + windMs)
                    let rawWheelW =
                        segCrr * systemMassKg * gravity * provisionalSpeedMs +
                        0.5 * effectiveRho * physics.cda * pow(airMs, 2.0) * provisionalSpeedMs +
                        systemMassKg * gravity * sinTheta * provisionalSpeedMs
                    let rawLegW = max(25.0, rawWheelW / eff)
                    let ceilingW = ftp * 1.38
                    if rawLegW > ceilingW && gradePct > 1.5 {
                        segLegWatts = ceilingW
                        provisionalSpeedMs = solveGroundSpeedMsForLegWatts(
                            targetLegWatts: ceilingW,
                            systemMassKg: systemMassKg,
                            cda: physics.cda,
                            crr: segCrr,
                            rho: effectiveRho,
                            gradeFraction: gradeFrac,
                            windSpeedMs: windMs,
                            eff: eff
                        )
                    } else {
                        segLegWatts = rawLegW
                    }
                    segSpeedMs = provisionalSpeedMs
                }

                let dtSec = (segDistKm * 1000.0) / max(1.5, segSpeedMs)
                let workKj = (segLegWatts * dtSec) / 1000.0
                let zone = getPowerZone(JSCompat.jsRound((segLegWatts / ftp) * 100.0))
                zoneSeconds[zone, default: 0] += dtSec

                let roundedSegW = JSCompat.jsRoundInt(segLegWatts)
                if roundedSegW > peakClimbWatts || Int(segLegWatts) > peakClimbWatts {
                    if segLegWatts > Double(peakClimbWatts) {
                        peakClimbWatts = roundedSegW
                        peakAtKm = curr.distKm
                        peakGradePct = gradePct
                    }
                }
                if curr.eleM > prev.eleM {
                    elevationGainM += curr.eleM - prev.eleM
                }
                rawTrace.append((curr.distKm, curr.eleM, segLegWatts, dtSec, gradePct))

                if gradePct < 1.0 {
                    easyBucket.distKm += segDistKm
                    easyBucket.timeSec += dtSec
                    easyBucket.workKj += workKj
                    if segLegWatts > easyBucket.peakW { easyBucket.peakW = segLegWatts }
                } else if gradePct <= 3.5 {
                    rollingBucket.distKm += segDistKm
                    rollingBucket.timeSec += dtSec
                    rollingBucket.workKj += workKj
                    if segLegWatts > rollingBucket.peakW { rollingBucket.peakW = segLegWatts }
                } else {
                    climbsBucket.distKm += segDistKm
                    climbsBucket.timeSec += dtSec
                    climbsBucket.workKj += workKj
                    if segLegWatts > climbsBucket.peakW { climbsBucket.peakW = segLegWatts }
                }
            }
        }

        let rawTotalKj = max(1.0, easyBucket.workKj + rollingBucket.workKj + climbsBucket.workKj)
        let totalTimeSec = max(1.0, zoneSeconds.values.reduce(0.0, +))
        let totalDistKm = max(0.1, easyBucket.distKm + rollingBucket.distKm + climbsBucket.distKm)

        let zoneRanges: [String: String] = [
            "Z1": "< \(JSCompat.jsRoundInt(ftp * 0.56))W",
            "Z2": "\(JSCompat.jsRoundInt(ftp * 0.56))–\(JSCompat.jsRoundInt(ftp * 0.75))W",
            "Z3": "\(JSCompat.jsRoundInt(ftp * 0.76))–\(JSCompat.jsRoundInt(ftp * 0.90))W",
            "Z4": "\(JSCompat.jsRoundInt(ftp * 0.91))–\(JSCompat.jsRoundInt(ftp * 1.05))W",
            "Z5": "> \(JSCompat.jsRoundInt(ftp * 1.05))W"
        ]

        let zoneOrder = ["Z1", "Z2", "Z3", "Z4", "Z5"]
        var zoneShares = zoneOrder.map { z in
            ZoneTimeShare(
                zone: z,
                pctTime: JSCompat.jsRoundInt((zoneSeconds[z, default: 0] / totalTimeSec) * 100.0),
                minutes: JSCompat.jsRoundInt(zoneSeconds[z, default: 0] / 60.0),
                wattsRange: zoneRanges[z] ?? ""
            )
        }

        let sumPct = zoneShares.reduce(0) { $0 + $1.pctTime }
        if sumPct != 100 && sumPct > 0 {
            var largestIdx = 0
            for i in 1..<zoneShares.count {
                if zoneShares[i].pctTime > zoneShares[largestIdx].pctTime {
                    largestIdx = i
                }
            }
            zoneShares[largestIdx].pctTime = max(0, zoneShares[largestIdx].pctTime + (100 - sumPct))
        }

        let hasRouteDistance = route.distanceKm.isFinite && route.distanceKm > 0
        func makeBand(id: String, bucket: BucketAcc, title: String, subtitle: String, fallbackMult: Double) -> SectionalEffortBand {
            let avgW = bucket.timeSec > 5
                ? JSCompat.jsRoundInt((bucket.workKj * 1000.0) / bucket.timeSec)
                : JSCompat.jsRoundInt(result.legWatts * fallbackMult)
            let peakW = bucket.peakW > 0
                ? JSCompat.jsRoundInt(bucket.peakW)
                : JSCompat.jsRoundInt(Double(avgW) * 1.12)
            let safeTotalKcal = (result.totalKcalBurn.isFinite && result.totalKcalBurn > 0) ? result.totalKcalBurn : 0.0
            let kcal = (hasRouteDistance && safeTotalKcal > 0)
                ? JSCompat.jsRoundInt((bucket.workKj / rawTotalKj) * safeTotalKcal)
                : 0
            let avgSpd = bucket.timeSec > 5
                ? JSCompat.roundTo(bucket.distKm / (bucket.timeSec / 3600.0), decimals: 1)
                : JSCompat.roundTo(result.effectiveSpeedKmH, decimals: 1)
            return SectionalEffortBand(
                id: id,
                title: title,
                subtitle: subtitle,
                pctDistance: hasRouteDistance ? JSCompat.jsRoundInt((bucket.distKm / totalDistKm) * 100.0) : 0,
                distanceKm: hasRouteDistance ? JSCompat.roundTo(bucket.distKm, decimals: 1) : 0.0,
                avgWatts: avgW,
                peakWatts: peakW,
                zone: getPowerZone(JSCompat.jsRound((Double(avgW) / ftp) * 100.0)),
                kcalShare: (hasRouteDistance && safeTotalKcal > 0 && bucket.distKm > 0.05) ? max(5, kcal) : 0,
                avgSpeedKmH: avgSpd
            )
        }

        let bands: [SectionalEffortBand] = [
            makeBand(
                id: "easy",
                bucket: easyBucket,
                title: isFr ? "Plats abrités & Descentes" : "Sheltered Flats & Descents",
                subtitle: isFr ? "Récupération active, souplesse de pédalage" : "Active recovery & light cadence spin",
                fallbackMult: 0.74
            ),
            makeBand(
                id: "rolling",
                bucket: rollingBucket,
                title: isFr ? "Faux-plats & Sections ventées" : "Rolling Cruise & Wind Exposure",
                subtitle: isFr ? "Allure endurance régulière en prise d’air" : "Steady endurance rhythm on undulating roads",
                fallbackMult: 1.04
            ),
            makeBand(
                id: "climbs",
                bucket: climbsBucket,
                title: isFr ? "Côtes & Relances (>3,5 %)" : "Climbs & Punchy Ramps (>3.5%)",
                subtitle: isFr ? "Pic d’effort musculaire — moulinez tôt !" : "Peak muscular effort — shift down early!",
                fallbackMult: 1.32
            )
        ]

        let peakZone = getPowerZone(JSCompat.jsRound((Double(peakClimbWatts) / ftp) * 100.0))

        let maxTracePoints = 96
        var effortTrace: [EffortTracePoint] = []
        if let first = elevationProfile.first {
            let firstW = rawTrace.first?.watts ?? result.legWatts
            effortTrace.append(EffortTracePoint(
                distKm: first.distKm,
                eleM: first.eleM,
                watts: JSCompat.jsRoundInt(firstW),
                gradePct: rawTrace.first?.gradePct ?? 0.0,
                zone: getPowerZone(JSCompat.jsRound((firstW / ftp) * 100.0))
            ))
        }

        let step = max(1, Int(ceil(Double(rawTrace.count) / Double(maxTracePoints))))
        var s = 0
        while s < rawTrace.count {
            let end = min(rawTrace.count, s + step)
            let chunk = rawTrace[s..<end]
            let tSum = chunk.reduce(0.0) { $0 + $1.timeSec }
            let t = tSum != 0 ? tSum : 1.0
            let w = chunk.reduce(0.0) { $0 + $1.watts * $1.timeSec } / t
            let g = chunk.reduce(0.0) { $0 + $1.gradePct * $1.timeSec } / t
            let last = chunk[chunk.index(before: chunk.endIndex)]
            let n = floor(g * 10.0 + 0.5)
            let exactLessThanMid = fma(g, 10.0, -(n - 0.5)) < 0.0
            let roundedG = (exactLessThanMid ? (n - 1.0) : n) / 10.0
            effortTrace.append(EffortTracePoint(
                distKm: last.distKm,
                eleM: last.eleM,
                watts: JSCompat.jsRoundInt(w),
                gradePct: roundedG,
                zone: getPowerZone(JSCompat.jsRound((w / ftp) * 100.0))
            ))
            s += step
        }

        return SectionalEnergySummary(
            isFromGpx: isFromGpx,
            zoneShares: zoneShares,
            bands: bands,
            peakClimbWatts: peakClimbWatts,
            peakZone: peakZone,
            effortTrace: effortTrace,
            peakAtKm: JSCompat.roundTo(peakAtKm, decimals: 1),
            peakGradePct: JSCompat.roundTo(peakGradePct, decimals: 1),
            totalMinutes: JSCompat.jsRoundInt(totalTimeSec / 60.0),
            totalDistanceKm: JSCompat.roundTo(totalDistKm, decimals: 1),
            elevationGainM: JSCompat.jsRoundInt(elevationGainM),
            ftpWatts: JSCompat.jsRoundInt(ftp)
        )
    }

    public static func getWattsDidacticExplanation(
        legWatts: Double,
        ftpWatts: Double,
        riderWeightKg: Double,
        lang: CadenceLang = .en
    ) -> WattsDidacticGuide {
        let isFr = lang == .fr
        let roundedW = JSCompat.jsRoundInt(legWatts)
        let pct = JSCompat.jsRoundInt((legWatts / max(80.0, ftpWatts)) * 100.0)
        let weight = riderWeightKg > 0 ? max(35.0, riderWeightKg) : 70.0
        let wkg = JSCompat.jsFixed(legWatts / weight, decimals: 1)

        let headline: String
        let breathingCue: String
        let everydayAnalogy: String

        if pct < 56 {
            headline = isFr ? "\(roundedW) W — Promenade fluide & très confortable" : "\(roundedW)W — Gentle, effortless spin"
            breathingCue = isFr ? "Respiration calme par le nez, conversation fluide sans aucun essoufflement." : "Easy nasal breathing — you can chat in full paragraphs all day."
            everydayAnalogy = isFr ? "Équivaut à une marche tranquille sur terrain plat." : "Feels like an unhurried stroll on flat ground."
        } else if pct <= 75 {
            headline = isFr ? "\(roundedW) W — Allure endurance idéale (rythme voyage)" : "\(roundedW)W — All-day bikepacking endurance pace"
            breathingCue = isFr ? "Vous parlez en phrases complètes ; les jambes chauffent doucement sans brûler." : "Comfortable full-sentence conversation; warm legs with zero burn."
            everydayAnalogy = isFr ? "Équivaut à une marche rapide et tonique en discutant." : "Feels like a brisk, purposeful walk with a friend."
        } else if pct <= 90 {
            headline = isFr ? "\(roundedW) W — Allure soutenue \"Tempo\" (effort tonique)" : "\(roundedW)W — Brisk \"Tempo\" effort (engaged & focused)"
            breathingCue = isFr ? "Phrases courtes de 4–5 mots ; concentration active et souffle profond." : "Short 4–5 word phrases; deep rhythmic breathing."
            everydayAnalogy = isFr ? "Équivaut à monter un long escalier d’un pas régulier." : "Feels like climbing a long flight of stairs at a steady clip."
        } else {
            headline = isFr ? "\(roundedW) W — Effort intense près du seuil (à limiter en voyage)" : "\(roundedW)W — High threshold push (best kept short on tours)"
            breathingCue = isFr ? "Un ou deux mots maximum ; jambes sollicitées — passez en \"Effort Fixe\" pour souffler." : "1–2 words at a time; heavy legs — switch to \"Cap Effort\" to ease off."
            everydayAnalogy = isFr ? "Équivaut à courir vite en côte ou grimper deux marches à la fois." : "Feels like a fast uphill run — sustainable for ~45–60 min max."
        }

        let ftpInt = JSCompat.jsRoundInt(ftpWatts)
        let weightStr = weight == weight.rounded() ? String(Int(weight)) : String(weight)

        return WattsDidacticGuide(
            headline: headline,
            breathingCue: breathingCue,
            everydayAnalogy: everydayAnalogy,
            whatIsWatts: isFr
                ? "Les Watts mesurent l'énergie mécanique réelle appuyée sur vos pédales (indépendamment du vent ou de la pente)."
                : "Watts measure the actual leg push on your pedals right now (unlike speed, which drops in wind or hills).",
            whatIsFtp: isFr
                ? "Votre FTP (\(ftpInt) W) est la puissance maximale que vous pouvez tenir pendant 1 heure sans exploser (\(pct) % utilisé ici)."
                : "Your FTP (\(ftpInt)W) is the max steady power you can sustain for 1 hour (\(pct)% used on this ride).",
            whatIsWkg: isFr
                ? "\(wkg) W/kg rapporte votre puissance à votre poids (\(weightStr) kg) — le vrai repère dès que la route grimpe."
                : "\(wkg) W/kg divides your watts by body weight (\(weightStr)kg) — what truly matters on climbs."
        )
    }
}
