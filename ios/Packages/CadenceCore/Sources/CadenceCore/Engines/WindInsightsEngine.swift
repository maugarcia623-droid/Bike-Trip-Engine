import Foundation

public struct HumanWindImpactParams: Sendable {
    public var distanceKm: Double
    public var targetSpeedKmH: Double
    public var riderWeightKg: Double
    public var bikeWeightKg: Double
    public var cda: Double
    public var crr: Double
    public var windSpeedKmH: Double
    public var windRelativeAngleDeg: Double
    public var windFromDegrees: Double?
    public var temperatureC: Double
    public var ftpWatts: Double
    public var lang: CadenceLang

    public init(
        distanceKm: Double,
        targetSpeedKmH: Double,
        riderWeightKg: Double,
        bikeWeightKg: Double,
        cda: Double,
        crr: Double,
        windSpeedKmH: Double,
        windRelativeAngleDeg: Double,
        windFromDegrees: Double? = nil,
        temperatureC: Double = 15,
        ftpWatts: Double = 220,
        lang: CadenceLang = .en
    ) {
        self.distanceKm = distanceKm
        self.targetSpeedKmH = targetSpeedKmH
        self.riderWeightKg = riderWeightKg
        self.bikeWeightKg = bikeWeightKg
        self.cda = cda
        self.crr = crr
        self.windSpeedKmH = windSpeedKmH
        self.windRelativeAngleDeg = windRelativeAngleDeg
        self.windFromDegrees = windFromDegrees
        self.temperatureC = temperatureC
        self.ftpWatts = ftpWatts
        self.lang = lang
    }
}

public struct HumanWindImpactResult: Codable, Sendable, Equatable {
    public let effectiveHeadwindKmH: Double
    public let equivalentGradePct: Double
    public let ghostElevationM: Int
    public let sameEffortSpeedKmH: Double
    public let speedDeltaKmH: Double
    public let calmTimeMin: Int
    public let sameEffortTimeMin: Int
    public let timeDeltaMin: Int
    public let totalRideKcal: Int
    public let calmRideKcal: Int
    public let extraWindKcal: Int
    public let extraCroissants: Double
    public let extraBananas: Double
    public let windyWatts: Int
    public let calmWatts: Int
    public let deltaWatts: Int
    public let airResistanceWatts: Int
    public let airResistanceSharePct: Int
    public let outboundIntoWindDeg: Int?
    public let outboundIntoWindCardinal: String?
    public let returnTailwindCardinal: String?
    public let iconicClimbComparison: String?
}

public enum WindInsightsEngine {
    public static func formatElevationRealWorldScale(meters: Double, lang: CadenceLang) -> String? {
        let m = JSCompat.jsRoundInt(abs(meters))
        let isFr = lang == .fr
        if m < 10 { return nil }

        if m < 45 {
            let floors = max(3, JSCompat.jsRoundInt(Double(m) / 3.0))
            return isFr ? "≈ \(floors) étages d’escaliers" : "≈ \(floors) flights of stairs"
        }
        if m < 85 {
            if m <= 60 {
                return isFr ? "≈ l’Arc de Triomphe" : "≈ the Arc de Triomphe"
            }
            let floors = JSCompat.jsRoundInt(Double(m) / 3.0)
            return isFr ? "≈ un immeuble de \(floors) étages" : "≈ a \(floors)-story building"
        }
        if m < 120 {
            return isFr ? "≈ la Statue de la Liberté" : "≈ the Statue of Liberty"
        }
        if m < 180 {
            return isFr ? "≈ la butte Montmartre" : "≈ climbing Montmartre"
        }
        if m < 270 {
            let pct = JSCompat.jsRoundInt((Double(m) / 300.0) * 100.0)
            return isFr ? "≈ \(pct) % de la Tour Eiffel" : "≈ \(pct)% of the Eiffel Tower"
        }
        if m < 800 {
            let ratio = JSCompat.jsFixed(Double(m) / 300.0, decimals: 1)
            return isFr ? "≈ \(ratio)× la Tour Eiffel" : "≈ \(ratio)× the Eiffel Tower"
        }
        if m < 1500 {
            let ratio = JSCompat.jsFixed(Double(m) / 1071.0, decimals: 1)
            return isFr ? "≈ \(ratio)× l’Alpe d’Huez" : "≈ \(ratio)× Alpe d’Huez"
        }
        let ratio = JSCompat.jsFixed(Double(m) / 1610.0, decimals: 1)
        return isFr ? "≈ \(ratio)× le Mont Ventoux" : "≈ \(ratio)× Mont Ventoux"
    }

    public static func calculateHumanWindImpact(_ params: HumanWindImpactParams) -> HumanWindImpactResult {
        let safeDist = max(1.0, params.distanceKm)
        let safeSpeed = max(10.0, params.targetSpeedKmH)
        let rho = PhysicsEngine.calculateAirDensity(tempC: params.temperatureC, pressureHpa: 1013)
        let effectiveHeadwindKmH = JSCompat.roundTo(
            params.windSpeedKmH * cos(JSCompat.toRad(params.windRelativeAngleDeg)),
            decimals: 1
        )

        func makeRoute(_ speed: Double) -> RouteParams {
            RouteParams(
                origin: "Start",
                destination: "Finish",
                distanceKm: safeDist,
                targetSpeedKmH: speed,
                pacingMode: "speed",
                urbanTrafficDelayMinutes: 0,
                gateSecurityDelayMinutes: 0
            )
        }

        let basePhysics = PhysicsParams(
            luggageWeightKg: 1.5,
            riderWeightKg: params.riderWeightKg,
            bikeWeightKg: params.bikeWeightKg,
            gearWeightKg: 1.5,
            cda: params.cda,
            crr: params.crr,
            rho: rho,
            drivetrainEfficiency: 0.96,
            grossMechanicalEfficiency: 0.24,
            gradientPercent: 0
        )

        func makeWindWeather(wSpeed: Double, effHead: Double, angleDeg: Double) -> WeatherCondition {
            let dir = wSpeed < 2 ? "calm" : (effHead > 2 ? "headwind" : (effHead < -2 ? "tailwind" : "cross-headwind"))
            return WeatherCondition(
                airDensityRho: rho,
                effectiveHeadwindKmH: effHead,
                isHeadwindActive: effHead > 2,
                baseWindSpeedKmH: wSpeed,
                windDirection: dir,
                windDirectionDegrees: angleDeg,
                temperatureC: params.temperatureC,
                precipitationRiskPercent: 10,
                estuaryGustKmH: JSCompat.jsRound(wSpeed * 1.3),
                visibilityKm: 12
            )
        }

        let calmWeather = makeWindWeather(wSpeed: 0, effHead: 0, angleDeg: 0)
        let windyWeather = makeWindWeather(wSpeed: params.windSpeedKmH, effHead: effectiveHeadwindKmH, angleDeg: params.windRelativeAngleDeg)

        let calm = PhysicsEngine.calculatePhysics(
            physics: basePhysics, route: makeRoute(safeSpeed), weather: calmWeather,
            lang: params.lang, ftpOverride: params.ftpWatts
        )
        let windy = PhysicsEngine.calculatePhysics(
            physics: basePhysics, route: makeRoute(safeSpeed), weather: windyWeather,
            lang: params.lang, ftpOverride: params.ftpWatts
        )

        let totalMassKg = params.riderWeightKg + params.bikeWeightKg + 1.5
        let vMs = safeSpeed / 3.6
        let extraAeroWatts = windy.aerodynamicDragWatts - calm.aerodynamicDragWatts
        let extraAeroForceN = vMs > 0 ? extraAeroWatts / vMs : 0.0
        let equivalentGradePct = JSCompat.roundTo((extraAeroForceN / (totalMassKg * PhysicsEngine.gravity)) * 100.0, decimals: 1)
        let ghostElevationM = JSCompat.jsRoundInt(safeDist * 1000.0 * (equivalentGradePct / 100.0))

        let targetEffortWatts = max(40.0, calm.legWatts)
        var lo = 6.0
        var hi = 60.0
        for _ in 0..<22 {
            let mid = (lo + hi) / 2.0
            let probe = PhysicsEngine.calculatePhysics(
                physics: basePhysics, route: makeRoute(mid), weather: windyWeather,
                lang: params.lang, ftpOverride: params.ftpWatts
            )
            if probe.legWatts < targetEffortWatts { lo = mid } else { hi = mid }
        }
        let sameEffortSpeedKmH = JSCompat.roundTo((lo + hi) / 2.0, decimals: 1)
        let speedDeltaKmH = JSCompat.roundTo(sameEffortSpeedKmH - safeSpeed, decimals: 1)

        let calmTimeMin = JSCompat.jsRoundInt((safeDist / safeSpeed) * 60.0)
        let sameEffortTimeMin = JSCompat.jsRoundInt((safeDist / max(6.0, sameEffortSpeedKmH)) * 60.0)
        let timeDeltaMin = sameEffortTimeMin - calmTimeMin

        let totalRideKcal = JSCompat.jsRoundInt(windy.totalKcalBurn)
        let calmRideKcal = JSCompat.jsRoundInt(calm.totalKcalBurn)
        let extraWindKcal = totalRideKcal - calmRideKcal

        let extraCroissants = JSCompat.roundTo(Double(abs(extraWindKcal)) / 260.0, decimals: 1)
        let extraBananas = JSCompat.roundTo(Double(abs(extraWindKcal)) / 95.0, decimals: 1)

        let windyWatts = JSCompat.jsRoundInt(windy.legWatts)
        let calmWatts = JSCompat.jsRoundInt(calm.legWatts)
        let deltaWatts = windyWatts - calmWatts
        let airResistanceWatts = max(0, JSCompat.jsRoundInt(windy.aerodynamicDragWatts))
        let airResistanceSharePct = windy.legWatts > 0
            ? min(100, max(0, JSCompat.jsRoundInt((Double(airResistanceWatts) / windy.legWatts) * 100.0)))
            : 0

        var outboundIntoWindDeg: Int? = nil
        var outboundIntoWindCardinal: String? = nil
        var returnTailwindCardinal: String? = nil
        if let wDeg = params.windFromDegrees, wDeg.isFinite {
            let normalized = JSCompat.posMod(JSCompat.jsRoundInt(wDeg), 360)
            outboundIntoWindDeg = normalized
            outboundIntoWindCardinal = PhysicsEngine.degreesToCompassCardinal(Double(normalized), lang: params.lang)
            returnTailwindCardinal = PhysicsEngine.degreesToCompassCardinal(Double((normalized + 180) % 360), lang: params.lang)
        }

        let iconicClimbComparison = ghostElevationM >= 15 ? formatElevationRealWorldScale(meters: Double(ghostElevationM), lang: params.lang) : nil

        return HumanWindImpactResult(
            effectiveHeadwindKmH: effectiveHeadwindKmH,
            equivalentGradePct: equivalentGradePct,
            ghostElevationM: ghostElevationM,
            sameEffortSpeedKmH: sameEffortSpeedKmH,
            speedDeltaKmH: speedDeltaKmH,
            calmTimeMin: calmTimeMin,
            sameEffortTimeMin: sameEffortTimeMin,
            timeDeltaMin: timeDeltaMin,
            totalRideKcal: totalRideKcal,
            calmRideKcal: calmRideKcal,
            extraWindKcal: extraWindKcal,
            extraCroissants: extraCroissants,
            extraBananas: extraBananas,
            windyWatts: windyWatts,
            calmWatts: calmWatts,
            deltaWatts: deltaWatts,
            airResistanceWatts: airResistanceWatts,
            airResistanceSharePct: airResistanceSharePct,
            outboundIntoWindDeg: outboundIntoWindDeg,
            outboundIntoWindCardinal: outboundIntoWindCardinal,
            returnTailwindCardinal: returnTailwindCardinal,
            iconicClimbComparison: iconicClimbComparison
        )
    }

    public static func calculateTripWindInsight(
        distanceKm: Double,
        targetSpeedKmH: Double,
        riderWeightKg: Double? = nil,
        bikeWeightKg: Double? = nil,
        cda: Double? = nil,
        crr: Double? = nil,
        windSpeedKmH: Double,
        effectiveHeadwindKmH: Double? = nil,
        isHeadwindActive: Bool? = nil,
        windDirection: String? = nil,
        windFromDegrees: Double? = nil,
        temperatureC: Double? = nil,
        ftpWatts: Double? = nil,
        lang: CadenceLang = .en
    ) -> HumanWindImpactResult {
        let safeWind = max(0.0, windSpeedKmH)
        var relativeDeg = 90.0
        if safeWind < 1.5 || windDirection == "calm" {
            relativeDeg = 90.0
        } else if let effHead = effectiveHeadwindKmH, effHead.isFinite {
            let ratio = max(-1.0, min(1.0, effHead / safeWind))
            relativeDeg = Double(JSCompat.jsRoundInt(JSCompat.toDeg(acos(ratio))))
        } else if windDirection == "tailwind" {
            relativeDeg = 180.0
        } else if windDirection == "headwind" || isHeadwindActive == true {
            relativeDeg = 0.0
        }

        return calculateHumanWindImpact(HumanWindImpactParams(
            distanceKm: max(1.0, distanceKm > 0 ? distanceKm : 25.0),
            targetSpeedKmH: max(12.0, targetSpeedKmH > 0 ? targetSpeedKmH : 24.0),
            riderWeightKg: riderWeightKg ?? 74.0,
            bikeWeightKg: bikeWeightKg ?? 10.0,
            cda: cda ?? 0.36,
            crr: crr ?? 0.0055,
            windSpeedKmH: safeWind,
            windRelativeAngleDeg: relativeDeg,
            windFromDegrees: windFromDegrees,
            temperatureC: temperatureC ?? 15.0,
            ftpWatts: ftpWatts ?? 220.0,
            lang: lang
        ))
    }
}
